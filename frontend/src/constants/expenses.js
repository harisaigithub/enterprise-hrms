export const EXPENSE_CATEGORIES = [
  "Travel Claims",
  "Food Claims",
  "Cab Claims",
  "Hotel Claims",
];

export const EXPENSE_POLICY = {
  "Travel Claims": { limit: 15000, receiptThreshold: 500 },
  "Food Claims": { limit: 2000, receiptThreshold: 500 },
  "Cab Claims": { limit: 3000, receiptThreshold: 300 },
  "Hotel Claims": { limit: 12000, receiptThreshold: 1000 },
};

export const expenseStatusMeta = {
  Draft: { label: "Draft", color: "#64748b", bg: "#f8fafc" },
  Submitted: { label: "Submitted", color: "#d97706", bg: "#fffbeb" },
  "Manager Pending": { label: "Pending Manager Approval", color: "#d97706", bg: "#fffbeb" },
  "Pending Manager Approval": { label: "Pending Manager Approval", color: "#d97706", bg: "#fffbeb" },
  "Finance Pending": { label: "Pending Finance Approval", color: "#0284c7", bg: "#f0f9ff" },
  "Pending Finance Approval": { label: "Pending Finance Approval", color: "#0284c7", bg: "#f0f9ff" },
  Approved: { label: "Approved for Reimbursement", color: "#16a34a", bg: "#f0fdf4" },
  "Approved for Reimbursement": { label: "Approved for Reimbursement", color: "#16a34a", bg: "#f0fdf4" },
  "Queued for Payroll": { label: "Queued for Payroll", color: "#7c3aed", bg: "#f5f3ff" },
  Paid: { label: "Paid", color: "#15803d", bg: "#dcfce7" },
  Rejected: { label: "Rejected", color: "#dc2626", bg: "#fef2f2" },
  Cancelled: { label: "Cancelled", color: "#64748b", bg: "#f1f5f9" },
};

export const LOCKED_STATUSES = [
  "Approved for Reimbursement",
  "Approved",
  "Queued for Payroll",
  "Paid",
  "Cancelled",
];
