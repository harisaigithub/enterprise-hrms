/**
 * Mock data + engine — Workflow Engine (Module 21)
 *
 * The engine only ever sees minimal attributes it needs to resolve
 * conditions (e.g. duration_days, amount) — never the full sensitive
 * record from the originating module (21.7, data minimization).
 */

export const definitionStatusMeta = {
  Active: { color: "#16a34a", bg: "#f0fdf4" },
  Inactive: { color: "#64748b", bg: "#f1f5f9" },
};

export const instanceStatusMeta = {
  "In Progress": { color: "#0284c7", bg: "#f0f9ff" },
  Approved: { color: "#16a34a", bg: "#f0fdf4" },
  Rejected: { color: "#dc2626", bg: "#fef2f2" },
  "Approver Resolution Failed": { color: "#dc2626", bg: "#fef2f2" },
};

export const APPROVER_RULES = [
  "Direct Reporting Manager",
  "Department Head",
  "Named Role: Finance",
  "Named Role: HR",
];

// A small standalone roster for this module's demo — EMP008 deliberately has
// no manager (data gap demo), EMP009 is flagged as its own manager (data
// anomaly demo for the self-approval hard-block).
const ROSTER = [
  { id: "EMP001", name: "Matsya Singh", managerId: "EMP005", department: "Engineering" },
  { id: "EMP002", name: "vijay mudgal", managerId: "EMP007", department: "Product" },
  { id: "EMP003", name: "Vikas Agarwal", managerId: "EMP002", department: "Design" },
  { id: "EMP004", name: "Gary Chen", managerId: "EMP005", department: "Engineering" },
  { id: "EMP005", name: "Alice Quinn", managerId: "EMP007", department: "Engineering" },
  { id: "EMP006", name: "James Sullivan", managerId: "EMP005", department: "Analytics" },
  { id: "EMP007", name: "Viki Vance", managerId: null, department: "Product" },
  { id: "EMP008", name: "Kirk Wilson", managerId: null, department: "Human Resources" }, // no manager on file — resolution-failure demo
  { id: "EMP009", name: "Data-Anomaly Test User", managerId: "EMP009", department: "Engineering" }, // flagged as own manager — self-approval demo
];

const DEPARTMENT_HEADS = { Engineering: "EMP005", Product: "EMP007", Design: "EMP002", Analytics: "EMP005", "Human Resources": "EMP008" };
const NAMED_ROLES = { "Named Role: Finance": { id: "role-finance", name: "Finance Approver" }, "Named Role: HR": { id: "role-hr", name: "HR Approver" } };

let definitions = [
  {
    id: "wf1",
    requestType: "Leave Request — Extended",
    steps: [
      { id: "s1", name: "Manager Approval", approverRule: "Direct Reporting Manager", slaHours: 24, parallelGroup: null, condition: null },
      { id: "s2", name: "Second-Level Approval", approverRule: "Department Head", slaHours: 24, parallelGroup: null, condition: { field: "duration_days", operator: ">", value: 5 } },
    ],
    status: "Active",
    createdAt: "2026-01-10",
  },
  {
    id: "wf2",
    requestType: "Job Requisition",
    steps: [
      { id: "s3", name: "Hiring Manager Sign-off", approverRule: "Direct Reporting Manager", slaHours: 48, parallelGroup: "A", condition: null },
      { id: "s4", name: "Finance Sign-off", approverRule: "Named Role: Finance", slaHours: 48, parallelGroup: "A", condition: null },
    ],
    status: "Active",
    createdAt: "2026-02-01",
  },
  {
    id: "wf3",
    requestType: "Salary Change",
    steps: [
      { id: "s5", name: "Manager Approval", approverRule: "Direct Reporting Manager", slaHours: 24, parallelGroup: null, condition: null },
      { id: "s6", name: "Finance Approval (over band only)", approverRule: "Named Role: Finance", slaHours: 24, parallelGroup: null, condition: { field: "amount", operator: ">", value: 2000000 } },
    ],
    status: "Active",
    createdAt: "2026-02-15",
  },
];

let instances = [];
let eventLog = [];

function logEvent(type, detail) {
  eventLog = [{ id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, detail, at: new Date().toISOString() }, ...eventLog];
}

function resolveOne(rule, requesterId) {
  const requester = ROSTER.find((r) => r.id === requesterId);
  if (rule === "Direct Reporting Manager") {
    if (!requester.managerId) return { error: `Direct Reporting Manager could not be resolved for ${requester.name} — no manager on file.` };
    return { approverId: requester.managerId, approverName: ROSTER.find((r) => r.id === requester.managerId)?.name };
  }
  if (rule === "Department Head") {
    const headId = DEPARTMENT_HEADS[requester.department];
    if (!headId) return { error: `No Department Head configured for ${requester.department}.` };
    return { approverId: headId, approverName: ROSTER.find((r) => r.id === headId)?.name };
  }
  if (NAMED_ROLES[rule]) {
    return { approverId: NAMED_ROLES[rule].id, approverName: NAMED_ROLES[rule].name };
  }
  return { error: `Unknown approver rule: ${rule}` };
}

// Golden Rule #5: an approver can never be the requester, even if the
// resolved chain technically places them there due to a data anomaly.
// Instead of rejecting, the engine auto-escalates one level further up.
function resolveWithSelfApprovalGuard(rule, requesterId) {
  let resolved = resolveOne(rule, requesterId);
  if (resolved.error) return resolved;
  if (resolved.approverId === requesterId) {
    const requester = ROSTER.find((r) => r.id === requesterId);
    const nextUp = requester.managerId && requester.managerId !== requesterId ? requester.managerId : null;
    // walk further up if even the "next" manager is still the requester (deeper anomaly)
    let candidate = nextUp;
    let guard = 0;
    while (candidate === requesterId && guard < 5) {
      const person = ROSTER.find((r) => r.id === candidate);
      candidate = person?.managerId || null;
      guard += 1;
    }
    if (!candidate) {
      return { error: `Self-approval blocked for ${requester.name}, and no valid next-level approver could be found — flagged for manual assignment.` };
    }
    return { approverId: candidate, approverName: ROSTER.find((r) => r.id === candidate)?.name, selfApprovalBlocked: true, originalResolvedId: requesterId };
  }
  return resolved;
}

function conditionPasses(condition, attributes) {
  if (!condition) return true;
  const value = attributes[condition.field];
  if (value === undefined) return true; // missing attribute -> step not applicable
  if (condition.operator === ">") return value > condition.value;
  if (condition.operator === ">=") return value >= condition.value;
  if (condition.operator === "<") return value < condition.value;
  return true;
}

export function _getRoster() { return ROSTER; }
export function _getDefinitions() { return definitions; }
export function _addDefinition(def) { definitions = [def, ...definitions]; return def; }
export function _deactivateDefinition(id) {
  definitions = definitions.map((d) => (d.id === id ? { ...d, status: "Inactive" } : d));
  return definitions.find((d) => d.id === id);
}
export function _deleteDefinition(id) {
  const referenced = instances.some((i) => i.definitionId === id && ["In Progress", "Approver Resolution Failed"].includes(i.status));
  if (referenced) return { error: "Cannot delete — active workflow instances still reference this definition. Deactivate it instead; in-flight instances will complete against their original version." };
  definitions = definitions.filter((d) => d.id !== id);
  return { deleted: true };
}

export function _getInstances() { return instances; }
export function _getEventLog() { return eventLog; }

export function _submitRequest(definitionId, requesterId, attributes) {
  const def = definitions.find((d) => d.id === definitionId);
  if (!def || def.status !== "Active") return { error: "No active workflow definition for this request type." };
  const requester = ROSTER.find((r) => r.id === requesterId);

  const applicableSteps = def.steps.filter((s) => conditionPasses(s.condition, attributes));
  let resolutionFailure = null;
  const resolvedSteps = applicableSteps.map((s) => {
    const resolved = resolveWithSelfApprovalGuard(s.approverRule, requesterId);
    if (resolved.error && !resolutionFailure) resolutionFailure = `Step "${s.name}": ${resolved.error}`;
    return {
      stepId: s.id,
      name: s.name,
      approverRule: s.approverRule,
      parallelGroup: s.parallelGroup,
      slaHours: s.slaHours,
      approverId: resolved.error ? null : resolved.approverId,
      approverName: resolved.error ? null : resolved.approverName,
      selfApprovalBlocked: !!resolved.selfApprovalBlocked,
      escalatedTo: null,
      escalatedToName: null,
      status: resolved.error ? "Unresolved" : "Pending",
      startedAt: new Date().toISOString(),
      actedBy: null,
      actedByName: null,
      actedAt: null,
      rejectionReason: null,
    };
  });

  const instance = {
    id: `wi-${Date.now()}`,
    definitionId,
    requestType: def.requestType,
    requesterId,
    requesterName: requester?.name || requesterId,
    attributes,
    steps: resolvedSteps,
    currentStepIndex: 0,
    status: resolutionFailure ? "Approver Resolution Failed" : "In Progress",
    resolutionFailure,
    createdAt: new Date().toISOString(),
  };
  instances = [instance, ...instances];
  logEvent(`${def.requestType}.submitted`, `${requester?.name} submitted a request${resolutionFailure ? " — approver resolution failed, held for HR" : ""}.`);
  return { instance };
}

function currentGroupSteps(instance) {
  const step = instance.steps[instance.currentStepIndex];
  if (!step) return [];
  if (!step.parallelGroup) return [step];
  return instance.steps.filter((s) => s.parallelGroup === step.parallelGroup);
}

export function _actOnStep(instanceId, actingApproverId, actingApproverName, action, reason) {
  const instance = instances.find((i) => i.id === instanceId);
  if (!instance) return { error: "Instance not found." };
  if (instance.status !== "In Progress") return { error: `This request is already ${instance.status}.` };

  const step = instance.steps[instance.currentStepIndex];
  const eligible = [step.approverId, step.escalatedTo].filter(Boolean);
  if (!eligible.includes(actingApproverId)) {
    return { error: `${actingApproverName} is not an eligible approver for this step.` };
  }
  if (step.status !== "Pending") {
    // double-action race: first action already won
    return { error: `Already actioned by ${step.actedByName} at ${new Date(step.actedAt).toLocaleString("en-IN")} — first action wins, no change made.` };
  }

  step.status = action === "approve" ? "Approved" : "Rejected";
  step.actedBy = actingApproverId;
  step.actedByName = actingApproverName;
  step.actedAt = new Date().toISOString();
  if (action === "reject") step.rejectionReason = reason || "";

  logEvent(`${instance.requestType}.step_${action}d`, `${actingApproverName} ${action}d "${step.name}" for ${instance.requesterName}.`);

  if (action === "reject") {
    instance.status = "Rejected";
    logEvent(`${instance.requestType}.rejected`, `Request from ${instance.requesterName} rejected at step "${step.name}".`);
    instances = instances.map((i) => (i.id === instanceId ? instance : i));
    return { instance };
  }

  const group = currentGroupSteps(instance);
  const groupComplete = group.every((s) => s.status === "Approved");
  if (groupComplete) {
    instance.currentStepIndex += group.length > 1 ? group.length : 1;
    if (instance.currentStepIndex >= instance.steps.length) {
      instance.status = "Approved";
      logEvent(`${instance.requestType}.approved`, `Request from ${instance.requesterName} fully approved.`);
    }
  }

  instances = instances.map((i) => (i.id === instanceId ? instance : i));
  return { instance };
}

// SLA scanner: escalates overdue Pending steps without removing the original
// approver's ability to act — both become eligible, first action wins.
export function _runSlaCheck(nowOverrideMs) {
  const now = nowOverrideMs || Date.now();
  let escalatedCount = 0;
  instances = instances.map((instance) => {
    if (instance.status !== "In Progress") return instance;
    const step = instance.steps[instance.currentStepIndex];
    if (!step || step.status !== "Pending" || step.escalatedTo) return instance;
    const elapsedHours = (now - new Date(step.startedAt).getTime()) / 3600000;
    if (elapsedHours < step.slaHours) return instance;
    const original = ROSTER.find((r) => r.id === step.approverId);
    const escalateTo = original?.managerId && original.managerId !== step.approverId ? original.managerId : "role-hr";
    step.escalatedTo = escalateTo;
    step.escalatedToName = escalateTo === "role-hr" ? "HR Escalation Contact" : ROSTER.find((r) => r.id === escalateTo)?.name;
    escalatedCount += 1;
    logEvent(`${instance.requestType}.escalated`, `Step "${step.name}" for ${instance.requesterName} escalated to ${step.escalatedToName} (SLA of ${step.slaHours}h exceeded); ${step.approverName} can still act.`);
    return instance;
  });
  return { escalatedCount };
}

export function _manuallyAssignApprover(instanceId, approverId, approverName) {
  const instance = instances.find((i) => i.id === instanceId);
  if (!instance) return { error: "Instance not found." };
  const step = instance.steps.find((s) => s.status === "Unresolved");
  if (!step) return { error: "No unresolved step found on this instance." };
  step.approverId = approverId;
  step.approverName = approverName;
  step.status = "Pending";
  step.startedAt = new Date().toISOString();
  instance.status = "In Progress";
  instance.resolutionFailure = null;
  instances = instances.map((i) => (i.id === instanceId ? instance : i));
  logEvent(`${instance.requestType}.approver_manually_assigned`, `HR manually assigned ${approverName} after resolution failure for ${instance.requesterName}'s request.`);
  return { instance };
}