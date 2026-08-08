import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { serializeInstance, serializeDefinition } from "../../serializers/workflow.serializer";

/**
 * Workflow Engine (Module 21) — generic approval engine.
 *
 * Data minimization: the engine never stores the originating module's full
 * record. A submission only carries the attributes needed to evaluate step
 * conditions (e.g. `duration_days`, `amount`). The concrete approver chain is
 * resolved from live employee data (reporting manager / department head /
 * named role) at submission time and snapshotted onto the instance so
 * in-flight requests complete against the version they were submitted on.
 *
 * Golden Rule #5: an approver can never be the requester. If a data anomaly
 * would place the requester as their own approver, the engine auto-escalates
 * one level up instead of silently accepting a self-approval.
 */

const APPROVER_RULES = [
  "Direct Reporting Manager",
  "Department Head",
  "Named Role: Finance",
  "Named Role: HR",
] as const;

type ApproverRule = (typeof APPROVER_RULES)[number];

interface Person {
  dbId: string;
  id: string; // employee code
  name: string;
  managerId: string | null;
  departmentId: string | null;
}

const INSTANCE_INCLUDE = {
  definition: { select: { requestType: true } },
  requester: { select: { employeeCode: true, firstName: true, lastName: true } },
  steps: {
    include: { definitionStep: { select: { orderIndex: true } } },
    orderBy: { startedAt: "asc" as const },
  },
} satisfies Prisma.WorkflowInstanceInclude;

async function findPerson(code: string): Promise<Person | null> {
  const p = await prisma.employee.findUnique({
    where: { employeeCode: code },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      departmentId: true,
      reportingManager: { select: { employeeCode: true } },
    },
  });
  if (!p) return null;
  return {
    dbId: p.id,
    id: p.employeeCode,
    name: `${p.firstName} ${p.lastName}`.trim(),
    managerId: p.reportingManager?.employeeCode ?? null,
    departmentId: p.departmentId,
  };
}

async function logEvent(instanceId: string, type: string, detail: string, actorName?: string): Promise<void> {
  await prisma.workflowEvent.create({ data: { instanceId, type, detail, actorName } });
}

async function getInstance(id: string) {
  const inst = await prisma.workflowInstance.findUnique({ where: { id }, include: INSTANCE_INCLUDE });
  if (!inst) throw AppError.notFound("Workflow instance not found");
  return { data: serializeInstance(inst) };
}

type Resolution =
  | { approverId: string; approverName: string; selfApprovalBlocked?: boolean }
  | { error: string };

/** Resolve a single approver rule against live org data. */
async function resolveOne(rule: string, requester: Person): Promise<Resolution> {
  if (rule === "Direct Reporting Manager") {
    if (!requester.managerId) {
      return { error: `Direct Reporting Manager could not be resolved for ${requester.name} — no manager on file.` };
    }
    const mgr = await findPerson(requester.managerId);
    if (!mgr) {
      return { error: `Direct Reporting Manager (${requester.managerId}) could not be resolved for ${requester.name}.` };
    }
    return { approverId: mgr.id, approverName: mgr.name };
  }
  if (rule === "Department Head") {
    const head = requester.departmentId
      ? await prisma.employee.findFirst({
          where: { departmentId: requester.departmentId, isDepartmentHead: true, status: "Active" },
          select: { employeeCode: true, firstName: true, lastName: true },
        })
      : null;
    if (!head) {
      return { error: `No Department Head configured for ${requester.name}'s department.` };
    }
    return { approverId: head.employeeCode, approverName: `${head.firstName} ${head.lastName}`.trim() };
  }
  if (rule === "Named Role: Finance") {
    return { approverId: "role-finance", approverName: "Finance Approver" };
  }
  if (rule === "Named Role: HR") {
    return { approverId: "role-hr", approverName: "HR Approver" };
  }
  return { error: `Unknown approver rule: ${rule}` };
}

/**
 * Golden Rule #5 — never let the requester approve their own request. If the
 * resolved chain would place the requester (a data anomaly), walk one level up
 * the reporting line; if none can be found, flag for manual HR assignment.
 */
async function resolveWithSelfApprovalGuard(rule: string, requester: Person): Promise<Resolution> {
  const resolved = await resolveOne(rule, requester);
  if ("error" in resolved) return resolved;
  if (resolved.approverId !== requester.id) return resolved;

  let candidate = requester.managerId && requester.managerId !== requester.id ? requester.managerId : null;
  let guard = 0;
  while (candidate && candidate === requester.id && guard < 5) {
    const person = await findPerson(candidate);
    candidate = person?.managerId ?? null;
    guard += 1;
  }
  if (!candidate) {
    return {
      error: `Self-approval blocked for ${requester.name}, and no valid next-level approver could be found — flagged for manual assignment.`,
    };
  }
  const person = await findPerson(candidate);
  if (!person) return { error: `Escalation target ${candidate} could not be resolved.` };
  return { approverId: person.id, approverName: person.name, selfApprovalBlocked: true };
}

function conditionPasses(condition: unknown, attributes: Record<string, unknown>): boolean {
  if (!condition || typeof condition !== "object") return true;
  const c = condition as { field?: string; operator?: string; value?: number };
  if (!c.field) return true;
  const value = attributes[c.field];
  if (value === undefined) return true; // missing attribute -> step not applicable
  switch (c.operator) {
    case ">":
      return Number(value) > Number(c.value);
    case ">=":
      return Number(value) >= Number(c.value);
    case "<":
      return Number(value) < Number(c.value);
    case "<=":
      return Number(value) <= Number(c.value);
    default:
      return true;
  }
}

// ── Roster ────────────────────────────────────────────────────────────────

export async function getRoster() {
  const employees = await prisma.employee.findMany({
    select: {
      employeeCode: true,
      firstName: true,
      lastName: true,
      status: true,
      department: { select: { name: true } },
      reportingManager: { select: { employeeCode: true } },
    },
    orderBy: { employeeCode: "asc" },
  });
  return {
    data: employees.map((e) => ({
      id: e.employeeCode,
      name: `${e.firstName} ${e.lastName}`.trim(),
      managerId: e.reportingManager?.employeeCode ?? null,
      department: e.department?.name ?? null,
      status: e.status,
    })),
  };
}

// ── Definitions ───────────────────────────────────────────────────────────

export async function listDefinitions() {
  const defs = await prisma.workflowDefinition.findMany({
    include: { steps: { orderBy: { orderIndex: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return { data: defs.map((d) => serializeDefinition(d)) };
}

export interface WorkflowStepInput {
  name: string;
  approverRule: string;
  slaHours?: number;
  parallelGroup?: string | null;
  condition?: { field: string; operator: string; value: number } | null;
}

export interface CreateDefinitionInput {
  requestType: string;
  steps: WorkflowStepInput[];
}

export async function createDefinition(input: CreateDefinitionInput) {
  const ruleSet = new Set<string>(APPROVER_RULES);
  for (const s of input.steps) {
    if (!ruleSet.has(s.approverRule)) {
      throw AppError.badRequest(`Unknown approver rule: ${s.approverRule}`);
    }
  }
  const def = await prisma.workflowDefinition.create({
    data: {
      requestType: input.requestType,
      steps: {
        create: input.steps.map((s, i) => ({
          name: s.name,
          approverRule: s.approverRule,
          slaHours: s.slaHours ?? 24,
          parallelGroup: s.parallelGroup || null,
          condition: (s.condition as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          orderIndex: i,
        })),
      },
    },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });
  return { data: serializeDefinition(def) };
}

export async function deactivateDefinition(id: string) {
  const existing = await prisma.workflowDefinition.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Workflow definition not found");
  const def = await prisma.workflowDefinition.update({
    where: { id },
    data: { status: "Inactive" },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });
  return { data: serializeDefinition(def) };
}

export async function deleteDefinition(id: string) {
  const existing = await prisma.workflowDefinition.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Workflow definition not found");
  const referencing = await prisma.workflowInstance.count({
    where: { definitionId: id, status: { in: ["In Progress", "Approver Resolution Failed"] } },
  });
  if (referencing > 0) {
    throw AppError.conflict(
      "Cannot delete — active workflow instances still reference this definition. Deactivate it instead; in-flight instances will complete against their original version."
    );
  }
  await prisma.workflowDefinition.delete({ where: { id } });
  return { data: { deleted: true } };
}

// ── Instances ─────────────────────────────────────────────────────────────

export async function listInstances() {
  const instances = await prisma.workflowInstance.findMany({
    include: INSTANCE_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return { data: instances.map((i) => serializeInstance(i)) };
}

export async function submitRequest(definitionId: string, requesterCode: string, attributes: Record<string, unknown>) {
  const def = await prisma.workflowDefinition.findUnique({
    where: { id: definitionId },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });
  if (!def || def.status !== "Active") {
    throw AppError.badRequest("No active workflow definition for this request type.");
  }
  const requester = await findPerson(requesterCode);
  if (!requester) throw AppError.notFound("Requester not found");

  const applicableSteps = def.steps.filter((s) => conditionPasses(s.condition, attributes));
  let resolutionFailure: string | null = null;

  const resolvedSteps: Prisma.WorkflowInstanceStepCreateManyInstanceInput[] = [];
  for (const s of applicableSteps) {
    const resolved = await resolveWithSelfApprovalGuard(s.approverRule, requester);
    if ("error" in resolved && !resolutionFailure) {
      resolutionFailure = `Step "${s.name}": ${resolved.error}`;
    }
    resolvedSteps.push({
      definitionStepId: s.id,
      name: s.name,
      approverRule: s.approverRule,
      parallelGroup: s.parallelGroup,
      slaHours: s.slaHours,
      approverId: "error" in resolved ? null : resolved.approverId,
      approverName: "error" in resolved ? null : resolved.approverName,
      selfApprovalBlocked: "error" in resolved ? false : !!resolved.selfApprovalBlocked,
      status: "error" in resolved ? "Unresolved" : "Pending",
      startedAt: new Date(),
    });
  }

  const instance = await prisma.workflowInstance.create({
    data: {
      definitionId: def.id,
      requesterId: requester.dbId,
      attributes: (attributes ?? {}) as Prisma.InputJsonValue,
      status: resolutionFailure ? "Approver Resolution Failed" : "In Progress",
      resolutionFailure,
      steps: { create: resolvedSteps },
    },
    include: INSTANCE_INCLUDE,
  });

  await logEvent(
    instance.id,
    `${def.requestType}.submitted`,
    `${requester.name} submitted a request${resolutionFailure ? " — approver resolution failed, held for HR" : ""}.`,
    requester.name
  );

  return { data: serializeInstance(instance) };
}

export interface ActOptions {
  bypassRoleApprover?: boolean;
}

export async function actOnStep(
  instanceId: string,
  actorCode: string,
  actorName: string,
  action: "approve" | "reject",
  reason?: string,
  opts: ActOptions = {}
) {
  const instance = await prisma.workflowInstance.findUnique({ where: { id: instanceId }, include: INSTANCE_INCLUDE });
  if (!instance) throw AppError.notFound("Workflow instance not found");
  if (instance.status !== "In Progress") {
    throw AppError.badRequest(`This request is already ${instance.status}.`);
  }

  const orderedSteps = [...instance.steps].sort(
    (a, b) => (a.definitionStep?.orderIndex ?? 0) - (b.definitionStep?.orderIndex ?? 0)
  );
  const current = orderedSteps[instance.currentStepIndex];
  if (!current) throw AppError.badRequest("This request has no steps awaiting action.");
  const group = orderedSteps.filter((s) =>
    current.parallelGroup ? s.parallelGroup === current.parallelGroup : s === current
  );
  const step = group.find((s) => s.status === "Pending");
  if (!step) {
    throw AppError.badRequest("This step is not awaiting action.");
  }

  const isRoleStep = (step.approverId ?? "").startsWith("role-");
  const eligible = [step.approverId, step.escalatedTo].filter(Boolean);
  const canAct = isRoleStep ? !!opts.bypassRoleApprover : eligible.includes(actorCode);
  if (!canAct) {
    throw AppError.forbidden(`${actorName} is not an eligible approver for this step.`);
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    // Atomic first-action-wins: only a still-Pending row can be claimed.
    const claimed = await tx.workflowInstanceStep.updateMany({
      where: { id: step.id, status: "Pending" },
      data: {
        status: action === "approve" ? "Approved" : "Rejected",
        actedBy: actorCode,
        actedByName: actorName,
        actedAt: now,
        rejectionReason: action === "reject" ? reason ?? null : null,
      },
    });
    if (claimed.count === 0) {
      throw AppError.badRequest(`Already actioned by ${step.actedByName ?? "someone else"} — first action wins, no change made.`);
    }
  });

  if (action === "reject") {
    await prisma.workflowInstance.update({ where: { id: instanceId }, data: { status: "Rejected" } });
    await logEvent(instanceId, `${instance.definition?.requestType ?? "Workflow"}.rejected`, `Request from ${instance.requester.firstName} ${instance.requester.lastName} rejected at step "${step.name}".`, actorName);
    await logEvent(instanceId, `${instance.definition?.requestType ?? "Workflow"}.step_rejected`, `${actorName} rejected "${step.name}" for ${instance.requester.firstName} ${instance.requester.lastName}.`, actorName);
    return getInstance(instanceId);
  }

  await logEvent(instanceId, `${instance.definition?.requestType ?? "Workflow"}.step_approved`, `${actorName} approved "${step.name}" for ${instance.requester.firstName} ${instance.requester.lastName}.`, actorName);

  // Parallel-group gate: advance only when EVERY step in the current group is
  // approved. The step we just approved counts as approved; the others are
  // read from the pre-transaction snapshot (still accurate, they changed not).
  const groupComplete = group.length > 0 && group.every((s) => s.id === step.id || s.status === "Approved");
  if (!groupComplete) {
    return getInstance(instanceId);
  }

  const newIndex = instance.currentStepIndex + group.length;
  if (newIndex >= orderedSteps.length) {
    await prisma.workflowInstance.update({ where: { id: instanceId }, data: { status: "Approved", currentStepIndex: orderedSteps.length } });
    await logEvent(instanceId, `${instance.definition?.requestType ?? "Workflow"}.approved`, `Request from ${instance.requester.firstName} ${instance.requester.lastName} fully approved.`, actorName);
  } else {
    await prisma.workflowInstance.update({ where: { id: instanceId }, data: { currentStepIndex: newIndex } });
  }

  return getInstance(instanceId);
}

export async function runSlaCheck(now = new Date()) {
  const instances = await prisma.workflowInstance.findMany({
    where: { status: "In Progress" },
    include: {
      ...INSTANCE_INCLUDE,
      steps: { include: { definitionStep: { select: { orderIndex: true } } }, orderBy: { startedAt: "asc" } },
    },
  });

  let escalatedCount = 0;
  for (const inst of instances) {
    const orderedSteps = [...inst.steps].sort(
      (a, b) => (a.definitionStep?.orderIndex ?? 0) - (b.definitionStep?.orderIndex ?? 0)
    );
    const step = orderedSteps[inst.currentStepIndex];
    if (!step || step.status !== "Pending" || step.escalatedTo) continue;

    const elapsedHours = (now.getTime() - step.startedAt.getTime()) / 3600000;
    if (elapsedHours < step.slaHours) continue;

    const original = step.approverId ? await findPerson(step.approverId) : null;
    const escalateTo = original?.managerId && original.managerId !== step.approverId ? original.managerId : "role-hr";
    const escalateToName = escalateTo === "role-hr" ? "HR Escalation Contact" : (await findPerson(escalateTo))?.name ?? escalateTo;

    await prisma.workflowInstanceStep.update({ where: { id: step.id }, data: { escalatedTo: escalateTo, escalatedToName: escalateToName } });
    await logEvent(
      inst.id,
      `${inst.definition?.requestType ?? "Workflow"}.escalated`,
      `Step "${step.name}" for ${inst.requester.firstName} ${inst.requester.lastName} escalated to ${escalateToName} (SLA of ${step.slaHours}h exceeded); ${step.approverName} can still act.`
    );
    escalatedCount += 1;
  }

  return { data: { escalatedCount } };
}

export async function manuallyAssignApprover(instanceId: string, approverCode: string, approverName?: string) {
  const instance = await prisma.workflowInstance.findUnique({ where: { id: instanceId }, include: INSTANCE_INCLUDE });
  if (!instance) throw AppError.notFound("Workflow instance not found");

  const orderedSteps = [...instance.steps].sort(
    (a, b) => (a.definitionStep?.orderIndex ?? 0) - (b.definitionStep?.orderIndex ?? 0)
  );
  const unresolved = orderedSteps.find((s) => s.status === "Unresolved");
  if (!unresolved) throw AppError.badRequest("No unresolved step found on this instance.");

  const person = approverName
    ? { id: approverCode, name: approverName }
    : await findPerson(approverCode);
  if (!person) throw AppError.badRequest("Approver not found.");

  await prisma.$transaction([
    prisma.workflowInstanceStep.update({
      where: { id: unresolved.id },
      data: { approverId: person.id, approverName: person.name, status: "Pending", startedAt: new Date() },
    }),
    prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { status: "In Progress", resolutionFailure: null },
    }),
  ]);

  await logEvent(
    instanceId,
    `${instance.definition?.requestType ?? "Workflow"}.approver_manually_assigned`,
    `HR manually assigned ${person.name} after resolution failure for ${instance.requester.firstName} ${instance.requester.lastName}'s request.`,
    person.name
  );

  return getInstance(instanceId);
}

// ── Event log ─────────────────────────────────────────────────────────────

export async function getEventLog() {
  const events = await prisma.workflowEvent.findMany({
    orderBy: { at: "desc" },
    take: 100,
  });
  return {
    data: events.map((e) => ({
      id: e.id,
      type: e.type,
      detail: e.detail,
      at: e.at.toISOString(),
    })),
  };
}
