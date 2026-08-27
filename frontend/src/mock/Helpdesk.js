/**
 * Mock data — Helpdesk
 */

export const TICKET_CATEGORIES = ["IT Tickets", "HR Tickets", "Finance Tickets", "Asset Support", "HR - Grievance/Confidential"];

// 17.3 Preconditions — categories and SLA rules are pre-configured
export const SLA_HOURS = {
  "IT Tickets": 8,
  "HR Tickets": 24,
  "Finance Tickets": 24,
  "Asset Support": 16,
  "HR - Grievance/Confidential": 24,
};

// 17.5 step 2 — category-driven auto-assignment to queue/agent group
export const CATEGORY_QUEUE = {
  "IT Tickets": "IT Support",
  "HR Tickets": "HR",
  "Finance Tickets": "Finance",
  "Asset Support": "Asset Support Team",
  "HR - Grievance/Confidential": "HR-Compliance (Restricted)",
};

// 17.5 step 6 — this category always routes to the restricted queue, and
// general agents cannot reassign it (enforced in helpdeskService, not just UI)
export const RESTRICTED_CATEGORY = "HR - Grievance/Confidential";

// 17.5 step 5 — window to reopen a resolved ticket before it auto-closes
export const REOPEN_WINDOW_DAYS = 3;

export const ticketStatusMeta = {
  Open:        { label: "Open",        color: "#0284c7", bg: "#f0f9ff" },
  "In Progress": { label: "In Progress", color: "#d97706", bg: "#fffbeb" },
  Resolved:    { label: "Resolved",    color: "#16a34a", bg: "#f0fdf4" },
  Reopened:    { label: "Reopened",    color: "#dc2626", bg: "#fef2f2" },
  Closed:      { label: "Closed",      color: "#64748b", bg: "#f8fafc" },
};

let _nextId = 6;
export function generateTicketId() {
  return `TCK-${String(_nextId++).padStart(4, "0")}`;
}

const now = new Date();
const hoursAgo = (h) => new Date(now.getTime() - h * 3600000).toISOString();
const daysAgo = (d) => new Date(now.getTime() - d * 86400000).toISOString();

export const RAW_TICKETS = [
  {
    id: "TCK-0001",
    employeeId: "EMP014",
    employeeName: "Ananya Verma",
    category: "IT Tickets",
    queue: "IT Support",
    description: "VPN client fails to connect from home network since this morning.",
    attachmentFileName: "vpn_error_screenshot.png",
    status: "Open",
    assignedAgent: "Rakesh Singh (IT Support)",
    createdOn: hoursAgo(2),
    resolvedOn: null,
    resolutionNotes: null,
    reopenedOn: null,
    thread: [
      { author: "Ananya Verma", message: "VPN client fails to connect from home network since this morning.", timestamp: hoursAgo(2) },
    ],
    isConfidential: false,
  },
  {
    id: "TCK-0002",
    employeeId: "EMP015",
    employeeName: "Kabir Malhotra",
    category: "IT Tickets",
    queue: "IT Support",
    description: "Laptop won't power on — tried a different charger, no response.",
    attachmentFileName: null,
    status: "In Progress",
    assignedAgent: "Rakesh Singh (IT Support)",
    createdOn: hoursAgo(9), // past the 8h SLA for IT Tickets — will show as escalated
    resolvedOn: null,
    resolutionNotes: null,
    reopenedOn: null,
    thread: [
      { author: "Kabir Malhotra", message: "Laptop won't power on — tried a different charger, no response.", timestamp: hoursAgo(9) },
      { author: "Rakesh Singh (IT Support)", message: "Picking this up, will swap a loaner laptop today.", timestamp: hoursAgo(6) },
    ],
    isConfidential: false,
  },
  {
    id: "TCK-0003",
    employeeId: "EMP016",
    employeeName: "Ishita Sharma",
    category: "Finance Tickets",
    queue: "Finance",
    description: "July reimbursement not reflected in payslip — need clarification.",
    attachmentFileName: null,
    status: "Resolved",
    assignedAgent: "Priya Iyer (Finance)",
    createdOn: daysAgo(4),
    resolvedOn: daysAgo(1), // within the 3-day reopen window
    resolutionNotes: "Confirmed with payroll — reimbursement queued for the August cycle, will reflect next payslip.",
    reopenedOn: null,
    thread: [
      { author: "Ishita Sharma", message: "July reimbursement not reflected in payslip — need clarification.", timestamp: daysAgo(4) },
      { author: "Priya Iyer (Finance)", message: "Confirmed with payroll — reimbursement queued for the August cycle, will reflect next payslip.", timestamp: daysAgo(1) },
    ],
    isConfidential: false,
  },
  {
    id: "TCK-0004",
    employeeId: "EMP017",
    employeeName: "Yash Chaudhary",
    category: "Asset Support",
    queue: "Asset Support Team",
    description: "Requesting a second monitor for my desk setup.",
    attachmentFileName: null,
    status: "Resolved",
    assignedAgent: "IT Support",
    createdOn: daysAgo(10),
    resolvedOn: daysAgo(6), // past the 3-day reopen window — will show as auto-closed
    resolutionNotes: "Monitor allocated from inventory, delivered to desk.",
    reopenedOn: null,
    thread: [
      { author: "Yash Chaudhary", message: "Requesting a second monitor for my desk setup.", timestamp: daysAgo(10) },
      { author: "IT Support", message: "Monitor allocated from inventory, delivered to desk.", timestamp: daysAgo(6) },
    ],
    isConfidential: false,
  },
  {
    id: "TCK-0005",
    employeeId: "EMP014",
    employeeName: "Ananya Verma",
    category: "HR — Grievance/Confidential",
    queue: "HR-Compliance (Restricted)",
    description: "Would like to raise a confidential workplace concern.",
    attachmentFileName: null,
    status: "Open",
    assignedAgent: "HR-Compliance",
    createdOn: hoursAgo(4),
    resolvedOn: null,
    resolutionNotes: null,
    reopenedOn: null,
    thread: [
      { author: "Ananya Verma", message: "Would like to raise a confidential workplace concern.", timestamp: hoursAgo(4) },
    ],
    isConfidential: true,
  },
];
