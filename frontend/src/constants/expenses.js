export const EXPENSE_CATEGORIES = [
  "Travel",
  "Food & Meals",
  "Accommodation",
  "Local Transport",
  "Office Supplies",
  "Communication",
  "Training",
  "Client Entertainment",
  "Other",
];

export const PAYMENT_METHODS = [
  "Cash",
  "Personal Card",
  "Corporate Card",
  "Bank Transfer",
  "Other",
];

// 14.3 Preconditions — per-category limits, required receipt thresholds
export const EXPENSE_POLICY = {
  Travel: { limit: 15000, receiptThreshold: 500 },
  "Food & Meals": { limit: 2000, receiptThreshold: 500 },
  Accommodation: { limit: 12000, receiptThreshold: 1000 },
  "Local Transport": { limit: 3000, receiptThreshold: 300 },
  "Office Supplies": { limit: 5000, receiptThreshold: 500 },
  Communication: { limit: 3000, receiptThreshold: 500 },
  Training: { limit: 20000, receiptThreshold: 1000 },
  "Client Entertainment": { limit: 10000, receiptThreshold: 1000 },
  Other: { limit: 5000, receiptThreshold: 500 },
};

export const SUBMISSION_WINDOW_DAYS = 60;

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
  "Sent Back": { label: "Sent Back for Revision", color: "#f97316", bg: "#fff7ed" },
};

export const LOCKED_STATUSES = [
  "Approved for Reimbursement",
  "Approved",
  "Queued for Payroll",
  "Paid",
  "Cancelled",
];

export const DRAFT_STATUSES = ["Draft"];

export const EDITABLE_STATUSES = ["Draft", "Sent Back"];

export const SUBMITTABLE_STATUSES = ["Draft"];

export const SEND_BACKABLE_STATUSES = ["Submitted", "Manager Pending", "Finance Pending"];
