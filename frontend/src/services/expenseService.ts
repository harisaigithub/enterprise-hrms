/**
 * Expense Service — Module 12
 * Talks to the real backend (VITE_API_URL → /api/expense).
 */

import api from "./api";

export interface ExpensePolicy {
  id: string;
  category: string;
  limitAmount: number;
  receiptThreshold: number;
  submissionWindowDays: number;
  isActive: boolean;
}

export interface ExpenseClaim {
  id: string;
  claimNumber: string;
  employeeId: string;
  employeeName?: string;
  category: string;
  amount: number;
  expenseDate: string;
  businessPurpose: string;
  status: string;
  approvalStage?: string;
  submittedAt?: string;
  managerApprovedAt?: string;
  financeApprovedAt?: string;
  approvedForReimbursementAt?: string;
  queuedForPayrollAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  rejectedBy?: string;
  policyViolations: string[];
  duplicateWarning?: { type: "exact" | "near"; claimId: string; similarity?: number } | null;
  isDraft: boolean;
  receiptPending: boolean;
  isImmutable: boolean;
  correctingEntryId?: string;
  originalClaimId?: string;
  workflowInstanceId?: string;
  createdAt: string;
  updatedAt: string;
  receipts?: ExpenseReceipt[];
  history?: ExpenseClaimHistory[];
}

export interface ExpenseReceipt {
  id: string;
  claimId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  minioObjectName: string;
  fileHash: string;
  perceptualHash?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface ExpenseClaimHistory {
  id: string;
  claimId: string;
  action: string;
  actorId: string;
  actorName: string;
  oldStatus?: string;
  newStatus?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface ExpenseCorrectingEntry {
  id: string;
  entryNumber: string;
  originalClaimId: string;
  reason: string;
  correctionType: string;
  adjustedAmount?: number;
  status: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  appliedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DuplicateCheckResult {
  exactDuplicate?: { claimId: string; claimNumber: string } | null;
  nearDuplicate?: { claimId: string; claimNumber: string; similarity: number } | null;
}

export interface ReimbursementQueueItem {
  id: string;
  claimId: string;
  claimNumber: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  category: string;
  status: string;
  createdAt: string;
}

// Policy
export const getPolicies = async (): Promise<ExpensePolicy[]> => {
  const res = await api.get("/expense/policies");
  return res.data.data;
};

export const upsertPolicy = async (data: Partial<ExpensePolicy> & { category: string }): Promise<ExpensePolicy> => {
  const res = await api.post("/expense/policies", data);
  return res.data.data;
};

// Claims
export const getMyExpenseClaims = async (employeeId?: string): Promise<ExpenseClaim[]> => {
  const res = await api.get("/expense/claims", { params: { employeeId } });
  return res.data.data;
};

export const getMyClaims = getMyExpenseClaims;

export const getPendingApprovals = async (stage?: "Manager" | "Finance"): Promise<ExpenseClaim[]> => {
  const params = stage ? { stage } : {};
  const res = await api.get("/expense/claims/pending", { params });
  return res.data.data;
};

export const getClaimById = async (id: string): Promise<ExpenseClaim> => {
  const res = await api.get(`/expense/claims/${id}`);
  return res.data.data;
};

export const createDraft = async (data: {
  category: string;
  amount: number;
  expenseDate: string;
  businessPurpose: string;
  receiptFileId?: string;
}): Promise<ExpenseClaim> => {
  const res = await api.post("/expense/claims", { ...data, isDraft: true });
  return res.data.data;
};

export const updateDraft = async (id: string, data: Partial<ExpenseClaim>): Promise<ExpenseClaim> => {
  const res = await api.put(`/expense/claims/${id}`, data);
  return res.data.data;
};

export const submitClaim = async (id: string): Promise<ExpenseClaim> => {
  const res = await api.post(`/expense/claims/${id}/submit`);
  return res.data.data;
};

export const submitExpenseClaim = submitClaim;

export const deleteDraft = async (id: string): Promise<void> => {
  await api.delete(`/expense/claims/${id}`);
};

// Receipts
export const getReceiptUploadUrl = async (claimId: string, fileName: string, mimeType: string, fileSize: number): Promise<{ uploadUrl: string; objectName: string }> => {
  const res = await api.post(`/expense/receipts/upload-url`, { claimId, fileName, mimeType, fileSize });
  return res.data.data;
};

export const confirmReceiptUpload = async (claimId: string, objectName: string, fileHash: string, perceptualHash?: string): Promise<ExpenseReceipt> => {
  const res = await api.post(`/expense/receipts/complete`, { claimId, objectName, fileHash, perceptualHash });
  return res.data.data;
};

export const getReceiptSignedUrl = async (receiptId: string): Promise<{ url: string; expiresAt: string }> => {
  const res = await api.get(`/expense/receipts/${receiptId}/download`);
  return res.data.data;
};

export const deleteReceipt = async (receiptId: string): Promise<void> => {
  await api.delete(`/expense/receipts/${receiptId}`);
};

// Approvals
export const approveClaim = async (id: string, actorRole: "Manager" | "Finance"): Promise<ExpenseClaim> => {
  const res = await api.put(`/expense/claims/${id}/approve`, { stage: actorRole });
  return res.data.data;
};

export const rejectClaim = async (id: string, actorRole: "Manager" | "Finance", reason: string): Promise<ExpenseClaim> => {
  const res = await api.put(`/expense/claims/${id}/reject`, { stage: actorRole, reason });
  return res.data.data;
};

// Resubmission
export const resubmitClaim = async (id: string): Promise<ExpenseClaim> => {
  const res = await api.post(`/expense/claims/${id}/resubmit`);
  return res.data.data;
};

// Correcting Entries
export const createCorrectingEntry = async (data: {
  originalClaimId: string;
  reason: string;
  correctionType: string;
  adjustedAmount?: number;
}): Promise<ExpenseCorrectingEntry> => {
  const res = await api.post("/expense/correcting-entries", data);
  return res.data.data;
};

export const getCorrectingEntries = async (claimId: string): Promise<ExpenseCorrectingEntry[]> => {
  const res = await api.get(`/expense/claims/${claimId}/correcting-entries`);
  return res.data.data;
};

export const approveCorrectingEntry = async (entryId: string): Promise<ExpenseCorrectingEntry> => {
  const res = await api.put(`/expense/correcting-entries/${entryId}/approve`);
  return res.data.data;
};

// Reimbursement
export const getReimbursementQueue = async (status?: string): Promise<ReimbursementQueueItem[]> => {
  const params = status ? { status } : {};
  const res = await api.get("/expense/reimbursements", { params });
  return res.data.data;
};

export const processReimbursement = async (claimId: string): Promise<{ success: boolean; payrollRunId?: string }> => {
  const res = await api.post(`/expense/claims/${claimId}/queue-payroll`);
  return res.data.data;
};

export const markReimbursementPaid = async (claimId: string, payrollRunId: string): Promise<void> => {
  await api.post(`/expense/claims/${claimId}/mark-paid`, { payrollRunId });
};

// History
export const getClaimHistory = async (claimId: string): Promise<ExpenseClaimHistory[]> => {
  const res = await api.get(`/expense/claims/${claimId}/history`);
  return res.data.data;
};

// Duplicate check
export const checkDuplicates = async (data: {
  category: string;
  amount: number;
  expenseDate: string;
  fileHash?: string;
  perceptualHash?: string;
}): Promise<DuplicateCheckResult> => {
  const res = await api.post("/expense/duplicates/check", data);
  return res.data.data;
};

export default {
  getPolicies,
  upsertPolicy,
  getMyExpenseClaims,
  getMyClaims,
  getPendingApprovals,
  getClaimById,
  createDraft,
  updateDraft,
  submitClaim,
  submitExpenseClaim,
  deleteDraft,
  getReceiptUploadUrl,
  confirmReceiptUpload,
  getReceiptSignedUrl,
  deleteReceipt,
  approveClaim,
  rejectClaim,
  resubmitClaim,
  createCorrectingEntry,
  getCorrectingEntries,
  approveCorrectingEntry,
  getReimbursementQueue,
  processReimbursement,
  markReimbursementPaid,
  getClaimHistory,
  checkDuplicates,
};