import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAuditLog } from "../../services/audit.service";
import { jsonSafe } from "../../lib/crypto";
import type { AccessTokenPayload } from "../../lib/jwt";
import type { ExpenseCategory } from "./expense.validation";

/** Get policy for a specific category */
export async function getPolicyByCategory(category: ExpenseCategory) {
  const policy = await prisma.expensePolicy.findUnique({
    where: { category },
  });
  return policy;
}

/** Get all policies */
export async function listPolicies() {
  const policies = await prisma.expensePolicy.findMany({
    orderBy: { category: "asc" },
  });
  return { data: policies };
}

/** Create or update expense policy */
export async function upsertPolicy(
  input: {
    category: ExpenseCategory;
    limitAmount: number;
    receiptThreshold: number;
    submissionWindowDays: number;
    isActive: boolean;
  },
  actor?: AccessTokenPayload
) {
  const existing = await prisma.expensePolicy.findUnique({ where: { category: input.category } });

const policy = await prisma.expensePolicy.upsert({
    where: { category: input.category },
    create: {
      category: input.category,
      limitAmount: input.limitAmount,
      receiptThreshold: input.receiptThreshold,
      submissionWindowDays: input.submissionWindowDays,
      isActive: input.isActive,
    },
    update: {
      limitAmount: input.limitAmount,
      receiptThreshold: input.receiptThreshold,
      submissionWindowDays: input.submissionWindowDays,
      isActive: input.isActive,
    },
  });

  writeAuditLog({
    action: existing ? "UPDATE" : "CREATE",
    entityType: "ExpensePolicy",
    entityId: policy.id,
    actorUserId: actor?.userId ?? null,
    oldValue: existing ? jsonSafe(existing) : null,
    newValue: jsonSafe(policy),
  });

  return { data: policy };
}

/** Delete/deactivate expense policy */
export async function deletePolicy(category: ExpenseCategory, actor?: AccessTokenPayload) {
  const existing = await prisma.expensePolicy.findUnique({ where: { category } });
  if (!existing) throw AppError.notFound("Expense policy not found");

const policy = await prisma.expensePolicy.update({
    where: { category },
    data: { isActive: false },
  });

  writeAuditLog({
    action: "UPDATE",
    entityType: "ExpensePolicy",
    entityId: policy.id,
    actorUserId: actor?.userId ?? null,
    oldValue: jsonSafe(existing),
    newValue: jsonSafe(policy),
  });

  return { data: policy };
}

/** Policy validation result */
export interface PolicyValidationResult {
  isValid: boolean;
  violations: PolicyViolation[];
  warnings: PolicyWarning[];
}

export interface PolicyViolation {
  code: string;
  message: string;
  severity: "error" | "warning";
  category: string;
  limit?: number;
  actual?: number;
}

export interface PolicyWarning {
  code: string;
  message: string;
  category: string;
}

/** Validate a claim against expense policies */
export async function validateClaimAgainstPolicy(
  input: {
    employeeId: string;
    category: ExpenseCategory;
    amount: number;
    expenseDate: Date;
    receiptFileId?: string; // If receipt already uploaded
  },
  actor?: AccessTokenPayload
): Promise<PolicyValidationResult> {
  const policy = await getPolicyByCategory(input.category);

  const violations: PolicyViolation[] = [];
  const warnings: PolicyWarning[] = [];

  if (!policy || !policy.isActive) {
    warnings.push({
      code: "POLICY_NOT_FOUND",
      message: `No active policy found for category "${input.category}". Claim will be reviewed manually.`,
      category: input.category,
    });
    return { isValid: true, violations: [], warnings };
  }

  // 1. Category limit check
  if (input.amount > Number(policy.limitAmount)) {
    violations.push({
      code: "CATEGORY_LIMIT_EXCEEDED",
      message: `Claim amount ?${input.amount} exceeds category limit of ?${policy.limitAmount}`,
      severity: "error",
      category: input.category,
      limit: Number(policy.limitAmount),
      actual: input.amount,
    });
  }

  // 2. Receipt threshold check
  const requiresReceipt = input.amount > Number(policy.receiptThreshold);
  if (requiresReceipt && !input.receiptFileId) {
    violations.push({
      code: "RECEIPT_REQUIRED",
      message: `Receipt required for claims above ?${policy.receiptThreshold} (amount: ?${input.amount})`,
      severity: "error",
      category: input.category,
      limit: Number(policy.receiptThreshold),
      actual: input.amount,
    });
  }

  // 3. Submission window check (60 days default)
  const daysSinceExpense = Math.floor(
    (Date.now() - input.expenseDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceExpense > policy.submissionWindowDays) {
    violations.push({
      code: "SUBMISSION_WINDOW_EXPIRED",
      message: `Claim submitted ${daysSinceExpense} days after expense date. Policy allows ${policy.submissionWindowDays} days.`,
      severity: "error",
      category: input.category,
      limit: policy.submissionWindowDays,
      actual: daysSinceExpense,
    });
  }

  // 4. Employee-specific checks (e.g., monthly caps) - could be extended
  // For now, we just check if employee exists and is active
  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
    select: { id: true, status: true, employeeCode: true },
  });
  if (!employee) {
    violations.push({
      code: "EMPLOYEE_NOT_FOUND",
      message: "Employee not found",
      severity: "error",
      category: input.category,
    });
  } else if (employee.status !== "Active") {
    warnings.push({
      code: "EMPLOYEE_INACTIVE",
      message: `Employee ${employee.employeeCode} is not active (${employee.status})`,
      category: input.category,
    });
  }

  return {
    isValid: violations.filter((v) => v.severity === "error").length === 0,
    violations,
    warnings,
  };
}

/** Get effective policy limits for UI display */
export async function getPolicyLimits(): Promise<Record<ExpenseCategory, { limitAmount: number; receiptThreshold: number; submissionWindowDays: number; isActive: boolean }>> {
  const policies = await prisma.expensePolicy.findMany();
  const result: Record<string, { limitAmount: number; receiptThreshold: number; submissionWindowDays: number; isActive: boolean }> = {};

  for (const p of policies) {
    result[p.category] = {
      limitAmount: Number(p.limitAmount),
      receiptThreshold: Number(p.receiptThreshold),
      submissionWindowDays: p.submissionWindowDays,
      isActive: p.isActive,
    };
  }

  return result as Record<ExpenseCategory, { limitAmount: number; receiptThreshold: number; submissionWindowDays: number; isActive: boolean }>;
}
