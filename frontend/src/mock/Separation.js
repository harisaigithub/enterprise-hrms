/**
 * Mock data — Separation Management 
 */

export const separationStatusMeta = {
  "Notice Period": { color: "#0284c7", bg: "#f0f9ff" },
  "Clearance In Progress": { color: "#d97706", bg: "#fffbeb" },
  Cleared: { color: "#7c3aed", bg: "#f5f3ff" },
  Settled: { color: "#16a34a", bg: "#f0fdf4" },
  Alumni: { color: "#64748b", bg: "#f1f5f9" },
};

export const clearanceStatusMeta = {
  Pending: { color: "#64748b", bg: "#f1f5f9" },
  Complete: { color: "#16a34a", bg: "#f0fdf4" },
  Flagged: { color: "#dc2626", bg: "#fef2f2" },
};

const CLEARANCE_TEMPLATE = [
  { owner: "IT", item: "Revoke SSO, email, VPN and HRMS access" },
  { owner: "Finance", item: "Settle outstanding advances/loans" },
  { owner: "Asset", item: "Confirm return of all assigned assets" },
  { owner: "Manager", item: "Confirm handover of ongoing work/tasks" },
  { owner: "Admin", item: "Return of physical property (ID card, keys, etc.)" },
];

let separations = [
  {
    id: "sep1",
    employeeId: "EMP006",
    employeeName: "James Sullivan",
    type: "Resignation",
    reason: "Pursuing an opportunity outside the company.",
    submittedOn: "2026-07-01",
    lastWorkingDay: "2026-08-01",
    noticePeriodDays: 31,
    status: "Clearance In Progress",
    exitInterviewCompleted: false,
    accessRevoked: false,
    settlement: null,
  },
  {
    id: "sep2",
    employeeId: "EMP009",
    employeeName: "Priya Sen",
    type: "Resignation",
    reason: "Relocating to another city.",
    submittedOn: "2026-05-15",
    lastWorkingDay: "2026-06-15",
    noticePeriodDays: 31,
    status: "Settled",
    exitInterviewCompleted: true,
    accessRevoked: true,
    settlement: {
      pendingSalary: 62000,
      leaveEncashment: 18500,
      reimbursements: 3200,
      recoveries: 0,
      netSettlement: 83700,
      approvedAt: "2026-06-20",
      override: false,
      overrideReason: "",
    },
  },
];

let clearanceItems = [
  { id: "cl1", separationId: "sep1", owner: "IT", item: "Revoke SSO, email, VPN and HRMS access", status: "Pending", notes: "", completedAt: null },
  { id: "cl2", separationId: "sep1", owner: "Finance", item: "Settle outstanding advances/loans", status: "Complete", notes: "No outstanding advances.", completedAt: "2026-07-10" },
  { id: "cl3", separationId: "sep1", owner: "Asset", item: "Confirm return of all assigned assets", status: "Flagged", notes: "Laptop not yet returned.", completedAt: null },
  { id: "cl4", separationId: "sep1", owner: "Manager", item: "Confirm handover of ongoing work/tasks", status: "Complete", notes: "Handover doc shared with team.", completedAt: "2026-07-15" },
  { id: "cl5", separationId: "sep1", owner: "Admin", item: "Return of physical property (ID card, keys, etc.)", status: "Pending", notes: "", completedAt: null },

  { id: "cl6", separationId: "sep2", owner: "IT", item: "Revoke SSO, email, VPN and HRMS access", status: "Complete", notes: "", completedAt: "2026-06-15" },
  { id: "cl7", separationId: "sep2", owner: "Finance", item: "Settle outstanding advances/loans", status: "Complete", notes: "", completedAt: "2026-06-14" },
  { id: "cl8", separationId: "sep2", owner: "Asset", item: "Confirm return of all assigned assets", status: "Complete", notes: "Laptop + access card returned, condition good.", completedAt: "2026-06-14" },
  { id: "cl9", separationId: "sep2", owner: "Manager", item: "Confirm handover of ongoing work/tasks", status: "Complete", notes: "", completedAt: "2026-06-12" },
  { id: "cl10", separationId: "sep2", owner: "Admin", item: "Return of physical property (ID card, keys, etc.)", status: "Complete", notes: "", completedAt: "2026-06-14" },
];

// Restricted: HR only. The UI layer must never surface this to Manager/Auditor
// roles by default — only that an interview occurred (see separations[].exitInterviewCompleted).
let exitInterviews = [
  {
    id: "ei2",
    separationId: "sep2",
    responses: [
      { q: "Primary reason for leaving?", a: "Relocation — spouse's job transfer." },
      { q: "Would you recommend this company to a friend?", a: "Yes." },
      { q: "Anything the company could have done differently?", a: "Nothing specific." },
    ],
    conductedBy: "lewis hamilton",
    conductedAt: "2026-06-10",
  },
];

let alumni = [
  { id: "al2", employeeId: "EMP009", name: "Priya Sen", role: "Data Analyst", tenure: "2 yrs 4 mo", eligibleForRehire: true, exitedOn: "2026-06-15" },
];

export function _getSeparations() { return separations; }

export function _initiateSeparation(sep) {
  separations = [sep, ...separations];
  const items = CLEARANCE_TEMPLATE.map((t, i) => ({
    id: `cl-${Date.now()}-${i}`,
    separationId: sep.id,
    owner: t.owner,
    item: t.item,
    status: "Pending",
    notes: "",
    completedAt: null,
  }));
  clearanceItems = [...clearanceItems, ...items];
  return sep;
}

export function _getClearanceItems(separationId) {
  return clearanceItems.filter((c) => c.separationId === separationId);
}

export function _updateClearanceItem(id, status, notes) {
  clearanceItems = clearanceItems.map((c) => (c.id === id ? { ...c, status, notes, completedAt: status === "Complete" ? new Date().toISOString().slice(0, 10) : null } : c));
  const item = clearanceItems.find((c) => c.id === id);
  // keep the parent separation's status in sync with clearance progress
  const siblings = clearanceItems.filter((c) => c.separationId === item.separationId);
  const allComplete = siblings.every((c) => c.status === "Complete");
  separations = separations.map((s) =>
    s.id === item.separationId ? { ...s, status: allComplete ? "Cleared" : "Clearance In Progress" } : s
  );
  return item;
}

export function _getExitInterview(separationId) {
  return exitInterviews.find((e) => e.separationId === separationId) || null;
}

export function _recordExitInterview(separationId, responses, conductedBy) {
  const interview = { id: `ei-${Date.now()}`, separationId, responses, conductedBy, conductedAt: new Date().toISOString().slice(0, 10) };
  exitInterviews = [...exitInterviews, interview];
  separations = separations.map((s) => (s.id === separationId ? { ...s, exitInterviewCompleted: true } : s));
  return interview;
}

// Hard gate: cannot settle while any clearance item is open, unless a
// documented HR override is supplied and logged.
export function _computeSettlement(separationId, breakdown, override, overrideReason) {
  const items = clearanceItems.filter((c) => c.separationId === separationId);
  const allComplete = items.every((c) => c.status === "Complete");
  if (!allComplete && !override) {
    return { error: "Clearance is not fully complete. Settlement is blocked unless a documented HR override is applied." };
  }
  const netSettlement = breakdown.pendingSalary + breakdown.leaveEncashment + breakdown.reimbursements - breakdown.recoveries;
  const settlement = {
    ...breakdown,
    netSettlement,
    approvedAt: new Date().toISOString().slice(0, 10),
    override: !allComplete && override,
    overrideReason: !allComplete && override ? overrideReason : "",
  };
  separations = separations.map((s) => (s.id === separationId ? { ...s, status: "Settled", settlement } : s));
  return { separation: separations.find((s) => s.id === separationId) };
}

// Atomic, irreversible revocation across all connected systems in one action —
// never a per-system checklist that can be partially completed.
export function _revokeAccess(separationId) {
  separations = separations.map((s) => (s.id === separationId ? { ...s, accessRevoked: true } : s));
  return separations.find((s) => s.id === separationId);
}

export function _convertToAlumni(separationId, tenure, role, eligibleForRehire) {
  const sep = separations.find((s) => s.id === separationId);
  const record = {
    id: `al-${Date.now()}`,
    employeeId: sep.employeeId,
    name: sep.employeeName,
    role,
    tenure,
    eligibleForRehire,
    exitedOn: sep.lastWorkingDay,
  };
  alumni = [record, ...alumni];
  separations = separations.map((s) => (s.id === separationId ? { ...s, status: "Alumni" } : s));
  return record;
}

export function _getAlumni() { return alumni; }