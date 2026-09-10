import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import * as expenseService from "./expense.service";
import * as policyService from "./expense.policy.service";
import * as duplicateService from "./expense.duplicate.service";
import * as receiptService from "./expense.receipt.service";
import * as reimbursementService from "./expense.reimbursement.service";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { validateReceiptFile } from "./expense.receipt.service";
import type { AccessTokenPayload } from "../../lib/jwt";

/** Resolve employee ID from auth */
async function resolveEmployeeId(req: Request): Promise<string> {
  if (!req.auth?.employeeId) throw AppError.forbidden("Employee account not linked");
  return req.auth.employeeId;
}

/** ============ CLAIM ENDPOINTS ============ */

export const createDraftClaim = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const result = await expenseService.createDraftClaim(req.body, { ...req.auth!, employeeId });
  sendSuccess(res, result.data, undefined, 201);
});

export const submitClaim = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const result = await expenseService.submitClaim(req.params.id, { ...req.auth!, employeeId });
  sendSuccess(res, result.data);
});

export const listClaims = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const q = req.query as Record<string, string | undefined>;
  const result = await expenseService.listClaims(
    {
      employeeId: q.employeeId,
      category: q.category as any,
      status: q.status as any,
      startDate: q.startDate ? new Date(q.startDate) : undefined,
      endDate: q.endDate ? new Date(q.endDate) : undefined,
      minAmount: q.minAmount ? Number(q.minAmount) : undefined,
      maxAmount: q.maxAmount ? Number(q.maxAmount) : undefined,
      page: q.page ? Number(q.page) : 1,
      limit: q.limit ? Number(q.limit) : 20,
    },
    { ...req.auth!, employeeId }
  );
  sendSuccess(res, result.data, result.total);
});

export const getClaim = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const result = await expenseService.getClaim(req.params.id, { ...req.auth!, employeeId });
  sendSuccess(res, result.data);
});

export const deleteDraftClaim = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const result = await expenseService.deleteDraftClaim(req.params.id, { ...req.auth!, employeeId });
  sendSuccess(res, result.data);
});

export const cancelClaim = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const result = await expenseService.cancelClaim(req.params.id, { ...req.auth!, employeeId });
  sendSuccess(res, result.data);
});

/** Approve/Reject actions */
export const approveClaim = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const result = await expenseService.actOnClaim(req.params.id, { ...req.auth!, employeeId }, "approve", req.body.comments);
  sendSuccess(res, result.data);
});

export const rejectClaim = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const rejectionReason = req.body.rejectionReason?.trim();
  if (!rejectionReason) throw AppError.badRequest("Rejection reason is required");
  const result = await expenseService.actOnClaim(req.params.id, { ...req.auth!, employeeId }, "reject", rejectionReason);
  sendSuccess(res, result.data);
});

/** ============ POLICY ENDPOINTS ============ */

export const listPolicies = asyncHandler(async (_req: Request, res: Response) => {
  const result = await policyService.listPolicies();
  sendSuccess(res, result.data);
});

export const getPolicy = asyncHandler(async (req: Request, res: Response) => {
  const policy = await policyService.getPolicyByCategory(req.params.category as any);
  if (!policy) throw AppError.notFound("Policy not found");
  sendSuccess(res, policy);
});

export const upsertPolicy = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const result = await policyService.upsertPolicy(req.body, { ...req.auth!, employeeId });
  sendSuccess(res, result.data, undefined, 201);
});

export const deletePolicy = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const result = await policyService.deletePolicy(req.params.category as any, { ...req.auth!, employeeId });
  sendSuccess(res, result.data);
});

export const validatePolicy = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = req.body.employeeId || (await resolveEmployeeId(req));
  const result = await policyService.validateClaimAgainstPolicy(
    { employeeId, ...req.body, expenseDate: new Date(req.body.expenseDate) },
    req.auth
  );
  sendSuccess(res, result);
});

export const getPolicyLimits = asyncHandler(async (_req: Request, res: Response) => {
  const result = await policyService.getPolicyLimits();
  sendSuccess(res, result);
});

/** ============ DUPLICATE DETECTION ============ */

export const checkDuplicates = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const result = await duplicateService.checkDuplicates({
    employeeId,
    ...req.body,
    expenseDate: new Date(req.body.expenseDate),
  });
  sendSuccess(res, result);
});

/** ============ RECEIPT ENDPOINTS ============ */

export const getUploadUrl = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const result = await receiptService.generateUploadUrl({ ...req.body, employeeId }, { ...req.auth!, employeeId });
  sendSuccess(res, result);
});

export const completeUpload = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  // For server-side upload, file buffer would be in req.file (multer)
  // For client-side upload, we just verify the object exists
  const result = await receiptService.completeReceiptUpload(req.body, { ...req.auth!, employeeId });
  sendSuccess(res, result);
});

export const getDownloadUrl = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const result = await receiptService.generateDownloadUrl(req.params.receiptId, employeeId, req.auth?.role ?? "");
  sendSuccess(res, result);
});

export const getReceiptMeta = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const result = await receiptService.getReceiptMetadata(req.params.receiptId, employeeId, req.auth?.role ?? "");
  sendSuccess(res, result);
});

export const deleteReceipt = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  await receiptService.deleteReceipt(req.params.receiptId, employeeId, { ...req.auth!, employeeId });
  sendSuccess(res, { deleted: true });
});

/** ============ CORRECTING ENTRIES ============ */

export const createCorrectingEntry = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const result = await expenseService.createCorrectingEntry(req.body, { ...req.auth!, employeeId });
  sendSuccess(res, result.data, undefined, 201);
});

export const approveCorrectingEntry = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const result = await expenseService.approveCorrectingEntry(req.params.entryId, { ...req.auth!, employeeId }, req.body.comments);
  sendSuccess(res, result.data);
});

export const rejectCorrectingEntry = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const rejectionReason = req.body.rejectionReason?.trim();
  if (!rejectionReason) throw AppError.badRequest("Rejection reason is required");
  const result = await expenseService.rejectCorrectingEntry(req.params.entryId, { ...req.auth!, employeeId }, rejectionReason);
  sendSuccess(res, result.data);
});

/** ============ REIMBURSEMENT / PAYROLL ============ */

export const queueForPayroll = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const result = await reimbursementService.queueForPayroll(req.params.id, { ...req.auth!, employeeId });
  sendSuccess(res, result);
});

export const getReimbursementQueue = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const q = req.query as Record<string, string | undefined>;
  const result = await reimbursementService.getReimbursementQueue({
    employeeId: q.employeeId,
    status: q.status as any,
    page: q.page ? Number(q.page) : 1,
    limit: q.limit ? Number(q.limit) : 20,
  });
  sendSuccess(res, result.data, result.total);
});

export const markPaid = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const result = await reimbursementService.markReimbursementPaid(req.params.id, req.body, { ...req.auth!, employeeId });
  sendSuccess(res, result.data);
});

export const getEmployeeReimbursementSummary = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = req.params.employeeId || (await resolveEmployeeId(req));
  const year = req.query.year ? Number(req.query.year) : undefined;
  const result = await reimbursementService.getEmployeeReimbursementSummary(employeeId, year);
  sendSuccess(res, result.data);
});

export const processPayrollReimbursements = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const result = await reimbursementService.processPayrollReimbursements(req.body.payrollRunId, { ...req.auth!, employeeId });
  sendSuccess(res, result);
});

/** ============ CLAIM HISTORY ============ */

export const getClaimHistory = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req);
  const history = await prisma.expenseClaimHistory.findMany({
    where: { claimId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  sendSuccess(res, history);
});
