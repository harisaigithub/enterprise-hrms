import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAuditLog } from "../../services/audit.service";
import { jsonSafe } from "../../lib/crypto";
import { submitRequest, actOnStep, getInstance } from "../../modules/workflow/workflow.service";
import { dispatchToUser, createInAppForEmployee } from "../../modules/notifications/notifications.service";
import { validateClaimAgainstPolicy, getPolicyByCategory } from "./expense.policy.service";
import { checkDuplicates } from "./expense.duplicate.service";
import { completeReceiptUpload, deleteReceipt } from "./expense.receipt.service";
import { queueForPayroll } from "./expense.reimbursement.service";
import type { AccessTokenPayload } from "../../lib/jwt";
import type { ExpenseCategory, ExpenseClaimStatus, CorrectionType } from "./expense.validation";

const CLAIM_INCLUDE = {
  employee: { select: { employeeCode: true, firstName: true, lastName: true, department: { select: { name: true } }, userId: true, reportingManagerId: true } },
  receipts: { orderBy: { uploadedAt: "desc" } },
  history: { orderBy: { createdAt: "desc" }, take: 10 },
  workflowInstance: { select: { id: true, status: true, currentStepIndex: true, steps: { select: { name: true, status: true, approverId: true, approverName: true, actedBy: true, actedAt: true, rejectionReason: true } } } },
  correctingEntry: { select: { id: true, entryNumber: true, status: true, correctionType: true, adjustedAmount: true } },
  originalClaim: { select: { id: true, claimNumber: true } },
} satisfies Prisma.ExpenseClaimInclude;

/** Generate unique claim number: EXP-YYYY-XXXXX */
async function generateClaimNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.expenseClaim.count({
    where: { claimNumber: { startsWith: `EXP-${year}-` } },
  });
  return `EXP-${year}-${String(count + 1).padStart(5, "0")}`;
}

/** Create a new draft expense claim */
export async function createDraftClaim(
  input: {
    category: ExpenseCategory;
    amount: number;
    expenseDate: Date;
    businessPurpose: string;
    receiptFileId?: string;
  },
  actor: AccessTokenPayload
) {
  if (!actor.employeeId) {
    throw AppError.forbidden("Employee account not linked");
  }

  const expenseDate =
    input.expenseDate instanceof Date
      ? input.expenseDate
      : new Date(`${input.expenseDate}T00:00:00.000Z`);

  if (Number.isNaN(expenseDate.getTime())) {
    throw AppError.badRequest("Invalid expense date");
  }

  // Validate policy
  const policyResult = await validateClaimAgainstPolicy(
    {
      employeeId: actor.employeeId,
      category: input.category,
      amount: input.amount,
      expenseDate,
      receiptFileId: input.receiptFileId,
    },
    actor
  );

  // Check duplicates
  const duplicateResult = await checkDuplicates({
    employeeId: actor.employeeId,
    category: input.category,
    amount: input.amount,
    expenseDate,
  });

  const claimNumber = await generateClaimNumber();

  const claim = await prisma.expenseClaim.create({
    data: {
      claimNumber,
      employeeId: actor.employeeId,
      category: input.category,
      amount: input.amount,
      expenseDate,
      businessPurpose: input.businessPurpose,
      status: "Draft",
      isDraft: true,
      receiptPending: !!input.receiptFileId,
      policyViolations:
        policyResult.warnings as unknown as Prisma.InputJsonValue,
      duplicateWarning: duplicateResult.isDuplicate
        ? (duplicateResult as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull,
    },
    include: CLAIM_INCLUDE,
  });

  // Link receipt if provided
  if (input.receiptFileId) {
    await prisma.expenseReceipt.updateMany({
      where: { id: input.receiptFileId, claimId: { equals: null } as any },
      data: { claimId: claim.id },
    });
  }

  writeAuditLog({
    action: "CREATE",
    entityType: "ExpenseClaim",
    entityId: claim.id,
    actorUserId: actor.userId,
    newValue: jsonSafe({
      claimNumber,
      category: input.category,
      amount: input.amount,
      expenseDate: expenseDate.toISOString(),
      isDraft: true,
      policyViolations: policyResult.warnings,
      duplicateWarning: duplicateResult.isDuplicate ? { type: duplicateResult.matchType, matchedClaim: duplicateResult.matchedClaimNumber } : null,
    }),
  });

  return { data: claim };
}

/** Submit a draft claim for approval (triggers workflow) */
export async function submitClaim(claimId: string, actor: AccessTokenPayload) {
  const claim = await prisma.expenseClaim.findUnique({
    where: { id: claimId },
    include: { employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } } },
  });

  if (!claim) throw AppError.notFound("Expense claim not found");
  if (claim.employeeId !== actor.employeeId) throw AppError.forbidden("Cannot submit another employee's claim");
  if (!claim.isDraft) throw AppError.badRequest("Only draft claims can be submitted");
  if (claim.status !== "Draft") throw AppError.badRequest(`Claim is not in draft status (current: ${claim.status})`);

  // Re-validate policy (errors block submission)
  const policyResult = await validateClaimAgainstPolicy(
    { employeeId: claim.employeeId, category: claim.category as ExpenseCategory, amount: Number(claim.amount), expenseDate: claim.expenseDate },
    actor
  );

  const errors = policyResult.violations.filter((v) => v.severity === "error");
  if (errors.length > 0) {
    throw AppError.badRequest(`Policy validation failed: ${errors.map((e) => e.message).join("; ")}`);
  }

  // Check duplicates again
  const duplicateResult = await checkDuplicates({
    employeeId: claim.employeeId,
    category: claim.category as ExpenseCategory,
    amount: Number(claim.amount),
    expenseDate: claim.expenseDate,
  });

  // Submit to workflow engine (Employee -> Manager -> Finance)
  // Find active workflow definition for Expense Claim
  const workflowDefinition = await prisma.workflowDefinition.findFirst({
    where: {
      requestType: "Expense Claim",
      status: "Active",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!workflowDefinition) {
    throw AppError.badRequest(
      "No active workflow definition configured for Expense Claim."
    );
  }

  // Submit to workflow engine
  const workflowResult = await submitRequest(
    workflowDefinition.id,
    claim.employee.employeeCode,
    {
      amount: Number(claim.amount),
      category: claim.category,
      expenseDate: claim.expenseDate.toISOString(),
      claimId: claim.id,
      claimNumber: claim.claimNumber,
    }
  );

  const workflowInstanceId = workflowResult.data.id;

  // Update claim status and link workflow
  const updated = await prisma.expenseClaim.update({
    where: { id: claimId },
    data: {
      status: "Submitted",
      isDraft: false,
      submittedAt: new Date(),
      approvalStage: "Manager Review",
      workflowInstanceId,
      policyViolations: policyResult.warnings as unknown as Prisma.InputJsonValue,
      duplicateWarning: duplicateResult.isDuplicate ? duplicateResult as unknown as Prisma.InputJsonValue : Prisma.DbNull,
    },
    include: CLAIM_INCLUDE,
  });

  await prisma.expenseClaimHistory.create({
    data: {
      claimId: claim.id,
      action: "SUBMITTED",
      actorId: actor.employeeId || claim.employeeId,
      actorName: `${claim.employee.firstName} ${claim.employee.lastName}`,
      oldStatus: "Draft",
      newStatus: "Submitted",
      details: { workflowInstanceId },
    },
  });

  writeAuditLog({
    action: "UPDATE",
    entityType: "ExpenseClaim",
    entityId: claim.id,
    actorUserId: actor.userId,
    oldValue: jsonSafe({ status: "Draft", isDraft: true }),
    newValue: jsonSafe({ status: "Submitted", isDraft: false, workflowInstanceId }),
  });

  // Notify manager (and finance if auto-escalated)
  await notifyClaimSubmitted(updated, actor);

  return { data: updated };
}

/** Manager/Finance action on claim (approve/reject) */
export async function actOnClaim(
  claimId: string,
  actor: AccessTokenPayload,
  action: "approve" | "reject",
  comments?: string
) {
  const claim = await prisma.expenseClaim.findUnique({
    where: { id: claimId },
    include: { workflowInstance: true, employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, userId: true } } },
  });

  if (!claim) throw AppError.notFound("Expense claim not found");
  if (!claim.workflowInstanceId) throw AppError.badRequest("Claim not in workflow");
  if (claim.isImmutable) throw AppError.badRequest("Cannot modify immutable approved claim");

  const workflowInstance = await getInstance(claim.workflowInstanceId);

  // Determine current step and required role
  const currentStep = workflowInstance.data.steps[workflowInstance.data.currentStepIndex];
  if (!currentStep) throw AppError.badRequest("No pending workflow step");

  // Prevent self-approval
  if (claim.employeeId === actor.employeeId) {
    throw AppError.forbidden("You cannot approve/reject your own expense claim");
  }

  // Check if actor can act on this step
  const actorCode = actor.employeeCode ?? actor.employeeId!;
  const currentStepName = currentStep.name.toLowerCase();
  const isAssignedApprover = currentStep.approverId === actorCode;
  const isFinanceStep =
    currentStepName.includes("finance") ||
    currentStep.approverId === "role-finance" ||
    claim.status === "Finance Pending";
  const isManagerStep =
    currentStepName.includes("manager") ||
    isAssignedApprover ||
    ["Submitted", "Manager Pending"].includes(claim.status);

  // Check if actor is direct manager or dept head
  const claimEmployee = await prisma.employee.findUnique({
    where: { id: claim.employeeId },
    select: { reportingManagerId: true, departmentId: true },
  });
  const isDirectManager = Boolean(actor.employeeId && claimEmployee?.reportingManagerId === actor.employeeId);

  let isDeptHead = false;
  if (actor.employeeId && claimEmployee?.departmentId) {
    const actorEmp = await prisma.employee.findUnique({
      where: { id: actor.employeeId },
      select: { departmentId: true, isDepartmentHead: true },
    });
    if (actorEmp?.isDepartmentHead && actorEmp.departmentId === claimEmployee.departmentId) {
      isDeptHead = true;
    }
  }

  const actorRoles = [actor.role];
  const canAct =
    isAssignedApprover ||
    (isFinanceStep && ["FINANCE", "ADMIN", "HR"].some((r) => actorRoles.includes(r))) ||
    (isManagerStep && (
      isDirectManager ||
      isDeptHead ||
      ["MANAGER", "ADMIN", "HR"].some((r) => actorRoles.includes(r))
    )) ||
    Boolean(actor.permissions?.includes("expenses:approve")) ||
    actorRoles.includes("ADMIN");

  if (!canAct) {
    throw AppError.forbidden(`You are not authorized to ${action} at this stage`);
  }

  // Act on workflow step
  const result = await actOnStep(
    claim.workflowInstanceId,
    actorCode,
    `${actor.firstName} ${actor.lastName}`.trim(),
    action,
    comments,
    { bypassRoleApprover: actor.permissions?.includes("workflows:write") ?? false }
  );

  const workflowStatus = result.data.status;
  const nextStep = result.data.steps.find((step) => step.status === "Pending");
  const nextStepName = nextStep?.name?.toLowerCase() ?? "";
  const nextIsFinanceStep =
    nextStepName.includes("finance") ||
    nextStep?.approverId === "role-finance";
  const nextIsManagerStep =
    nextStepName.includes("manager");

  let newStatus: ExpenseClaimStatus;
  let newStage: string;

  if (action === "reject") {
    newStatus = "Rejected";
    newStage = "Rejected";
  } else if (workflowStatus === "Approved") {
    newStatus = "Approved";
    newStage = "Approved";
  } else if (nextIsFinanceStep && workflowStatus === "In Progress") {
    newStatus = "Finance Pending";
    newStage = "Finance Review";
  } else if (nextIsManagerStep && workflowStatus === "In Progress") {
    newStatus = "Manager Pending";
    newStage = "Manager Review";
  } else {
    newStatus = claim.status as ExpenseClaimStatus;
    newStage = claim.approvalStage ?? "Unknown";
  }

  const updated = await prisma.expenseClaim.update({
    where: { id: claimId },
    data: {
      status: newStatus,
      approvalStage: newStage,
      ...(action === "approve" && newStatus === "Approved" ? { approvedForReimbursementAt: new Date(), isImmutable: true } : {}),
      ...(action === "reject" ? { rejectedAt: new Date(), rejectedBy: actor.employeeId, rejectionReason: comments } : {}),
    },
    include: CLAIM_INCLUDE,
  });

  await prisma.expenseClaimHistory.create({
    data: {
      claimId: claim.id,
      action: action.toUpperCase(),
      actorId: actor.employeeId ?? actor.userId,
      actorName: `${actor.firstName ?? ""} ${actor.lastName ?? ""}`.trim() || (actor.employeeCode ?? "Unknown"),
      oldStatus: claim.status,
      newStatus,
      details: { comments, workflowStep: currentStep.name },
    },
  });

  writeAuditLog({
    action: action === "approve" ? "APPROVE" : "REJECT",
    entityType: "ExpenseClaim",
    entityId: claim.id,
    actorUserId: actor.userId,
    oldValue: jsonSafe({ status: claim.status, approvalStage: claim.approvalStage }),
    newValue: jsonSafe({ status: newStatus, approvalStage: newStage, comments }),
  });

  // Notify employee
  if (action === "approve") {
    if (newStatus === "Approved") {
      await notifyClaimApproved(updated, actor);
      // Auto-queue for payroll if configured
      // await queueForPayroll(claimId, actor);
    } else {
      await notifyClaimStatusUpdate(updated, actor, `Your claim has been ${action}d and moved to ${newStage}`);
    }
  } else {
    await notifyClaimRejected(updated, actor, comments!);
  }

  return { data: updated };
}

/** Create a correcting entry for an approved/immutable claim */
export async function createCorrectingEntry(
  input: {
    originalClaimId: string;
    reason: string;
    correctionType: CorrectionType;
    adjustedAmount?: number;
  },
  actor: AccessTokenPayload
) {
  const originalClaim = await prisma.expenseClaim.findUnique({
    where: { id: input.originalClaimId },
    include: { employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } } },
  });

  if (!originalClaim) throw AppError.notFound("Original claim not found");
  if (!originalClaim.isImmutable) throw AppError.badRequest("Correcting entries can only be created for approved/immutable claims");
  if (input.correctionType === "Amount Adjustment" && input.adjustedAmount === undefined) {
    throw AppError.badRequest("Adjusted amount required for Amount Adjustment correction type");
  }

  const entryNumber = `CEX-${new Date().getFullYear()}-${String(await prisma.expenseCorrectingEntry.count() + 1).padStart(5, "0")}`;

  const entry = await prisma.expenseCorrectingEntry.create({
    data: {
      entryNumber,
      originalClaimId: input.originalClaimId,
      reason: input.reason,
      correctionType: input.correctionType,
      adjustedAmount: input.adjustedAmount,
      status: "Pending",
      createdBy: actor.employeeId!,
    },
    include: {
      originalClaim: { select: { claimNumber: true, amount: true, category: true } },
      creator: { select: { employeeCode: true, firstName: true, lastName: true } },
    },
  });

  // Update original claim to link correcting entry
  await prisma.expenseClaim.update({
    where: { id: input.originalClaimId },
    data: { correctingEntryId: entry.id },
  });

  writeAuditLog({
    action: "CREATE",
    entityType: "ExpenseCorrectingEntry",
    entityId: entry.id,
    actorUserId: actor.userId,
    newValue: jsonSafe({
      entryNumber,
      originalClaimId: input.originalClaimId,
      correctionType: input.correctionType,
      adjustedAmount: input.adjustedAmount,
    }),
  });

  // Notify finance/approvers
  await notifyCorrectingEntryCreated(entry, actor);

  return { data: entry };
}

/** Approve a correcting entry */
export async function approveCorrectingEntry(entryId: string, actor: AccessTokenPayload, comments?: string) {
  const entry = await prisma.expenseCorrectingEntry.findUnique({
    where: { id: entryId },
    include: { originalClaim: true },
  });

  if (!entry) throw AppError.notFound("Correcting entry not found");
  if (entry.status !== "Pending") throw AppError.badRequest(`Entry is not pending (current: ${entry.status})`);
  if (entry.createdBy === actor.employeeId) throw AppError.forbidden("Cannot approve your own correcting entry");

  const updated = await prisma.expenseCorrectingEntry.update({
    where: { id: entryId },
    data: { status: "Approved", approvedBy: actor.employeeId, approvedAt: new Date() },
    include: { originalClaim: { include: { employee: { select: { id: true, userId: true, firstName: true, lastName: true } } } } },
  });

  writeAuditLog({
    action: "APPROVE",
    entityType: "ExpenseCorrectingEntry",
    entityId: entry.id,
    actorUserId: actor.userId,
    oldValue: jsonSafe({ status: "Pending" }),
    newValue: jsonSafe({ status: "Approved", comments }),
  });

  // If amount adjustment, create new corrected claim (immutable original stays)
  if (entry.correctionType === "Amount Adjustment" && entry.adjustedAmount !== null) {
    await createCorrectedClaim(entry, actor);
  }

  // Notify employee
  await notifyCorrectingEntryApproved(updated, actor);

  return { data: updated };
}

/** Reject a correcting entry */
export async function rejectCorrectingEntry(entryId: string, actor: AccessTokenPayload, rejectionReason: string) {
  const entry = await prisma.expenseCorrectingEntry.findUnique({
    where: { id: entryId },
    include: { originalClaim: { include: { employee: { select: { id: true, userId: true, firstName: true, lastName: true } } } } },
  });

  if (!entry) throw AppError.notFound("Correcting entry not found");
  if (entry.status !== "Pending") throw AppError.badRequest(`Entry is not pending (current: ${entry.status})`);

  const updated = await prisma.expenseCorrectingEntry.update({
    where: { id: entryId },
    data: { status: "Rejected", approvedBy: actor.employeeId, approvedAt: new Date() },
  });

  writeAuditLog({
    action: "REJECT",
    entityType: "ExpenseCorrectingEntry",
    entityId: entry.id,
    actorUserId: actor.userId,
    oldValue: jsonSafe({ status: "Pending" }),
    newValue: jsonSafe({ status: "Rejected", rejectionReason }),
  });

  await notifyCorrectingEntryRejected(updated, actor, rejectionReason);

  return { data: updated };
}

/** Create a new corrected claim (retains original immutable claim) */
async function createCorrectedClaim(entry: any, actor: AccessTokenPayload) {
  const original = entry.originalClaim;

  const newClaimNumber = await generateClaimNumber();
  const correctedAmount = entry.adjustedAmount ?? Number(original.amount);

  const correctedClaim = await prisma.expenseClaim.create({
    data: {
      claimNumber: newClaimNumber,
      employeeId: original.employeeId,
      category: original.category,
      amount: correctedAmount,
      expenseDate: original.expenseDate,
      businessPurpose: `[CORRECTION] ${original.businessPurpose}`,
      status: "Approved",
      isDraft: false,
      isImmutable: true,
      approvedForReimbursementAt: new Date(),
      originalClaimId: original.id,
      correctingEntryId: entry.id,
      policyViolations: Prisma.JsonNull,
      duplicateWarning: Prisma.JsonNull,
    },
  });

  // Mark correcting entry as applied
  await prisma.expenseCorrectingEntry.update({
    where: { id: entry.id },
    data: { status: "Applied", appliedAt: new Date() },
  });

  writeAuditLog({
    action: "CREATE",
    entityType: "ExpenseClaim",
    entityId: correctedClaim.id,
    actorUserId: actor.userId,
    newValue: jsonSafe({
      claimNumber: newClaimNumber,
      originalClaimNumber: original.claimNumber,
      correctedAmount,
      correctingEntryId: entry.id,
    }),
  });

  return correctedClaim;
}

/** List claims with filters */
export async function listClaims(
  filters: {
    employeeId?: string;
    category?: ExpenseCategory;
    status?: ExpenseClaimStatus;
    startDate?: Date;
    endDate?: Date;
    minAmount?: number;
    maxAmount?: number;
    page: number;
    limit: number;
  },
  actor: AccessTokenPayload
) {
  const where: Prisma.ExpenseClaimWhereInput = {};

  // Role-based filtering
  if (actor.role === "EMPLOYEE") {
    if (!actor.employeeId) throw AppError.forbidden("Employee account not linked");
    where.employeeId = actor.employeeId;
  } else if (actor.role === "MANAGER") {
    if (!actor.employeeId) throw AppError.forbidden("Manager account not linked");
    where.OR = [{ employeeId: actor.employeeId }, { employee: { reportingManagerId: actor.employeeId } }];
  } else if (filters.employeeId) {
    where.employeeId = filters.employeeId;
  }

  if (filters.category) where.category = filters.category;
  if (filters.status) where.status = filters.status;
  if (filters.startDate || filters.endDate) {
    where.expenseDate = {};
    if (filters.startDate) where.expenseDate.gte = filters.startDate;
    if (filters.endDate) where.expenseDate.lte = filters.endDate;
  }
  if (filters.minAmount || filters.maxAmount) {
    where.amount = {};
    if (filters.minAmount) where.amount.gte = filters.minAmount;
    if (filters.maxAmount) where.amount.lte = filters.maxAmount;
  }

  const [claims, total] = await Promise.all([
    prisma.expenseClaim.findMany({
      where,
      include: CLAIM_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    prisma.expenseClaim.count({ where }),
  ]);

  return { data: claims, total, page: filters.page, limit: filters.limit, totalPages: Math.ceil(total / filters.limit) };
}

/** Get pending expense claims for approval */
export async function getPendingApprovals(
  stage: "Manager" | "Finance" | undefined,
  actor: AccessTokenPayload
) {
  const where: Prisma.ExpenseClaimWhereInput = {
    status: {
      in: ["Submitted", "Manager Pending", "Finance Pending"],
    },
  };

  if (stage === "Manager") {
    where.status = {
      in: ["Submitted", "Manager Pending"],
    };
  } else if (stage === "Finance") {
    where.status = {
      in: ["Finance Pending"],
    };
  }

  // Exclude self-submitted claims from approvals list
  if (actor.employeeId) {
    where.employeeId = { not: actor.employeeId };
  }

  // If actor is global approver (ADMIN, HR, or FINANCE in Finance stage), show all pending claims
  const isGlobalApprover =
    actor.role === "ADMIN" ||
    actor.role === "HR" ||
    (stage === "Finance" && actor.role === "FINANCE") ||
    Boolean(actor.permissions?.includes("workflows:manage"));

  if (!isGlobalApprover && actor.employeeId) {
    const actorEmployee = await prisma.employee.findUnique({
      where: { id: actor.employeeId },
      select: { employeeCode: true, departmentId: true, isDepartmentHead: true },
    });

    const actorCode = actorEmployee?.employeeCode || actor.employeeCode || actor.employeeId;
    const isDeptHead = actorEmployee?.isDepartmentHead ?? false;
    const actorDeptId = actorEmployee?.departmentId ?? null;

    const employeeConditions: Prisma.EmployeeWhereInput[] = [
      { reportingManagerId: actor.employeeId },
    ];

    if (isDeptHead && actorDeptId) {
      employeeConditions.push({ departmentId: actorDeptId });
    }

    where.OR = [
      { employee: { OR: employeeConditions } },
      {
        workflowInstance: {
          steps: {
            some: {
              status: "Pending",
              approverId: actorCode,
            },
          },
        },
      },
    ];
  }

  const claims = await prisma.expenseClaim.findMany({
    where,
    include: CLAIM_INCLUDE,
    orderBy: {
      createdAt: "desc",
    },
  });

  return { data: claims };
}

/** Get single claim by ID */
export async function getClaim(claimId: string, actor: AccessTokenPayload) {
  const claim = await prisma.expenseClaim.findUnique({
    where: { id: claimId },
    include: CLAIM_INCLUDE,
  });

  if (!claim) throw AppError.notFound("Expense claim not found");

  // Authorization
  const isOwner = claim.employeeId === actor.employeeId;
  const isApprover = ["MANAGER", "FINANCE", "ADMIN", "HR"].includes(actor.role);
  const isManagerOfEmployee = claim.employee.reportingManagerId === actor.employeeId;

  if (!isOwner && !isApprover && !isManagerOfEmployee) {
    throw AppError.forbidden("Not authorized to view this claim");
  }

  return { data: claim };
}

/** Delete a draft claim */
export async function deleteDraftClaim(claimId: string, actor: AccessTokenPayload) {
  const claim = await prisma.expenseClaim.findUnique({ where: { id: claimId }, include: { receipts: true } });
  if (!claim) throw AppError.notFound("Claim not found");
  if (claim.employeeId !== actor.employeeId) throw AppError.forbidden("Cannot delete another employee's claim");
  if (!claim.isDraft) throw AppError.badRequest("Only draft claims can be deleted");

  // Delete receipts from MinIO
  for (const receipt of claim.receipts ?? []) {
    try {
      const minioClient = (await import("../../config/minio")).default;
      const { MINIO_BUCKET } = await import("../../config/minio");
      await minioClient.removeObject(MINIO_BUCKET, receipt.minioObjectName);
    } catch {
      // Ignore MinIO errors
    }
  }

  await prisma.expenseClaim.delete({ where: { id: claimId } });

  writeAuditLog({
    action: "DELETE",
    entityType: "ExpenseClaim",
    entityId: claimId,
    actorUserId: actor.userId,
    oldValue: jsonSafe({ claimNumber: claim.claimNumber, amount: Number(claim.amount) }),
  });

  return { data: { deleted: true } };
}

/** Cancel a submitted claim (if not yet approved) */
export async function cancelClaim(claimId: string, actor: AccessTokenPayload) {
  const claim = await prisma.expenseClaim.findUnique({ where: { id: claimId } });
  if (!claim) throw AppError.notFound("Claim not found");
  if (claim.employeeId !== actor.employeeId) throw AppError.forbidden("Cannot cancel another employee's claim");
  if (claim.isImmutable) throw AppError.badRequest("Cannot cancel immutable approved claim");
  if (["Approved", "Paid", "Queued for Payroll"].includes(claim.status)) {
    throw AppError.badRequest("Cannot cancel approved or paid claim");
  }

  const updated = await prisma.expenseClaim.update({
    where: { id: claimId },
    data: { status: "Cancelled", isDraft: false },
  });

  writeAuditLog({
    action: "CANCEL",
    entityType: "ExpenseClaim",
    entityId: claimId,
    actorUserId: actor.userId,
    oldValue: jsonSafe({ status: claim.status }),
    newValue: jsonSafe({ status: "Cancelled" }),
  });

  return { data: updated };
}

/** Notification helpers */
async function notifyClaimSubmitted(claim: any, actor: AccessTokenPayload) {
  // Notify manager
  const manager = await prisma.employee.findUnique({
    where: { id: claim.employeeId },
    select: { reportingManager: { select: { userId: true } } },
  });
  if (manager?.reportingManager?.userId) {
    await dispatchToUser({
      userId: manager.reportingManager.userId,
      title: "Expense Claim Submitted for Approval",
      body: `${claim.employee.firstName} ${claim.employee.lastName} submitted claim ${claim.claimNumber} for ?${claim.amount} (${claim.category}).`,
      category: "Expense Approved",
      link: `/expense/claims/${claim.id}`,
    });
  }
  // Notify employee
  if (claim.employee.userId) {
    await dispatchToUser({
      userId: claim.employee.userId,
      title: "Expense Claim Submitted",
      body: `Your claim ${claim.claimNumber} for ?${claim.amount} has been submitted for approval.`,
      category: "Expense Approved",
      link: `/expense/claims/${claim.id}`,
    });
  }
}

async function notifyClaimApproved(claim: any, actor: AccessTokenPayload) {
  if (claim.employee.userId) {
    await dispatchToUser({
      userId: claim.employee.userId,
      title: "Expense Claim Approved",
      body: `Your claim ${claim.claimNumber} for ?${claim.amount} has been approved and queued for reimbursement.`,
      category: "Expense Approved",
      link: `/expense/claims/${claim.id}`,
    });
  }
  // Notify finance for payroll queue
  const financeUsers = await prisma.user.findMany({ where: { role: { name: "FINANCE" }, isActive: true }, select: { id: true } });
  for (const user of financeUsers) {
    await dispatchToUser({
      userId: user.id,
      title: "Expense Claim Ready for Payroll",
      body: `Claim ${claim.claimNumber} for ${claim.employee.firstName} ${claim.employee.lastName} (?${claim.amount}) is approved and ready for payroll processing.`,
      category: "Expense Approved",
      link: `/expense/claims/${claim.id}`,
    });
  }
}

async function notifyClaimRejected(claim: any, actor: AccessTokenPayload, reason: string) {
  if (claim.employee.userId) {
    await dispatchToUser({
      userId: claim.employee.userId,
      title: "Expense Claim Rejected",
      body: `Your claim ${claim.claimNumber} for ?${claim.amount} was rejected. Reason: ${reason}`,
      category: "Expense Approved",
      link: `/expense/claims/${claim.id}`,
    });
  }
}

async function notifyClaimStatusUpdate(claim: any, actor: AccessTokenPayload, message: string) {
  if (claim.employee.userId) {
    await dispatchToUser({
      userId: claim.employee.userId,
      title: "Expense Claim Status Update",
      body: message,
      category: "Expense Approved",
      link: `/expense/claims/${claim.id}`,
    });
  }
}

async function notifyCorrectingEntryCreated(entry: any, actor: AccessTokenPayload) {
  const financeUsers = await prisma.user.findMany({ where: { role: { name: "FINANCE" }, isActive: true }, select: { id: true } });
  for (const user of financeUsers) {
    await dispatchToUser({
      userId: user.id,
      title: "Correcting Entry Created",
      body: `Correcting entry ${entry.entryNumber} created for claim ${entry.originalClaim.claimNumber} (${entry.correctionType}).`,
      category: "Expense Approved",
      link: `/expense/correcting-entries/${entry.id}`,
    });
  }
}

async function notifyCorrectingEntryApproved(entry: any, actor: AccessTokenPayload) {
  if (entry.originalClaim.employee.userId) {
    await dispatchToUser({
      userId: entry.originalClaim.employee.userId,
      title: "Correcting Entry Approved",
      body: `Correcting entry ${entry.entryNumber} for your claim ${entry.originalClaim.claimNumber} has been approved.`,
      category: "Expense Approved",
      link: `/expense/correcting-entries/${entry.id}`,
    });
  }
}

async function notifyCorrectingEntryRejected(entry: any, actor: AccessTokenPayload, reason: string) {
  if (entry.originalClaim.employee.userId) {
    await dispatchToUser({
      userId: entry.originalClaim.employee.userId,
      title: "Correcting Entry Rejected",
      body: `Correcting entry ${entry.entryNumber} for your claim ${entry.originalClaim.claimNumber} was rejected. Reason: ${reason}`,
      category: "Expense Approved",
      link: `/expense/correcting-entries/${entry.id}`,
    });
  }
}
