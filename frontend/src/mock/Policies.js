/**
 * Mock data — Policy Management 
 */

export const policyStatusMeta = {
  Draft: { color: "#64748b", bg: "#f1f5f9" },
  Published: { color: "#16a34a", bg: "#f0fdf4" },
  Archived: { color: "#64748b", bg: "#f1f5f9" },
};

export const ackStatusMeta = {
  "Not Acknowledged": { color: "#64748b", bg: "#f1f5f9" },
  Acknowledged: { color: "#16a34a", bg: "#f0fdf4" },
  Overdue: { color: "#dc2626", bg: "#fef2f2" },
};

const ME_ID = "EMP001";
const ME_NAME = "Matsya Singh";

// All versions are retained forever once created — never overwritten or deleted.
let policies = [
  {
    id: "pol1",
    title: "Code of Conduct",
    category: "Conduct",
    scope: "Company-wide",
    mandatoryAcknowledgement: true,
    reviewCycleMonths: 12,
    status: "Published",
    currentVersionId: "v2",
    nextReviewDate: "2027-01-01",
    versions: [
      { id: "v1", versionNumber: 1, effectiveDate: "2025-01-01", ackDeadlineDays: 14, requiresReacknowledgement: true, summary: "Initial version.", createdAt: "2024-12-20", createdBy: "lewis hamilton" },
      { id: "v2", versionNumber: 2, effectiveDate: "2026-01-01", ackDeadlineDays: 14, requiresReacknowledgement: true, summary: "Added remote-work conduct clause.", createdAt: "2025-12-15", createdBy: "lewis hamilton" },
    ],
  },
  {
    id: "pol2",
    title: "IT & Security Policy",
    category: "IT & Security",
    scope: "Company-wide",
    mandatoryAcknowledgement: true,
    reviewCycleMonths: 12,
    status: "Published",
    currentVersionId: "v1",
    nextReviewDate: "2027-02-01",
    versions: [
      { id: "v1", versionNumber: 1, effectiveDate: "2026-02-01", ackDeadlineDays: 10, requiresReacknowledgement: true, summary: "Initial version — password policy, device usage, data handling.", createdAt: "2026-01-20", createdBy: "lewis hamilton" },
    ],
  },
  {
    id: "pol3",
    title: "Leave Policy",
    category: "HR",
    scope: "Company-wide",
    mandatoryAcknowledgement: false,
    reviewCycleMonths: 12,
    status: "Published",
    currentVersionId: "v1",
    nextReviewDate: "2027-03-01",
    versions: [
      { id: "v1", versionNumber: 1, effectiveDate: "2026-03-01", ackDeadlineDays: null, requiresReacknowledgement: false, summary: "Earned, sick, casual, and compensatory leave rules.", createdAt: "2026-02-15", createdBy: "lewis hamilton" },
    ],
  },
  {
    id: "pol4",
    title: "Delhi Office Safety Policy",
    category: "Safety",
    scope: "Location: Delhi",
    mandatoryAcknowledgement: true,
    reviewCycleMonths: 24,
    status: "Draft",
    currentVersionId: "v1",
    nextReviewDate: null,
    versions: [
      { id: "v1", versionNumber: 1, effectiveDate: null, ackDeadlineDays: null, requiresReacknowledgement: true, summary: "Fire safety, emergency exits, first-aid contacts for the Delhi office.", createdAt: "2026-07-28", createdBy: "lewis hamilton" },
    ],
  },
];

// One row per (policyId, versionId, employeeId). Acknowledging an old version
// never counts toward a newer version that requires re-acknowledgement.
let acknowledgements = [
  { id: "ack1", policyId: "pol1", versionId: "v1", employeeId: ME_ID, employeeName: ME_NAME, acknowledgedAt: "2025-01-05", device: "Chrome / Windows" },
  { id: "ack2", policyId: "pol1", versionId: "v2", employeeId: ME_ID, employeeName: ME_NAME, acknowledgedAt: null, device: null },
  { id: "ack3", policyId: "pol2", versionId: "v1", employeeId: ME_ID, employeeName: ME_NAME, acknowledgedAt: "2026-02-03", device: "Chrome / Windows" },

  { id: "ack4", policyId: "pol1", versionId: "v2", employeeId: "EMP004", employeeName: "Gary Chen", acknowledgedAt: "2026-01-10", device: "Safari / macOS" },
  { id: "ack5", policyId: "pol1", versionId: "v2", employeeId: "EMP006", employeeName: "James Sullivan", acknowledgedAt: null, device: null },
  { id: "ack6", policyId: "pol2", versionId: "v1", employeeId: "EMP004", employeeName: "Gary Chen", acknowledgedAt: null, device: null },
  { id: "ack7", policyId: "pol2", versionId: "v1", employeeId: "EMP006", employeeName: "James Sullivan", acknowledgedAt: "2026-02-05", device: "Edge / Windows" },
];

export function _getPolicies() { return policies; }

export function _createPolicy(policy) { policies = [policy, ...policies]; return policy; }

// New version always appended — prior versions stay in the array untouched.
export function _addVersion(policyId, version) {
  policies = policies.map((p) => (p.id === policyId ? { ...p, versions: [...p.versions, version], currentVersionId: version.id, status: "Draft" } : p));
  return policies.find((p) => p.id === policyId);
}

export function _publishPolicy(id) {
  const policy = policies.find((p) => p.id === id);
  if (!policy) return { error: "Policy not found" };
  const current = policy.versions.find((v) => v.id === policy.currentVersionId);
  if (!current.effectiveDate) return { error: "Set an effective date before publishing." };
  if (policy.mandatoryAcknowledgement && !current.ackDeadlineDays) return { error: "Mandatory policies need an acknowledgement deadline before publishing." };
  policies = policies.map((p) => (p.id === id ? { ...p, status: "Published" } : p));
  return { policy: policies.find((p) => p.id === id) };
}

export function _getAcknowledgements(employeeId) {
  return employeeId ? acknowledgements.filter((a) => a.employeeId === employeeId) : acknowledgements;
}

export function _acknowledgePolicy(policyId, versionId, employeeId, employeeName) {
  const existing = acknowledgements.find((a) => a.policyId === policyId && a.versionId === versionId && a.employeeId === employeeId);
  const now = new Date().toISOString().slice(0, 10);
  if (existing) {
    acknowledgements = acknowledgements.map((a) => (a.id === existing.id ? { ...a, acknowledgedAt: now, device: "Chrome / Windows" } : a));
    return acknowledgements.find((a) => a.id === existing.id);
  }
  const ack = { id: `ack-${Date.now()}`, policyId, versionId, employeeId, employeeName, acknowledgedAt: now, device: "Chrome / Windows" };
  acknowledgements = [ack, ...acknowledgements];
  return ack;
}