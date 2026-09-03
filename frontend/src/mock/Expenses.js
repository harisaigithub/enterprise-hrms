/**
 * Mock data — Expense Management
 * Follows the attendanceStatusMeta/leaveStatusMeta convention.
 */

export const EXPENSE_CATEGORIES = ["Travel Claims", "Food Claims", "Cab Claims", "Hotel Claims"];

// 14.3 Preconditions — per-category limits, required receipt thresholds
export const EXPENSE_POLICY = {
  "Travel Claims": { limit: 15000, receiptThreshold: 500 },
  "Food Claims":   { limit: 2000,  receiptThreshold: 500 },
  "Cab Claims":    { limit: 3000,  receiptThreshold: 300 },
  "Hotel Claims":  { limit: 12000, receiptThreshold: 1000 },
};

export const SUBMISSION_WINDOW_DAYS = 60;

export const expenseStatusMeta = {
  Draft:                        { label: "Draft",                        color: "#64748b", bg: "#f8fafc" },
  "Pending Manager Approval":   { label: "Pending Manager Approval",      color: "#d97706", bg: "#fffbeb" },
  "Pending Finance Approval":   { label: "Pending Finance Approval",      color: "#0284c7", bg: "#f0f9ff" },
  "Approved for Reimbursement": { label: "Approved for Reimbursement",    color: "#16a34a", bg: "#f0fdf4" },
  "Queued for Payroll":         { label: "Queued for Payroll",            color: "#7c3aed", bg: "#f5f3ff" },
  Rejected:                     { label: "Rejected",                     color: "#dc2626", bg: "#fef2f2" },
};

// Claims are immutable once "Approved for Reimbursement" or "Queued for Payroll" (14.6)
export const LOCKED_STATUSES = ["Approved for Reimbursement", "Queued for Payroll"];

let _nextId = 5;
export function generateClaimId() {
  return `EXP-${String(_nextId++).padStart(4, "0")}`;
}

export const RAW_CLAIMS = [
  {
    id: "EXP-0001",
    employeeId: "EMP014",
    employeeName: "Ananya Verma",
    category: "Travel Claims",
    amount: 8500,
    expenseDate: "2026-07-20",
    businessPurpose: "Client visit — Bangalore office",
    receiptAttached: true,
    receiptFileName: "travel_receipt_0720.pdf",
    status: "Pending Manager Approval",
    approvalStage: "Manager",
    submittedOn: "2026-07-22",
    violations: [],
    possibleDuplicateOf: null,
    rejectionReason: null,
  },
  {
    id: "EXP-0002",
    employeeId: "EMP014",
    employeeName: "Ananya Verma",
    category: "Food Claims",
    amount: 2600,
    expenseDate: "2026-07-18",
    businessPurpose: "Team lunch with vendor",
    receiptAttached: true,
    receiptFileName: "food_receipt_0718.jpg",
    status: "Pending Manager Approval",
    approvalStage: "Manager",
    submittedOn: "2026-07-19",
    violations: ["Exceeds Food Claims category limit of ₹2,000 by ₹600"],
    possibleDuplicateOf: null,
    rejectionReason: null,
  },
  {
    id: "EXP-0003",
    employeeId: "EMP015",
    employeeName: "Kabir Malhotra",
    category: "Cab Claims",
    amount: 450,
    expenseDate: "2026-07-25",
    businessPurpose: "Airport pickup for candidate interview",
    receiptAttached: false,
    receiptFileName: null,
    status: "Pending Finance Approval",
    approvalStage: "Finance",
    submittedOn: "2026-07-26",
    violations: ["Receipt missing — required above ₹300 for Cab Claims"],
    possibleDuplicateOf: null,
    rejectionReason: null,
  },
  {
    id: "EXP-0004",
    employeeId: "EMP016",
    employeeName: "Ishita Sharma",
    category: "Hotel Claims",
    amount: 9800,
    expenseDate: "2026-06-10",
    businessPurpose: "Design offsite — Goa",
    receiptAttached: true,
    receiptFileName: "hotel_invoice_goa.pdf",
    status: "Approved for Reimbursement",
    approvalStage: null,
    submittedOn: "2026-06-12",
    violations: [],
    possibleDuplicateOf: null,
    rejectionReason: null,
  },
  {
    id: "EXP-0005",
    employeeId: "EMP001",
    employeeName: "Matsya Singh",
    category: "Cab Claims",
    amount: 420,
    expenseDate: "2026-08-10",
    businessPurpose: "Client onsite visit — Electronics City, Bengaluru",
    receiptAttached: true,
    receiptFileName: "ola_invoice_blr_0810.pdf",
    status: "Approved for Reimbursement",
    approvalStage: null,
    submittedOn: "2026-08-11",
    violations: [],
    possibleDuplicateOf: null,
    rejectionReason: null,
  },
  {
    id: "EXP-0006",
    employeeId: "EMP001",
    employeeName: "Matsya Singh",
    category: "Food Claims",
    amount: 1450,
    expenseDate: "2026-08-22",
    businessPurpose: "Sprint architecture review dinner with tech leads",
    receiptAttached: true,
    receiptFileName: "food_voucher_aug22.jpg",
    status: "Pending Manager Approval",
    approvalStage: "Manager",
    submittedOn: "2026-08-23",
    violations: [],
    possibleDuplicateOf: null,
    rejectionReason: null,
  },
];