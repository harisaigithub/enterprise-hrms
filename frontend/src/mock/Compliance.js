/**
 * Mock data — Compliance 
 *
 * Case file contents here are deliberately minimal and administrative only
 * (case number, status, dates, named investigators) — no names of parties
 * involved, no descriptions of alleged conduct. The point of this module's
 * mock is to demonstrate the *access control mechanism* around case files,
 * not to simulate sensitive case content.
 */

export const OBLIGATION_CATEGORIES = ["PF Filing", "ESI Filing", "TDS Filing", "POSH Training Review", "Policy Acknowledgement Review", "Other Statutory"];

export const obligationStatusMeta = {
  Pending: { color: "#0284c7", bg: "#f0f9ff" },
  Overdue: { color: "#dc2626", bg: "#fef2f2" },
  Filed: { color: "#16a34a", bg: "#f0fdf4" },
  Completed: { color: "#16a34a", bg: "#f0fdf4" },
};

export const caseStatusMeta = {
  "Under Investigation": { color: "#d97706", bg: "#fffbeb" },
  "Closed — Resolved": { color: "#16a34a", bg: "#f0fdf4" },
  "Closed — Withdrawn": { color: "#64748b", bg: "#f1f5f9" },
};

export const severityMeta = {
  info: { color: "#0284c7", bg: "#f0f9ff" },
  warning: { color: "#d97706", bg: "#fffbeb" },
  critical: { color: "#dc2626", bg: "#fef2f2" },
};

// Stand-in actor directory. Note "Alice Quinn" is a Manager deliberately
// included here (not on any case's investigator list) so the access-control
// self-test below has a real "should be denied" case to check against.
export const complianceActors = [
  { id: "EMP007", name: "Neha Kapoor", role: "HR-Compliance" },
  { id: "EMP008", name: "Farah Sheikh", role: "HR-Compliance" },
  { id: "SYS-AUD01", name: "Priya Rao (External Auditor)", role: "Auditor" },
  { id: "EMP002", name: "Alice Quinn", role: "Manager" },
];

let obligations = [
  { id: "ob1", title: "Monthly PF Filing", category: "PF Filing", dueDate: "2026-08-15", owner: "Neha Kapoor", status: "Pending", recurring: "Monthly" },
  { id: "ob2", title: "Monthly ESI Filing", category: "ESI Filing", dueDate: "2026-08-15", owner: "Neha Kapoor", status: "Pending", recurring: "Monthly" },
  { id: "ob3", title: "TDS Quarterly Filing", category: "TDS Filing", dueDate: "2026-07-31", owner: "Neha Kapoor", status: "Overdue", recurring: "Quarterly" },
  { id: "ob4", title: "Annual POSH Training Completion Review", category: "POSH Training Review", dueDate: "2026-09-01", owner: "Farah Sheikh", status: "Pending", recurring: "Annual" },
  { id: "ob5", title: "Policy Acknowledgement Sweep — Q3", category: "Policy Acknowledgement Review", dueDate: "2026-07-28", owner: "Farah Sheikh", status: "Overdue", recurring: "Quarterly" },
];

// 24.4/24.6: case files are L4, restricted to a named, minimal investigator
// set. `summary` is intentionally administrative/generic — never a
// description of alleged conduct.
let complianceCases = [
  {
    id: "case1", caseNumber: "PC-2026-014", category: "Workplace Conduct",
    status: "Under Investigation", openedAt: "2026-07-10", closedAt: null,
    investigatorIds: ["EMP007", "EMP008"],
    retentionUntil: "2034-07-10",
    legalHold: false, legalHoldReason: null, legalHoldBy: null,
    summary: "Workplace conduct complaint received via restricted intake channel; investigation in progress.",
  },
  {
    id: "case2", caseNumber: "PC-2025-009", category: "Workplace Conduct",
    status: "Closed — Resolved", openedAt: "2025-11-02", closedAt: "2026-01-20",
    investigatorIds: ["EMP007"],
    retentionUntil: "2033-01-20",
    legalHold: true, legalHoldReason: "Pending related litigation.", legalHoldBy: "Neha Kapoor",
    summary: "Case closed following investigation; retained under legal hold pending related litigation.",
  },
];

// 24.5 step 5 / 24.8: retention/purge candidates pulled from other modules.
// `classification` reflects whether the record's data fields carry a
// recognized sensitivity tag (Section 1.1) — "Unclassified" means a
// customization added a field without one, which the job must not act on.
let retentionRecords = [
  { id: "rt1", sourceModule: "Module 3 — Recruitment", recordType: "Candidate application (rejected)", label: "Candidate record — Req1 pool", retentionExpiresAt: "2026-07-01", classification: "Recognized", legalHold: false, legalHoldReason: null, legalHoldBy: null, jobStatus: null, purgedAt: null },
  { id: "rt2", sourceModule: "Module 2 — Employee Master", recordType: "Post-exit employee document", label: "Exit documents — separated employee", retentionExpiresAt: "2026-06-15", classification: "Recognized", legalHold: true, legalHoldReason: "Pending wrongful-termination claim.", legalHoldBy: "Neha Kapoor", jobStatus: null, purgedAt: null },
  { id: "rt3", sourceModule: "Module 12 — Assets", recordType: "Custom field (added via customization)", label: "Custom asset note field — no classification tag", retentionExpiresAt: "2026-06-01", classification: "Unclassified", legalHold: false, legalHoldReason: null, legalHoldBy: null, jobStatus: null, purgedAt: null },
  { id: "rt4", sourceModule: "Module 3 — Recruitment", recordType: "Candidate application (rejected)", label: "Candidate record — Req2 pool", retentionExpiresAt: "2026-12-01", classification: "Recognized", legalHold: false, legalHoldReason: null, legalHoldBy: null, jobStatus: null, purgedAt: null },
];

// 24.5 step 4: a read-only, filterable surface over other modules' audit
// trails. Only masked references to sensitive values are ever stored here —
// never the underlying L4 plaintext.
let systemAuditFeed = [
  { id: "sf1", timestamp: "2026-07-15T10:00:00", actor: "Alice Quinn", module: "Module 2 — Employee Master", field: "Bank Account Number", action: "Changed", maskedValue: "•••• 4821", employeeRef: "EMP004" },
  { id: "sf2", timestamp: "2026-07-20T14:30:00", actor: "Matsya Singh", module: "Module 25 — Security", field: "Role Permission", action: "Granted", maskedValue: null, employeeRef: null },
  { id: "sf3", timestamp: "2026-06-05T09:15:00", actor: "Gary Chen", module: "Module 2 — Employee Master", field: "Bank Account Number", action: "Changed", maskedValue: "•••• 1190", employeeRef: "EMP004" },
  { id: "sf4", timestamp: "2026-05-22T11:45:00", actor: "Alice Quinn", module: "Module 7 — Payroll", field: "Salary Structure", action: "Changed", maskedValue: null, employeeRef: "EMP006" },
];

let complianceAuditLog = [];

function _appendComplianceAudit(actor, action, category, details, severity = "info") {
  const entry = { id: `cal-${Date.now()}-${complianceAuditLog.length}`, timestamp: new Date().toISOString(), actor, action, category, details, severity };
  complianceAuditLog = [entry, ...complianceAuditLog];
  return entry;
}

/* ---------------- Compliance Calendar / Filings ---------------- */

export function _getObligations() {
  return obligations;
}

export function _addObligation({ title, category, dueDate, owner, recurring }, by) {
  const obligation = { id: `ob-${Date.now()}`, title, category, dueDate, owner, status: "Pending", recurring };
  obligations = [obligation, ...obligations];
  _appendComplianceAudit(by, "Obligation added", "Calendar", `Added "${title}" (${category}), due ${dueDate}.`);
  return obligation;
}

export function _markObligationFiled(id, by) {
  const ob = obligations.find((o) => o.id === id);
  if (!ob) return { error: "Obligation not found." };
  const newStatus = ob.category === "POSH Training Review" || ob.category === "Policy Acknowledgement Review" ? "Completed" : "Filed";
  obligations = obligations.map((o) => (o.id === id ? { ...o, status: newStatus } : o));
  _appendComplianceAudit(by, "Obligation marked filed/completed", "Calendar", `"${ob.title}" marked ${newStatus}.`);
  return { obligation: obligations.find((o) => o.id === id) };
}

/* ---------------- Compliance Cases (POSH) ---------------- */

// Safe for broad HR-Compliance visibility: status/hold only, never the
// investigator list or any content — used for dashboard aggregates and the
// case list view before a specific case is opened.
export function _getCaseSummaries() {
  return complianceCases.map((c) => ({ id: c.id, caseNumber: c.caseNumber, category: c.category, status: c.status, legalHold: c.legalHold }));
}

// 24.6: enforced here — the service layer, not the UI — so hiding a button
// in the frontend is never the only thing standing between an unauthorized
// role and case content.
export function _getCaseDetail(caseId, actorId) {
  const kase = complianceCases.find((c) => c.id === caseId);
  if (!kase) return { error: "Case not found." };
  if (!kase.investigatorIds.includes(actorId)) {
    _appendComplianceAudit(actorId, "Case access denied", "Compliance Case", `Access denied to ${kase.caseNumber} — actor is not on the named investigator list.`, "warning");
    return { error: `Access denied — you are not a named investigator on ${kase.caseNumber}. This is enforced at the service layer, not just hidden in navigation.` };
  }
  return { case: kase };
}

export function _applyCaseLegalHold(caseId, reason, actorId) {
  const access = _getCaseDetail(caseId, actorId);
  if (access.error) return access;
  if (!reason.trim()) return { error: "A reason is required to apply a legal hold." };
  complianceCases = complianceCases.map((c) => (c.id === caseId ? { ...c, legalHold: true, legalHoldReason: reason.trim(), legalHoldBy: actorId } : c));
  const kase = complianceCases.find((c) => c.id === caseId);
  _appendComplianceAudit(actorId, "Legal hold applied", "Legal Hold", `Legal hold applied to ${kase.caseNumber} — reason: "${reason.trim()}".`, "warning");
  return { case: kase };
}

export function _clearCaseLegalHold(caseId, actorId) {
  const access = _getCaseDetail(caseId, actorId);
  if (access.error) return access;
  complianceCases = complianceCases.map((c) => (c.id === caseId ? { ...c, legalHold: false, legalHoldReason: null, legalHoldBy: null } : c));
  const kase = complianceCases.find((c) => c.id === caseId);
  _appendComplianceAudit(actorId, "Legal hold cleared", "Legal Hold", `Legal hold cleared on ${kase.caseNumber}.`, "warning");
  return { case: kase };
}

// 24.10: "provably restricted... API-level test, not UI-only" — this
// function runs the actual access-check logic above against a few actor
// IDs and asserts the expected allow/deny outcome, independent of anything
// rendered on screen.
export function _runCaseAccessSelfTest() {
  const results = [];

  const allowed = _getCaseDetail("case1", "EMP007");
  results.push({ test: "Named investigator (Neha Kapoor) can access case1", pass: !!allowed.case });

  const deniedManager = _getCaseDetail("case1", "EMP002");
  results.push({ test: "Manager not on the investigator list is denied access to case1", pass: !!deniedManager.error });

  const deniedAuditor = _getCaseDetail("case1", "SYS-AUD01");
  results.push({ test: "Auditor without a specific case grant is denied case1 detail", pass: !!deniedAuditor.error });

  const allowedCase2 = _getCaseDetail("case2", "EMP007");
  results.push({ test: "Named investigator (Neha Kapoor) can access case2", pass: !!allowedCase2.case });

  const deniedCase2 = _getCaseDetail("case2", "EMP008");
  results.push({ test: "Farah Sheikh (not on case2's list) is denied access to case2", pass: !!deniedCase2.error });

  return { allPass: results.every((r) => r.pass), results };
}

/* ---------------- Retention & Legal Hold ---------------- */

export function _getRetentionRecords() {
  return retentionRecords;
}

export function _applyRecordLegalHold(recordId, reason, by) {
  const record = retentionRecords.find((r) => r.id === recordId);
  if (!record) return { error: "Record not found." };
  if (!reason.trim()) return { error: "A reason is required to apply a legal hold." };
  retentionRecords = retentionRecords.map((r) => (r.id === recordId ? { ...r, legalHold: true, legalHoldReason: reason.trim(), legalHoldBy: by } : r));
  _appendComplianceAudit(by, "Legal hold applied", "Legal Hold", `Legal hold applied to record "${record.label}" — reason: "${reason.trim()}".`, "warning");
  return { record: retentionRecords.find((r) => r.id === recordId) };
}

export function _clearRecordLegalHold(recordId, by) {
  const record = retentionRecords.find((r) => r.id === recordId);
  if (!record) return { error: "Record not found." };
  retentionRecords = retentionRecords.map((r) => (r.id === recordId ? { ...r, legalHold: false, legalHoldReason: null, legalHoldBy: null } : r));
  _appendComplianceAudit(by, "Legal hold cleared", "Legal Hold", `Legal hold cleared on record "${record.label}".`, "warning");
  return { record: retentionRecords.find((r) => r.id === recordId) };
}

// 24.6/24.8: legal hold always blocks purge regardless of expiry, and an
// unclassified field is always skipped + flagged rather than deleted
// unsafely or left silently un-actioned.
export function _runRetentionJob(by) {
  const today = new Date().toISOString().slice(0, 10);
  const results = { purged: [], blockedByHold: [], needsReview: [], notDue: [] };

  retentionRecords = retentionRecords.map((r) => {
    if (r.retentionExpiresAt > today) {
      results.notDue.push(r.id);
      return r;
    }
    if (r.legalHold) {
      results.blockedByHold.push(r.id);
      return { ...r, jobStatus: "Blocked by Legal Hold" };
    }
    if (r.classification === "Unclassified") {
      results.needsReview.push(r.id);
      return { ...r, jobStatus: "Needs Manual Classification Review" };
    }
    results.purged.push(r.id);
    return { ...r, jobStatus: "Purged", purgedAt: today };
  });

  _appendComplianceAudit(
    by, "Retention job run", "Retention",
    `Retention job: ${results.purged.length} purged, ${results.blockedByHold.length} blocked by legal hold, ${results.needsReview.length} flagged for manual review, ${results.notDue.length} not yet due.`
  );
  return results;
}

/* ---------------- Audit feed (cross-module, read-only) ---------------- */

export function _queryAuditFeed({ moduleFilter = "", fieldFilter = "", fromDate = "", toDate = "" } = {}) {
  return systemAuditFeed.filter((entry) => {
    if (moduleFilter && entry.module !== moduleFilter) return false;
    if (fieldFilter && entry.field !== fieldFilter) return false;
    if (fromDate && entry.timestamp.slice(0, 10) < fromDate) return false;
    if (toDate && entry.timestamp.slice(0, 10) > toDate) return false;
    return true;
  });
}

export function _getComplianceAuditLog() {
  return complianceAuditLog;
}

/* ---------------- Dashboard aggregation ---------------- */

// 24.5 step 6: feeds the HR Dashboard's "Compliance Alerts" widget (Module
// 1) — counts only, case details never surface here.
export function _getDashboardSummary() {
  const today = new Date().toISOString().slice(0, 10);
  const overdueObligations = obligations.filter((o) => o.status !== "Filed" && o.status !== "Completed" && o.dueDate < today).length;
  const openCases = complianceCases.filter((c) => !c.status.startsWith("Closed")).length;
  const legalHoldsActive = complianceCases.filter((c) => c.legalHold).length + retentionRecords.filter((r) => r.legalHold).length;
  const needsClassificationReview = retentionRecords.filter((r) => r.classification === "Unclassified").length;
  return { overdueObligations, openCases, legalHoldsActive, needsClassificationReview };
}