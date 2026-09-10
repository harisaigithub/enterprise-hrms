import { z } from "zod";

/** Valid expense categories per Module 12 spec */
export const EXPENSE_CATEGORIES = [
  "Travel Claims",
  "Food Claims",
  "Cab Claims",
  "Hotel Claims",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** Expense claim statuses */
export const EXPENSE_CLAIM_STATUSES = [
  "Draft",
  "Submitted",
  "Manager Pending",
  "Finance Pending",
  "Approved",
  "Rejected",
  "Queued for Payroll",
  "Cancelled",
] as const;

export type ExpenseClaimStatus = (typeof EXPENSE_CLAIM_STATUSES)[number];

/** Correction types for correcting entries */
export const CORRECTION_TYPES = [
  "Amount Adjustment",
  "Category Change",
  "Date Correction",
  "Purpose Correction",
  "Full Reversal",
] as const;

export type CorrectionType = (typeof CORRECTION_TYPES)[number];

/** Query params for listing claims */
export const listClaimsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  employeeId: z.string().uuid().optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  status: z.enum(EXPENSE_CLAIM_STATUSES).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
});

/** Body for creating a new expense claim (draft) */
export const createClaimBodySchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES, {
    errorMap: () => ({ message: "Category must be one of: Travel Claims, Food Claims, Cab Claims, Hotel Claims" }),
  }),
  amount: z.number().positive("Amount must be positive").max(99999999.99, "Amount too large"),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expenseDate must be YYYY-MM-DD"),
  businessPurpose: z.string().min(10, "Business purpose must be at least 10 characters").max(2000),
  receiptFileId: z.string().uuid().optional(),
});

/** Body for submitting a claim (moves from Draft -> Submitted) */
export const submitClaimBodySchema = z.object({});

/** Body for policy validation check (dry-run) */
export const validatePolicyBodySchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.number().positive(),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  employeeId: z.string().uuid().optional(),
});

/** Body for manager/finance approval */
export const approveClaimBodySchema = z.object({
  comments: z.string().max(1000).optional(),
});

/** Body for rejection (requires reason) */
export const rejectClaimBodySchema = z.object({
  rejectionReason: z.string().trim().min(1, "Rejection reason is required").max(1000),
});

/** Body for creating a correcting entry on an approved/immutable claim */
export const correctingEntryBodySchema = z.object({
  originalClaimId: z.string().uuid(),
  reason: z.string().min(10, "Correction reason must be at least 10 characters").max(2000),
  correctionType: z.enum(CORRECTION_TYPES),
  adjustedAmount: z.number().optional(),
});

/** Body for approving a correcting entry */
export const approveCorrectingEntryBodySchema = z.object({
  comments: z.string().max(1000).optional(),
});

/** Body for rejecting a correcting entry */
export const rejectCorrectingEntryBodySchema = z.object({
  rejectionReason: z.string().trim().min(1, "Rejection reason is required").max(1000),
});

/** Query for policy management */
export const listPoliciesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isActive: z.coerce.boolean().optional(),
});

/** Body for creating/updating expense policy */
export const policyBodySchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  limitAmount: z.number().positive("Limit amount must be positive").max(99999999.99),
  receiptThreshold: z.number().positive("Receipt threshold must be positive").max(99999999.99),
  submissionWindowDays: z.number().int().positive("Submission window must be positive").max(365).default(60),
  isActive: z.boolean().default(true),
});

/** Body for receipt upload presigned URL request */
export const receiptUploadUrlBodySchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(50 * 1024 * 1024, "File size cannot exceed 50MB"),
  mimeType: z.string().regex(/^(image\/|application\/pdf)/, "Only images and PDFs allowed"),
  claimId: z.string().uuid().optional(),
});

/** Query for receipt download */
export const receiptDownloadQuerySchema = z.object({
  claimId: z.string().uuid(),
  receiptId: z.string().uuid().optional(),
});

/** Body for duplicate check (dry-run) */
export const duplicateCheckBodySchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.number().positive(),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fileHash: z.string().length(64).optional(),
  perceptualHash: z.string().length(64).optional(),
});

/** Path param for claim ID */
export const claimIdParamSchema = z.object({
  id: z.string().uuid("Invalid claim ID format"),
});

/** Path param for receipt ID */
export const receiptIdParamSchema = z.object({
  receiptId: z.string().uuid("Invalid receipt ID format"),
});

/** Path param for correcting entry ID */
export const correctingEntryIdParamSchema = z.object({
  entryId: z.string().uuid("Invalid correcting entry ID format"),
});

/** Path param for policy ID */
export const policyIdParamSchema = z.object({
  policyId: z.string().uuid("Invalid policy ID format"),
});

/** Type inference helpers */
export type ListClaimsQuery = z.infer<typeof listClaimsQuerySchema>;
export type CreateClaimBody = z.infer<typeof createClaimBodySchema>;
export type SubmitClaimBody = z.infer<typeof submitClaimBodySchema>;
export type ValidatePolicyBody = z.infer<typeof validatePolicyBodySchema>;
export type ApproveClaimBody = z.infer<typeof approveClaimBodySchema>;
export type RejectClaimBody = z.infer<typeof rejectClaimBodySchema>;
export type CorrectingEntryBody = z.infer<typeof correctingEntryBodySchema>;
export type ApproveCorrectingEntryBody = z.infer<typeof approveCorrectingEntryBodySchema>;
export type RejectCorrectingEntryBody = z.infer<typeof rejectCorrectingEntryBodySchema>;
export type ListPoliciesQuery = z.infer<typeof listPoliciesQuerySchema>;
export type PolicyBody = z.infer<typeof policyBodySchema>;
export type ReceiptUploadUrlBody = z.infer<typeof receiptUploadUrlBodySchema>;
export type ReceiptDownloadQuery = z.infer<typeof receiptDownloadQuerySchema>;
export type DuplicateCheckBody = z.infer<typeof duplicateCheckBodySchema>;
export type ClaimIdParam = z.infer<typeof claimIdParamSchema>;
export type ReceiptIdParam = z.infer<typeof receiptIdParamSchema>;
export type CorrectingEntryIdParam = z.infer<typeof correctingEntryIdParamSchema>;
export type PolicyIdParam = z.infer<typeof policyIdParamSchema>;
