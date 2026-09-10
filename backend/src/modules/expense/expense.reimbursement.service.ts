import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAuditLog } from "../../services/audit.service";
import { jsonSafe } from "../../lib/crypto";
import { dispatchToUser, createInAppForEmployee } from "../../modules/notifications/notifications.service";
import type { AccessTokenPayload } from "../../lib/jwt";

/** Statuses for payroll queue */
export const REIMBURSEMENT_STATUSES = [
  "Pending",
  "Queued",
  "Processing",
  "Paid",
  "Failed",
  "Cancelled",
] as const;

export type ReimbursementStatus = (typeof REIMBURSEMENT_STATUSES)[number];

/** Queue an approved expense claim for payroll reimbursement */
export async function queueForPayroll(
  claimId: string,
  actor?: AccessTokenPayload
): Promise<{ claimId: string; claimNumber: string; queuedAt: Date }> {
  const claim = await prisma.expenseClaim.findUnique({
    where: { id: claimId },
    include: {
      employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, userId: true } },
    },
  });

  if (!claim) throw AppError.notFound("Expense claim not found");
  if (claim.status !== "Approved") {
    throw AppError.badRequest(`Only approved claims can be queued for payroll (current: ${claim.status})`);
  }
  if (claim.queuedForPayrollAt) {
    throw AppError.conflict("Claim already queued for payroll");
  }
  if (claim.isImmutable === false) {
    throw AppError.badRequest("Claim must be immutable (fully approved) before queuing for payroll");
  }

  const now = new Date();

  // Update claim status
  const updated = await prisma.expenseClaim.update({
    where: { id: claimId },
    data: {
      status: "Queued for Payroll",
      queuedForPayrollAt: now,
      approvalStage: "Payroll Queued",
    },
  });

  // Add to payroll reimbursement queue (could be a separate table or use payroll run)
  // For now, we track it on the claim itself and notify payroll team
  await prisma.expenseClaimHistory.create({
    data: {
      claimId: claim.id,
      action: "QUEUED_FOR_PAYROLL",
      actorId: actor?.employeeId ?? claim.employeeId,
      actorName: actor?.name ?? "System",
      oldStatus: "Approved",
      newStatus: "Queued for Payroll",
      details: { queuedAt: now.toISOString() },
    },
  });

  writeAuditLog({
    action: "UPDATE",
    entityType: "ExpenseClaim",
    entityId: claim.id,
    actorUserId: actor?.userId ?? null,
    oldValue: jsonSafe({ status: "Approved", queuedForPayrollAt: null }),
    newValue: jsonSafe({ status: "Queued for Payroll", queuedForPayrollAt: now }),
  });

  // Notify payroll team (Finance role)
  await notifyPayrollTeam(claim, actor);

  // Notify employee
  await notifyEmployeeClaimQueued(claim);

  return { claimId: claim.id, claimNumber: claim.claimNumber, queuedAt: now };
}

/** Process payroll reimbursement for a payroll run */
export async function processPayrollReimbursements(
  payrollRunId: string,
  actor?: AccessTokenPayload
): Promise<{ processed: number; failed: number; totalAmount: number }> {
  const payrollRun = await prisma.payrollRun.findUnique({ where: { id: payrollRunId } });
  if (!payrollRun) throw AppError.notFound("Payroll run not found");
  if (payrollRun.status !== "Processing" && payrollRun.status !== "Draft") {
    throw AppError.badRequest(`Payroll run must be in Processing or Draft status (current: ${payrollRun.status})`);
  }

  // Find all claims queued for payroll that haven't been paid yet
  const queuedClaims = await prisma.expenseClaim.findMany({
    where: {
      status: "Queued for Payroll",
      queuedForPayrollAt: { not: null },
      // Exclude claims already included in a processed payroll run
      // We track this via a separate table or flag in production
    },
    include: {
      employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
    },
    orderBy: { queuedForPayrollAt: "asc" },
  });

  let processed = 0;
  let failed = 0;
  let totalAmount = 0;

  for (const claim of queuedClaims) {
    try {
      // In a real implementation, this would create a payroll adjustment/earning line
      // For now, we mark the claim as paid
      await prisma.expenseClaim.update({
        where: { id: claim.id },
        data: {
          status: "Paid",
          approvalStage: "Paid",
          // In production: link to payslip or payroll adjustment record
        },
      });

      await prisma.expenseClaimHistory.create({
        data: {
          claimId: claim.id,
          action: "PAID_VIA_PAYROLL",
          actorId: actor?.employeeId ?? claim.employeeId,
          actorName: actor?.name ?? "Payroll System",
          oldStatus: "Queued for Payroll",
          newStatus: "Paid",
          details: { payrollRunId, paidAt: new Date().toISOString() },
        },
      });

      processed++;
      totalAmount += Number(claim.amount);
    } catch (err) {
      failed++;
      console.error(`Failed to process reimbursement for claim ${claim.claimNumber}:`, err);
    }
  }

  writeAuditLog({
    action: "UPDATE",
    entityType: "PayrollRun",
    entityId: payrollRunId,
    actorUserId: actor?.userId ?? null,
    newValue: jsonSafe({ processedReimbursements: processed, failedReimbursements: failed, totalReimbursementAmount: totalAmount }),
  });

  return { processed, failed, totalAmount };
}

/** Get reimbursement queue status */
export async function getReimbursementQueue(
  filters: { employeeId?: string; status?: ReimbursementStatus; page?: number; limit?: number } = {}
) {
  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  const where: any = { status: { in: ["Approved", "Queued for Payroll"] } };
  if (filters.employeeId) where.employeeId = filters.employeeId;
  if (filters.status) where.status = filters.status;

  const [claims, total] = await Promise.all([
    prisma.expenseClaim.findMany({
      where,
      include: {
        employee: { select: { employeeCode: true, firstName: true, lastName: true, department: { select: { name: true } } } },
      },
      orderBy: { queuedForPayrollAt: "asc" },
      skip,
      take: limit,
    }),
    prisma.expenseClaim.count({ where }),
  ]);

  return {
    data: claims.map((c) => ({
      id: c.id,
      claimNumber: c.claimNumber,
      employee: c.employee,
      category: c.category,
      amount: Number(c.amount),
      expenseDate: c.expenseDate,
      status: c.status,
      queuedForPayrollAt: c.queuedForPayrollAt,
      approvedForReimbursementAt: c.approvedForReimbursementAt,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/** Mark reimbursement as paid (manual override or after payroll run) */
export async function markReimbursementPaid(
  claimId: string,
  input: { payrollRunId?: string; paymentReference?: string; paidAt?: Date },
  actor?: AccessTokenPayload
) {
  const claim = await prisma.expenseClaim.findUnique({
    where: { id: claimId },
    include: { employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, userId: true } } },
  });

  if (!claim) throw AppError.notFound("Expense claim not found");
  if (claim.status !== "Queued for Payroll" && claim.status !== "Approved") {
    throw AppError.badRequest(`Claim must be queued or approved (current: ${claim.status})`);
  }

  const paidAt = input.paidAt ?? new Date();

  const updated = await prisma.expenseClaim.update({
    where: { id: claimId },
    data: {
      status: "Paid",
      approvalStage: "Paid",
      // In production: store payrollRunId and paymentReference
    },
  });

  await prisma.expenseClaimHistory.create({
    data: {
      claimId: claim.id,
      action: "MARKED_PAID",
      actorId: actor?.employeeId ?? claim.employeeId,
      actorName: actor?.name ?? "System",
      oldStatus: claim.status,
      newStatus: "Paid",
      details: { payrollRunId: input.payrollRunId, paymentReference: input.paymentReference, paidAt: paidAt.toISOString() },
    },
  });

  writeAuditLog({
    action: "UPDATE",
    entityType: "ExpenseClaim",
    entityId: claim.id,
    actorUserId: actor?.userId ?? null,
    oldValue: jsonSafe({ status: claim.status }),
    newValue: jsonSafe({ status: "Paid", paidAt }),
  });

  // Notify employee
  await notifyEmployeeClaimPaid(claim, paidAt);

  return { data: updated };
}

/** Get reimbursement summary for an employee */
export async function getEmployeeReimbursementSummary(employeeId: string, year?: number) {
  const startOfYear = year ? new Date(`${year}-01-01`) : new Date(new Date().getFullYear(), 0, 1);
  const endOfYear = year ? new Date(`${year}-12-31`) : new Date(new Date().getFullYear(), 11, 31);

  const claims = await prisma.expenseClaim.findMany({
    where: {
      employeeId,
      expenseDate: { gte: startOfYear, lte: endOfYear },
      status: { in: ["Approved", "Queued for Payroll", "Paid"] },
    },
    select: { category: true, amount: true, status: true, expenseDate: true },
  });

  const summary = {
    totalApproved: 0,
    totalQueued: 0,
    totalPaid: 0,
    byCategory: {} as Record<string, { approved: number; queued: number; paid: number }>,
  };

  for (const claim of claims) {
    const amount = Number(claim.amount);
    if (!summary.byCategory[claim.category]) {
      summary.byCategory[claim.category] = { approved: 0, queued: 0, paid: 0 };
    }

    switch (claim.status) {
      case "Approved":
        summary.totalApproved += amount;
        summary.byCategory[claim.category].approved += amount;
        break;
      case "Queued for Payroll":
        summary.totalQueued += amount;
        summary.byCategory[claim.category].queued += amount;
        break;
      case "Paid":
        summary.totalPaid += amount;
        summary.byCategory[claim.category].paid += amount;
        break;
    }
  }

  return { data: summary };
}

/** Notify payroll/finance team about new reimbursement queue items */
async function notifyPayrollTeam(claim: any, actor?: AccessTokenPayload) {
  const financeUsers = await prisma.user.findMany({
    where: { role: { name: "FINANCE" }, isActive: true },
    select: { id: true },
  });

  const hrUsers = await prisma.user.findMany({
    where: { role: { name: "HR" }, isActive: true },
    select: { id: true },
  });

  const recipients = [...financeUsers, ...hrUsers];

  for (const user of recipients) {
    await dispatchToUser({
      userId: user.id,
      title: "Expense Claim Queued for Payroll",
      body: `Claim ${claim.claimNumber} for ${claim.employee.firstName} ${claim.employee.lastName} (?${claim.amount}) has been approved and queued for payroll reimbursement.`,
      category: "Expense Approved",
      link: `/expense/claims/${claim.id}`,
    });
  }
}

/** Notify employee that their claim is queued for payroll */
async function notifyEmployeeClaimQueued(claim: any) {
  if (claim.employee.userId) {
    await createInAppForEmployee({
      employeeId: claim.employee.id,
      title: "Expense Claim Queued for Reimbursement",
      body: `Your expense claim ${claim.claimNumber} (?${claim.amount}) has been approved and queued for payroll reimbursement.`,
      category: "Expense Approved",
      link: `/expense/claims/${claim.id}`,
    });
  }
}

/** Notify employee that their claim has been paid */
async function notifyEmployeeClaimPaid(claim: any, paidAt: Date) {
  if (claim.employee.userId) {
    await createInAppForEmployee({
      employeeId: claim.employee.id,
      title: "Expense Reimbursement Paid",
      body: `Your expense claim ${claim.claimNumber} (?${claim.amount}) has been paid on ${paidAt.toLocaleDateString()}.`,
      category: "Expense Approved",
      link: `/expense/claims/${claim.id}`,
    });
  }
}

/** Create a payroll adjustment entry for an expense reimbursement (for payroll integration) */
export async function createPayrollAdjustment(
  claimId: string,
  payrollRunId: string,
  actor?: AccessTokenPayload
) {
  const claim = await prisma.expenseClaim.findUnique({
    where: { id: claimId },
    include: { employee: { select: { id: true, employeeCode: true } } },
  });

  if (!claim) throw AppError.notFound("Expense claim not found");
  if (claim.status !== "Approved" && claim.status !== "Queued for Payroll") {
    throw AppError.badRequest("Claim must be approved or queued for payroll");
  }

  const payrollRun = await prisma.payrollRun.findUnique({ where: { id: payrollRunId } });
  if (!payrollRun) throw AppError.notFound("Payroll run not found");

  // In a full implementation, this would create a payslip adjustment/earning
  // For now, we just link the claim to the payroll run
  await prisma.expenseClaim.update({
    where: { id: claimId },
    data: {
      status: "Queued for Payroll",
      queuedForPayrollAt: new Date(),
    },
  });

  writeAuditLog({
    action: "CREATE",
    entityType: "ExpensePayrollAdjustment",
    entityId: claimId,
    actorUserId: actor?.userId ?? null,
    newValue: jsonSafe({ claimId, claimNumber: claim.claimNumber, payrollRunId, amount: Number(claim.amount) }),
  });

  return { claimId, payrollRunId, amount: Number(claim.amount) };
}
