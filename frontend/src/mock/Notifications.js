/**
 * Mock data — Module 23: Notifications
 */

export const CHANNELS = ["Email", "SMS", "WhatsApp", "Push", "Teams", "Slack", "In-app"];

export const NOTIFICATION_CATEGORIES = [
  "Leave Approved", "Payslip Ready", "Ticket Resolved", "Policy Published",
  "New Device Login", "Compliance Training Due", "Expense Approved", "Onboarding Reminder",
];

// spec 23.5 step 2 — these always also go to Email regardless of the
// recipient's channel preference, including a full opt-out.
export const SECURITY_CRITICAL_CATEGORIES = ["New Device Login"];

export const CURRENT_USER = { id: "EMP014", name: "Ananya Verma" };

/**
 * Approved merge-field catalog for notification templates (spec 23.6).
 * Deliberately includes L3/L4 entries (unlike the Reports catalog, which
 * just omits them) because the linter needs real disallowed fields to
 * demonstrate rejecting — this list IS what lintTemplateBody checks against.
 */
export const MERGE_FIELD_CATALOG = [
  { id: "employeeName", label: "Employee Name", classification: "L1" },
  { id: "leaveType", label: "Leave Type", classification: "L1" },
  { id: "leaveDates", label: "Leave Dates", classification: "L2" },
  { id: "ticketId", label: "Ticket ID", classification: "L1" },
  { id: "policyTitle", label: "Policy Title", classification: "L1" },
  { id: "payslipMonth", label: "Payslip Month", classification: "L1" },
  { id: "payslipLink", label: "Payslip Link (reference only)", classification: "L1" },
  { id: "courseName", label: "Course Name", classification: "L1" },
  { id: "dueDate", label: "Due Date", classification: "L1" },
  { id: "deviceInfo", label: "Device Info", classification: "L2" },
  { id: "loginTime", label: "Login Time", classification: "L1" },
  { id: "expenseCategory", label: "Expense Category", classification: "L1" },
  // Disallowed — present so the linter has real L3/L4 fields to catch, per
  // the spec's own example ("payslip-ready notification should not store
  // the salary figure").
  { id: "salaryAmount", label: "Salary Amount", classification: "L3" },
  { id: "bankAccountNumber", label: "Bank Account Number", classification: "L4" },
  { id: "performanceRating", label: "Performance Rating", classification: "L3" },
  { id: "medicalNote", label: "Medical/Grievance Note", classification: "L4" },
];

let _nextTemplateId = 8;
export function generateTemplateId() {
  return `TPL-${String(_nextTemplateId++).padStart(4, "0")}`;
}

export const RAW_TEMPLATES = [
  { id: "TPL-0001", name: "Leave Approved", category: "Leave Approved", body: "Hi {{employeeName}}, your {{leaveType}} request for {{leaveDates}} has been approved.", status: "Active", createdBy: "Priya Iyer (HR)" },
  { id: "TPL-0002", name: "Payslip Ready", category: "Payslip Ready", body: "Hi {{employeeName}}, your payslip for {{payslipMonth}} is ready. {{payslipLink}}", status: "Active", createdBy: "Priya Iyer (HR)" },
  { id: "TPL-0003", name: "Ticket Resolved", category: "Ticket Resolved", body: "Hi {{employeeName}}, your ticket {{ticketId}} has been resolved. Log in to view details.", status: "Active", createdBy: "Priya Iyer (HR)" },
  { id: "TPL-0004", name: "Policy Published", category: "Policy Published", body: "A new version of {{policyTitle}} has been published. Please review and acknowledge.", status: "Active", createdBy: "Priya Iyer (HR)" },
  { id: "TPL-0005", name: "New Device Login", category: "New Device Login", body: "A new login to your account was detected from {{deviceInfo}} at {{loginTime}}. If this wasn't you, contact IT immediately.", status: "Active", createdBy: "Admin" },
  { id: "TPL-0006", name: "Compliance Training Due", category: "Compliance Training Due", body: "Hi {{employeeName}}, your {{courseName}} training is due on {{dueDate}}.", status: "Active", createdBy: "Priya Iyer (HR)" },
  // Left in a blocked state on purpose — an earlier save attempt tried to
  // merge a raw salary figure and the linter rejected it at save time.
  { id: "TPL-0007", name: "Payslip Ready — Draft v2", category: "Payslip Ready", body: "Hi {{employeeName}}, your payslip of {{salaryAmount}} for {{payslipMonth}} is ready.", status: "Blocked — failed linting", createdBy: "Priya Iyer (HR)" },
];

export const CHANNEL_INTEGRATIONS = [
  { channel: "Email", status: "Connected", lastChecked: "2026-08-01T06:00:00" },
  { channel: "SMS", status: "Connected", lastChecked: "2026-08-01T06:00:00" },
  { channel: "WhatsApp", status: "Connected", lastChecked: "2026-08-01T06:00:00" },
  { channel: "Push", status: "Connected", lastChecked: "2026-08-01T06:00:00" },
  { channel: "Teams", status: "Connected", lastChecked: "2026-08-01T06:00:00" },
  { channel: "Slack", status: "Not Configured", lastChecked: null },
  { channel: "In-app", status: "Connected", lastChecked: "2026-08-01T06:00:00" }, // never goes down — it's the fallback
];

/**
 * CURRENT_USER's channel preference per category. "New Device Login" is
 * deliberately fully opted-out ([]) to demonstrate that security-critical
 * categories bypass this entirely (spec DoD requirement).
 */
export const USER_PREFERENCES = {
  "Leave Approved": ["Email", "In-app"],
  "Payslip Ready": ["Email"],
  "Ticket Resolved": ["In-app"],
  "Policy Published": ["Email", "In-app"],
  "New Device Login": [], // opted out of everything — should still get Email + In-app
  "Compliance Training Due": ["Push", "In-app"],
  "Expense Approved": ["In-app"],
  "Onboarding Reminder": ["Email", "In-app"],
};

export const RAW_INBOX = [
  { id: "N1", title: "Leave Approved", body: "Your Casual Leave request for 12–13 Aug has been approved.", category: "Leave Approved", read: false, timestamp: "2026-07-31T15:20:00", link: "/leave" },
  { id: "N2", title: "Payslip Ready", body: "Your payslip for July 2026 is ready. View it in Payroll.", category: "Payslip Ready", read: false, timestamp: "2026-07-31T09:05:00", link: "/payroll" },
  { id: "N3", title: "Ticket Resolved", body: "Your ticket TCK-0003 has been resolved.", category: "Ticket Resolved", read: true, timestamp: "2026-07-29T11:40:00", link: "/helpdesk" },
  { id: "N4", title: "Policy Published", body: "A new version of Information Security Policy has been published. Please review and acknowledge.", category: "Policy Published", read: true, timestamp: "2026-07-16T09:00:00", link: "/policies" },
];

export const RAW_LOG = [
  { id: "L1", recipientId: "EMP014", recipientName: "Ananya Verma", category: "Leave Approved", channel: "Email", status: "Delivered", attempt: 1, timestamp: "2026-07-31T15:20:02", templateId: "TPL-0001" },
  { id: "L2", recipientId: "EMP014", recipientName: "Ananya Verma", category: "Leave Approved", channel: "In-app", status: "Delivered", attempt: 1, timestamp: "2026-07-31T15:20:00", templateId: "TPL-0001" },
  { id: "L3", recipientId: "EMP014", recipientName: "Ananya Verma", category: "Payslip Ready", channel: "Email", status: "Delivered", attempt: 1, timestamp: "2026-07-31T09:05:03", templateId: "TPL-0002" },
  { id: "L4", recipientId: "EMP014", recipientName: "Ananya Verma", category: "Ticket Resolved", channel: "In-app", status: "Delivered", attempt: 1, timestamp: "2026-07-29T11:40:00", templateId: "TPL-0003" },
];