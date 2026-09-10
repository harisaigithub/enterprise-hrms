import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middlewares/validate";
import { authenticate } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/rbac";
import * as expenseController from "./expense.controller";
import {
  listClaimsQuerySchema,
  createClaimBodySchema,
  submitClaimBodySchema,
  approveClaimBodySchema,
  rejectClaimBodySchema,
  policyBodySchema,
  validatePolicyBodySchema,
  receiptUploadUrlBodySchema,
  duplicateCheckBodySchema,
  correctingEntryBodySchema,
  approveCorrectingEntryBodySchema,
  rejectCorrectingEntryBodySchema,
  claimIdParamSchema,
  receiptIdParamSchema,
  correctingEntryIdParamSchema,
} from "./expense.validation";

const router = Router();

/** ============ CLAIM ROUTES ============ */

// GET /api/expense/claims � expense:read
router.get(
  "/claims",
  authenticate,
  requirePermission("expenses:read"),
  validate({ query: listClaimsQuerySchema }),
  expenseController.listClaims
);

// POST /api/expense/claims � expense:write (create draft)
router.post(
  "/claims",
  authenticate,
  requirePermission("expenses:write"),
  validate({ body: createClaimBodySchema }),
  expenseController.createDraftClaim
);

// GET /api/expense/claims/:id � expense:read
router.get(
  "/claims/:id",
  authenticate,
  requirePermission("expenses:read"),
  validate({ params: claimIdParamSchema }),
  expenseController.getClaim
);

// DELETE /api/expense/claims/:id � expense:write (delete draft)
router.delete(
  "/claims/:id",
  authenticate,
  requirePermission("expenses:write"),
  validate({ params: claimIdParamSchema }),
  expenseController.deleteDraftClaim
);

// POST /api/expense/claims/:id/submit � expense:write
router.post(
  "/claims/:id/submit",
  authenticate,
  requirePermission("expenses:write"),
  validate({ params: claimIdParamSchema, body: submitClaimBodySchema }),
  expenseController.submitClaim
);

// POST /api/expense/claims/:id/cancel � expense:write
router.post(
  "/claims/:id/cancel",
  authenticate,
  requirePermission("expenses:write"),
  validate({ params: claimIdParamSchema }),
  expenseController.cancelClaim
);

// PUT /api/expense/claims/:id/approve � expense:approve
router.put(
  "/claims/:id/approve",
  authenticate,
  requirePermission("expenses:approve"),
  validate({ params: claimIdParamSchema, body: approveClaimBodySchema }),
  expenseController.approveClaim
);

// PUT /api/expense/claims/:id/reject � expense:approve
router.put(
  "/claims/:id/reject",
  authenticate,
  requirePermission("expenses:approve"),
  validate({ params: claimIdParamSchema, body: rejectClaimBodySchema }),
  expenseController.rejectClaim
);

// GET /api/expense/claims/:id/history � expense:read
router.get(
  "/claims/:id/history",
  authenticate,
  requirePermission("expenses:read"),
  validate({ params: claimIdParamSchema }),
  expenseController.getClaimHistory
);

/** ============ POLICY ROUTES ============ */

// GET /api/expense/policies � expense:read
router.get(
  "/policies",
  authenticate,
  requirePermission("expenses:read"),
  expenseController.listPolicies
);

// GET /api/expense/policies/limits � expense:read
router.get(
  "/policies/limits",
  authenticate,
  requirePermission("expenses:read"),
  expenseController.getPolicyLimits
);

// GET /api/expense/policies/:category � expense:read
router.get(
  "/policies/:category",
  authenticate,
  requirePermission("expenses:read"),
  expenseController.getPolicy
);

// POST /api/expense/policies � expense:manage (admin/finance)
router.post(
  "/policies",
  authenticate,
  requirePermission("expenses:manage"),
  validate({ body: policyBodySchema }),
  expenseController.upsertPolicy
);

// PUT /api/expense/policies/:category � expense:manage
router.put(
  "/policies/:category",
  authenticate,
  requirePermission("expenses:manage"),
  validate({ body: policyBodySchema }),
  expenseController.upsertPolicy
);

// DELETE /api/expense/policies/:category � expense:manage
router.delete(
  "/policies/:category",
  authenticate,
  requirePermission("expenses:manage"),
  expenseController.deletePolicy
);

// POST /api/expense/policies/validate � expense:read (dry-run)
router.post(
  "/policies/validate",
  authenticate,
  requirePermission("expenses:read"),
  validate({ body: validatePolicyBodySchema }),
  expenseController.validatePolicy
);

/** ============ DUPLICATE DETECTION ============ */

// POST /api/expense/duplicates/check � expense:read
router.post(
  "/duplicates/check",
  authenticate,
  requirePermission("expenses:read"),
  validate({ body: duplicateCheckBodySchema }),
  expenseController.checkDuplicates
);

/** ============ RECEIPT ROUTES ============ */

// POST /api/expense/receipts/upload-url � expense:write
router.post(
  "/receipts/upload-url",
  authenticate,
  requirePermission("expenses:write"),
  validate({ body: receiptUploadUrlBodySchema }),
  expenseController.getUploadUrl
);

// POST /api/expense/receipts/complete � expense:write
router.post(
  "/receipts/complete",
  authenticate,
  requirePermission("expenses:write"),
  expenseController.completeUpload
);

// GET /api/expense/receipts/:receiptId/download � expense:read
router.get(
  "/receipts/:receiptId/download",
  authenticate,
  requirePermission("expenses:read"),
  validate({ params: receiptIdParamSchema }),
  expenseController.getDownloadUrl
);

// GET /api/expense/receipts/:receiptId � expense:read
router.get(
  "/receipts/:receiptId",
  authenticate,
  requirePermission("expenses:read"),
  validate({ params: receiptIdParamSchema }),
  expenseController.getReceiptMeta
);

// DELETE /api/expense/receipts/:receiptId � expense:write
router.delete(
  "/receipts/:receiptId",
  authenticate,
  requirePermission("expenses:write"),
  validate({ params: receiptIdParamSchema }),
  expenseController.deleteReceipt
);

/** ============ CORRECTING ENTRIES ============ */

// POST /api/expense/correcting-entries � expense:write
router.post(
  "/correcting-entries",
  authenticate,
  requirePermission("expenses:write"),
  validate({ body: correctingEntryBodySchema }),
  expenseController.createCorrectingEntry
);

// PUT /api/expense/correcting-entries/:entryId/approve � expense:approve
router.put(
  "/correcting-entries/:entryId/approve",
  authenticate,
  requirePermission("expenses:approve"),
  validate({ params: correctingEntryIdParamSchema, body: approveCorrectingEntryBodySchema }),
  expenseController.approveCorrectingEntry
);

// PUT /api/expense/correcting-entries/:entryId/reject � expense:approve
router.put(
  "/correcting-entries/:entryId/reject",
  authenticate,
  requirePermission("expenses:approve"),
  validate({ params: correctingEntryIdParamSchema, body: rejectCorrectingEntryBodySchema }),
  expenseController.rejectCorrectingEntry
);

/** ============ REIMBURSEMENT / PAYROLL INTEGRATION ============ */

// POST /api/expense/claims/:id/queue-payroll � expense:approve (finance)
router.post(
  "/claims/:id/queue-payroll",
  authenticate,
  requirePermission("expenses:approve"),
  validate({ params: claimIdParamSchema }),
  expenseController.queueForPayroll
);

// GET /api/expense/reimbursements � expense:read
router.get(
  "/reimbursements",
  authenticate,
  requirePermission("expenses:read"),
  expenseController.getReimbursementQueue
);

// POST /api/expense/claims/:id/mark-paid � expense:manage
router.post(
  "/claims/:id/mark-paid",
  authenticate,
  requirePermission("expenses:manage"),
  validate({ params: claimIdParamSchema }),
  expenseController.markPaid
);

// GET /api/expense/employees/:employeeId/reimbursement-summary � expense:read
router.get(
  "/employees/:employeeId/reimbursement-summary",
  authenticate,
  requirePermission("expenses:read"),
  expenseController.getEmployeeReimbursementSummary
);

// POST /api/expense/reimbursements/process-payroll � expense:manage (payroll admin)
router.post(
  "/reimbursements/process-payroll",
  authenticate,
  requirePermission("expenses:manage"),
  expenseController.processPayrollReimbursements
);

export default router;
