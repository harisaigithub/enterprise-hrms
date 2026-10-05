import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { serializeInstance, serializeDefinition } from "../../serializers/workflow.serializer";
import { workflowInstanceReadFilter, type WorkflowReadScope } from "./workflow.access";

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
  "Next Level Manager",
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
  assetRequest: { select: { id: true } },
  performanceGoal: { select: { id: true } },
  performanceRatingProposal: { select: { id: true } },
  separation: { select: { id: true } },
  policyVersion: { select: { id: true } },
  complianceObligation: { select: { id: true } },
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
      status: true,
      departmentId: true,
      reportingManager: { select: { employeeCode: true } },
    },
  });
  if (!p || p.status !== "Active") return null;
  return {
    dbId: p.id,
    id: p.employeeCode,
    name: `${p.firstName} ${p.lastName}`.trim(),
    managerId: p.reportingManager?.employeeCode ?? null,
    departmentId: p.departmentId,
  };
}

async function logEvent(instanceId: string, type: string, detail: string, actorName?: string, tx?: Prisma.TransactionClient): Promise<void> {
  const db = tx ?? prisma;
  await db.workflowEvent.create({ data: { instanceId, type, detail, actorName } });
}

export async function getInstance(id: string) {
  const inst = await prisma.workflowInstance.findUnique({ where: { id }, include: INSTANCE_INCLUDE });
  if (!inst) throw AppError.notFound("Workflow instance not found");
  return { data: serializeInstance(inst) };
}

type Resolution =
  | { approverId: string; approverName: string; selfApprovalBlocked?: boolean }
  | { error: string };

export async function findNextLevelManager(
  managerId: string | null,
  lookup: (employeeCode: string) => Promise<Pick<Person, "id" | "managerId" | "name"> | null>
): Promise<{ approverId: string; approverName: string } | null> {
  const manager = managerId ? await lookup(managerId) : null;
  const nextLevel = manager?.managerId ? await lookup(manager.managerId) : null;
  return nextLevel ? { approverId: nextLevel.id, approverName: nextLevel.name } : null;
}

/** Resolve a single approver rule against live org data. */
async function resolveOne(rule: string, requester: Person): Promise<Resolution> {
  if (rule === "Direct Reporting Manager") {
    if (requester.managerId) {
      const mgr = await findPerson(requester.managerId);
      if (mgr) {
        return { approverId: mgr.id, approverName: mgr.name };
      }
    }
    // Fallback: check department head if no direct manager is assigned or if manager lookup failed
    if (requester.departmentId) {
      const head = await prisma.employee.findFirst({
        where: { departmentId: requester.departmentId, isDepartmentHead: true, status: "Active" },
        select: { employeeCode: true, firstName: true, lastName: true },
      });
      if (head) {
        return { approverId: head.employeeCode, approverName: `${head.firstName} ${head.lastName}`.trim() };
      }
    }
    return { error: `Direct Reporting Manager or Department Head could not be resolved for ${requester.name} — no active manager/head on file.` };
  }
  if (rule === "Department Head") {
    const head = requester.departmentId
      ? await prisma.employee.findFirst({
          where: { departmentId: requester.departmentId, isDepartmentHead: true, status: "Active" },
          select: { employeeCode: true, firstName: true, lastName: true },
        })
      : null;
    if (head) {
      return { approverId: head.employeeCode, approverName: `${head.firstName} ${head.lastName}`.trim() };
    }
    // Fallback to direct reporting manager if department head is missing or self
    if (requester.managerId) {
      const mgr = await findPerson(requester.managerId);
      if (mgr) {
        return { approverId: mgr.id, approverName: mgr.name };
      }
    }
    return { error: `No Department Head or Direct Manager configured for ${requester.name}'s department.` };
  }
  if (rule === "Next Level Manager") {
    const nextLevel = await findNextLevelManager(requester.managerId, findPerson);
    if (nextLevel) return nextLevel;
    return { error: `The next-level manager could not be resolved for ${requester.name}.` };
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

  const candidate = await findEscalationCandidate(requester.id, requester.managerId, findPerson);
  if (!candidate) {
    return {
      error: `Self-approval blocked for ${requester.name}, and no valid next-level approver could be found — flagged for manual assignment.`,
    };
  }
  const person = await findPerson(candidate);
  if (!person || person.id === requester.id) return { error: `Escalation target ${candidate} could not be resolved.` };
  return { approverId: person.id, approverName: person.name, selfApprovalBlocked: true };
}

export async function findEscalationCandidate(
  requesterId: string,
  initialCandidate: string | null,
  lookup: (employeeCode: string) => Promise<Pick<Person, "id" | "managerId"> | null>
): Promise<string | null> {
  const visited = new Set([requesterId]);
  let candidate = initialCandidate;
  let traversed = 0;
  while (candidate && visited.has(candidate) && traversed < 10) {
    const person = await lookup(candidate);
    if (!person) return null;
    visited.add(person.id);
    candidate = person.managerId;
    traversed += 1;
  }
  return candidate && !visited.has(candidate) ? candidate : null;
}

function conditionPasses(condition: unknown, attributes: Record<string, unknown>): boolean {
  if (!condition || typeof condition !== "object") return true;
  const c = condition as { field?: string; operator?: string; value?: number };
  if (!c.field) return true;
  const value = attributes[c.field];
  if (value === undefined) return false; // missing attribute -> conditional step is not applicable
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

function validateParallelGroups(steps: WorkflowStepInput[]): void {
  const closedGroups = new Set<string>();
  let previousGroup: string | null = null;
  for (const step of steps) {
    const group = step.parallelGroup?.trim() || null;
    if (group !== previousGroup && previousGroup) closedGroups.add(previousGroup);
    if (group && closedGroups.has(group)) {
      throw AppError.badRequest(`Parallel group "${group}" must occupy one contiguous sequence of steps.`);
    }
    previousGroup = group;
  }
}

function activeStepGroup<T extends { parallelGroup: string | null }>(steps: T[], index: number): T[] {
  const current = steps[index];
  if (!current) return [];
  if (!current.parallelGroup) return [current];
  let end = index + 1;
  while (end < steps.length && steps[end].parallelGroup === current.parallelGroup) end += 1;
  return steps.slice(index, end);
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
  const activeCounts = await prisma.workflowInstance.groupBy({
    by: ["definitionId"],
    where: { status: { in: ["In Progress", "Approver Resolution Failed"] } },
    _count: { _all: true },
  });
  const totalCounts = await prisma.workflowInstance.groupBy({
    by: ["definitionId"],
    _count: { _all: true },
  });
  const activeCountByDefinition = new Map(activeCounts.map((item) => [item.definitionId, item._count._all]));
  const totalCountByDefinition = new Map(totalCounts.map((item) => [item.definitionId, item._count._all]));
  return {
    data: defs.map((definition) => ({
      ...serializeDefinition(definition),
      activeInstanceCount: activeCountByDefinition.get(definition.id) ?? 0,
      totalInstanceCount: totalCountByDefinition.get(definition.id) ?? 0,
    })),
  };
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

export interface WorkflowBlueprint extends CreateDefinitionInput {
  key: string;
  module: string;
  title: string;
  description: string;
  trigger: string;
  attributes: string[];
}

export const ASSET_ALLOCATION_APPROVAL_THRESHOLD = 25_000;

export const WORKFLOW_BLUEPRINTS: WorkflowBlueprint[] = [
  {
    key: "leave-request",
    module: "Leave",
    title: "Leave Approval",
    requestType: "Leave Request",
    description: "Manager approval with HR review for extended leave.",
    trigger: "Employee submits a leave request",
    attributes: ["duration_days", "leave_type"],
    steps: [
      { name: "Manager Approval", approverRule: "Direct Reporting Manager", slaHours: 24 },
      { name: "HR Policy Review", approverRule: "Named Role: HR", slaHours: 24, condition: { field: "duration_days", operator: ">", value: 5 } },
    ],
  },
  {
    key: "expense-claim",
    module: "Expenses",
    title: "Expense Claim Review",
    requestType: "Expense Claim",
    description: "Manager verification followed by conditional Finance approval.",
    trigger: "Employee submits an expense claim with receipt",
    attributes: ["amount", "has_receipt"],
    steps: [
      { name: "Manager Verification", approverRule: "Direct Reporting Manager", slaHours: 24 },
      { name: "Finance Approval", approverRule: "Named Role: Finance", slaHours: 24, condition: { field: "amount", operator: ">", value: 5000 } },
    ],
  },
  {
    key: "payroll-run",
    module: "Payroll",
    title: "Monthly Payroll Sign-off",
    requestType: "Payroll Run",
    description: "Parallel HR and Finance verification before final release.",
    trigger: "Payroll run is submitted for processing",
    attributes: ["gross_payroll", "employee_count"],
    steps: [
      { name: "HR Headcount Check", approverRule: "Named Role: HR", slaHours: 12, parallelGroup: "verification" },
      { name: "Finance Cost Check", approverRule: "Named Role: Finance", slaHours: 12, parallelGroup: "verification" },
      { name: "Department Sign-off", approverRule: "Department Head", slaHours: 12 },
    ],
  },
  {
    key: "employee-onboarding",
    module: "Onboarding",
    title: "Employee Onboarding",
    requestType: "Employee Onboarding",
    description: "HR documentation and department readiness checks.",
    trigger: "Candidate accepts an offer",
    attributes: ["documents_complete", "joining_in_days"],
    steps: [
      { name: "HR Document Verification", approverRule: "Named Role: HR", slaHours: 24 },
      { name: "Department Readiness", approverRule: "Department Head", slaHours: 24 },
    ],
  },
  {
    key: "recruitment-offer",
    module: "Recruitment",
    title: "Offer Release",
    requestType: "Recruitment Offer",
    description: "Department selection approval with HR offer authorization.",
    trigger: "Candidate is recommended after interview",
    attributes: ["annual_ctc", "position_level"],
    steps: [
      { name: "Hiring Manager Approval", approverRule: "Department Head", slaHours: 24 },
      { name: "HR Offer Approval", approverRule: "Named Role: HR", slaHours: 24 },
      { name: "Finance Budget Review", approverRule: "Named Role: Finance", slaHours: 24, condition: { field: "annual_ctc", operator: ">", value: 1000000 } },
    ],
  },
  {
    key: "attendance-regularization",
    module: "Attendance",
    title: "Attendance Regularization",
    requestType: "Attendance Regularization",
    description: "Manager review followed by HR verification before attendance is changed.",
    trigger: "Employee requests a punch correction",
    attributes: ["monthly_request_count"],
    steps: [
      { name: "Manager Review", approverRule: "Direct Reporting Manager", slaHours: 12 },
      { name: "HR Verification", approverRule: "Named Role: HR", slaHours: 24 },
    ],
  },
  {
    key: "asset-allocation",
    module: "Assets",
    title: "Asset Allocation",
    requestType: "Asset Allocation",
    description: "Manager need validation and conditional Finance approval.",
    trigger: "Employee requests an organizational asset",
    attributes: ["asset_value"],
    steps: [
      { name: "Manager Need Approval", approverRule: "Direct Reporting Manager", slaHours: 24 },
      { name: "Finance Purchase Approval", approverRule: "Named Role: Finance", slaHours: 24, condition: { field: "asset_value", operator: ">", value: ASSET_ALLOCATION_APPROVAL_THRESHOLD } },
    ],
  },
  {
    key: "travel-request",
    module: "Travel",
    title: "Business Travel",
    requestType: "Business Travel",
    description: "Manager approval plus Finance review for higher travel budgets.",
    trigger: "Employee submits a travel plan",
    attributes: ["estimated_cost", "duration_days"],
    steps: [
      { name: "Manager Approval", approverRule: "Direct Reporting Manager", slaHours: 24 },
      { name: "Finance Budget Approval", approverRule: "Named Role: Finance", slaHours: 24, condition: { field: "estimated_cost", operator: ">", value: 10000 } },
    ],
  },
  {
    key: "performance-goal",
    module: "Performance",
    title: "Performance Goal",
    requestType: "Performance Goal",
    description: "Manager alignment and department-level strategic review.",
    trigger: "Employee submits or revises a goal",
    attributes: ["weightage"],
    steps: [
      { name: "Manager Alignment", approverRule: "Direct Reporting Manager", slaHours: 24 },
      { name: "Department Review", approverRule: "Department Head", slaHours: 24, condition: { field: "weightage", operator: ">=", value: 40 } },
    ],
  },
  {
    key: "performance-rating-release",
    module: "Performance",
    title: "Promotion & Increment Release",
    requestType: "Performance Rating Release",
    description: "Calibrated ratings, promotions and increments require HR review followed by Finance approval before employee history is updated.",
    trigger: "HR submits a calibrated compensation recommendation",
    attributes: ["final_rating", "increment_percent", "promotion"],
    steps: [
      { name: "HR Compensation Review", approverRule: "Named Role: HR", slaHours: 24 },
      { name: "Finance Budget Approval", approverRule: "Named Role: Finance", slaHours: 24 },
    ],
  },
  {
    key: "separation-request",
    module: "Separation",
    title: "Employee Separation",
    requestType: "Employee Separation",
    description: "Manager acknowledgement, HR clearance and Finance settlement.",
    trigger: "Resignation or separation is initiated",
    attributes: ["notice_shortfall_days", "settlement_amount"],
    steps: [
      { name: "Manager Acknowledgement", approverRule: "Direct Reporting Manager", slaHours: 24 },
      { name: "HR Clearance", approverRule: "Named Role: HR", slaHours: 48 },
      { name: "Finance Settlement", approverRule: "Named Role: Finance", slaHours: 48 },
    ],
  },
  {
    key: "helpdesk-exception",
    module: "Helpdesk",
    title: "Helpdesk Escalation",
    requestType: "Helpdesk Escalation",
    description: "Department escalation for high-impact or overdue tickets.",
    trigger: "Ticket is marked high priority or breaches SLA",
    attributes: ["priority_score", "age_hours"],
    steps: [
      { name: "Department Escalation", approverRule: "Department Head", slaHours: 8 },
      { name: "HR Impact Review", approverRule: "Named Role: HR", slaHours: 12, condition: { field: "priority_score", operator: ">=", value: 4 } },
    ],
  },
  {
    key: "policy-publication",
    module: "Policies",
    title: "Policy Publication",
    requestType: "Policy Publication",
    description: "Department content review and HR publication approval.",
    trigger: "A new policy version is submitted",
    attributes: ["affected_employee_count"],
    steps: [
      { name: "Department Content Review", approverRule: "Department Head", slaHours: 24 },
      { name: "HR Publication Approval", approverRule: "Named Role: HR", slaHours: 24 },
    ],
  },
  {
    key: "compliance-filing",
    module: "Compliance",
    title: "Compliance Filing",
    requestType: "Compliance Filing",
    description: "Owner validation with Finance and HR sign-off.",
    trigger: "A filing owner submits an obligation for filing approval",
    attributes: [],
    steps: [
      { name: "Finance Validation", approverRule: "Named Role: Finance", slaHours: 12, parallelGroup: "signoff" },
      { name: "HR Compliance Sign-off", approverRule: "Named Role: HR", slaHours: 12, parallelGroup: "signoff" },
    ],
  },
  {
    key: "learning-enrollment",
    module: "LMS",
    title: "Paid Learning Enrollment",
    requestType: "Learning Enrollment",
    description: "Manager relevance check and Finance approval for paid courses.",
    trigger: "Employee requests course enrollment",
    attributes: ["course_cost"],
    steps: [
      { name: "Manager Relevance Check", approverRule: "Direct Reporting Manager", slaHours: 24 },
      { name: "Finance Cost Approval", approverRule: "Named Role: Finance", slaHours: 24, condition: { field: "course_cost", operator: ">", value: 0 } },
    ],
  },
];

const WIRED_WORKFLOW_BLUEPRINTS = new Set([
  "leave-request",
  "payroll-run",
  "asset-allocation",
  "attendance-regularization",
  "expense-claim",
  "travel-request",
  "performance-goal",
  "performance-rating-release",
  "separation-request",
  "policy-publication",
  "compliance-filing",
]);

const BLUEPRINT_INTEGRATION_NOTES: Record<string, string> = {
  "employee-onboarding": "The onboarding record is created only after offer acceptance, document verification, and employee creation, so it does not exist at the template's candidate-acceptance trigger.",
  "recruitment-offer": "Recruitment already has a separate two-person approval and candidate offer/consent lifecycle; replacing it risks duplicate or bypassed approvals.",
  "helpdesk-exception": "Escalation is currently derived from ticket SLA timing and has no persisted approval-controlled ticket transition.",
  "learning-enrollment": "Courses have no cost field or approval-pending enrollment state for paid enrollment routing.",
};

export async function listBlueprints() {
  const definitions = await prisma.workflowDefinition.findMany({
    where: { requestType: { in: WORKFLOW_BLUEPRINTS.map((b) => b.requestType) } },
    select: { id: true, requestType: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return {
    data: WORKFLOW_BLUEPRINTS.map((blueprint) => {
      const installed = definitions.find((d) => d.requestType === blueprint.requestType && d.status === "Active");
      return {
        ...blueprint,
        installed: !!installed,
        definitionId: installed?.id ?? null,
        moduleIntegrated: WIRED_WORKFLOW_BLUEPRINTS.has(blueprint.key),
        integrationNote: BLUEPRINT_INTEGRATION_NOTES[blueprint.key] ?? null,
      };
    }),
  };
}

export async function installBlueprint(key: string) {
  const blueprint = WORKFLOW_BLUEPRINTS.find((item) => item.key === key);
  if (!blueprint) throw AppError.notFound("Workflow blueprint not found");

  const definition = await prisma.$transaction(async (tx) => {
    await tx.workflowDefinition.updateMany({
      where: { requestType: blueprint.requestType, status: "Active" },
      data: { status: "Inactive" },
    });
    return tx.workflowDefinition.create({
      data: {
        requestType: blueprint.requestType,
        steps: {
          create: blueprint.steps.map((step, orderIndex) => ({
            name: step.name,
            approverRule: step.approverRule,
            slaHours: step.slaHours ?? 24,
            parallelGroup: step.parallelGroup?.trim() || null,
            condition: (step.condition as Prisma.InputJsonValue) ?? Prisma.JsonNull,
            orderIndex,
          })),
        },
      },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    });
  });

  return { data: { blueprintKey: key, module: blueprint.module, definition: serializeDefinition(definition) } };
}

export async function createDefinition(input: CreateDefinitionInput) {
  validateDefinitionInput(input);
  const requestType = input.requestType.trim();
  const def = await prisma.workflowDefinition.create({
    data: {
      requestType,
      steps: { create: buildDefinitionSteps(input.steps) },
    },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });
  return { data: serializeDefinition(def) };
}

function validateDefinitionInput(input: CreateDefinitionInput): void {
  if (!input.requestType?.trim()) throw AppError.badRequest("Request type is required");
  validateParallelGroups(input.steps);
  const ruleSet = new Set<string>(APPROVER_RULES);
  for (const s of input.steps) {
    if (!ruleSet.has(s.approverRule)) {
      throw AppError.badRequest(`Unknown approver rule: ${s.approverRule}`);
    }
  }
}

function buildDefinitionSteps(steps: WorkflowStepInput[]) {
  return steps.map((step, orderIndex) => ({
    name: step.name.trim(),
    approverRule: step.approverRule,
    slaHours: step.slaHours ?? 24,
    parallelGroup: step.parallelGroup?.trim() || null,
    condition: (step.condition as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    orderIndex,
  }));
}

export async function reviseDefinition(id: string, input: CreateDefinitionInput) {
  validateDefinitionInput(input);
  const existing = await prisma.workflowDefinition.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Workflow definition not found");
  const requestType = input.requestType.trim();
  const revised = await prisma.$transaction(async (tx) => {
    await tx.workflowDefinition.updateMany({
      where: { requestType: { in: [...new Set([existing.requestType, requestType])] }, status: "Active" },
      data: { status: "Inactive" },
    });
    return tx.workflowDefinition.create({
      data: { requestType, steps: { create: buildDefinitionSteps(input.steps) } },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    });
  });
  return { data: serializeDefinition(revised) };
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
  const activeReferences = await prisma.workflowInstance.count({
    where: { definitionId: id, status: { in: ["In Progress", "Approver Resolution Failed"] } },
  });
  if (activeReferences > 0) {
    throw AppError.conflict(
      `Cannot delete: ${activeReferences} active workflow instance(s) reference this definition. Deactivate it instead; in-flight instances keep their original version.`
    );
  }
  const totalReferences = await prisma.workflowInstance.count({ where: { definitionId: id } });
  if (totalReferences > 0) {
    throw AppError.conflict(
      `Cannot delete: ${totalReferences} historical workflow instance(s) reference this definition and must remain available for audit.`
    );
  }
  await prisma.workflowDefinition.delete({ where: { id } });
  return { data: { deleted: true } };
}

// ── Instances ─────────────────────────────────────────────────────────────

export async function listInstances(scope?: WorkflowReadScope) {
  const instances = await prisma.workflowInstance.findMany({
    where: workflowInstanceReadFilter(scope),
    include: INSTANCE_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return { data: instances.map((i) => serializeInstance(i)) };
}

export async function submitRequest(
  definitionId: string,
  requesterCode: string,
  attributes: Record<string, unknown>,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;
  const def = await db.workflowDefinition.findUnique({
    where: { id: definitionId },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });
  if (!def || def.status !== "Active") {
    throw AppError.badRequest("No active workflow definition for this request type.");
  }
  const requester = await findPerson(requesterCode);
  if (!requester) throw AppError.notFound("Requester not found");

  const applicableSteps = def.steps.filter((s) => conditionPasses(s.condition, attributes));
  if (applicableSteps.length === 0) {
    throw AppError.badRequest("No approval steps apply to the submitted request.");
  }
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

  const instance = await db.workflowInstance.create({
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
    requester.name,
    tx
  );

  return { data: serializeInstance(instance) };
}

export async function previewRequest(definitionId: string, requesterCode: string, attributes: Record<string, unknown>) {
  const def = await prisma.workflowDefinition.findUnique({
    where: { id: definitionId },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });
  if (!def || def.status !== "Active") throw AppError.badRequest("No active workflow definition for this request type.");
  const requester = await findPerson(requesterCode);
  if (!requester) throw AppError.notFound("Requester not found");
  const applicableSteps = def.steps.filter((step) => conditionPasses(step.condition, attributes));
  if (applicableSteps.length === 0) throw AppError.badRequest("No approval steps apply to the submitted request.");
  const steps = await Promise.all(applicableSteps.map(async (step) => {
    const resolution = await resolveWithSelfApprovalGuard(step.approverRule, requester);
    return {
      name: step.name,
      approverRule: step.approverRule,
      approverId: "error" in resolution ? null : resolution.approverId,
      approverName: "error" in resolution ? null : resolution.approverName,
      selfApprovalBlocked: "error" in resolution ? false : !!resolution.selfApprovalBlocked,
      resolutionError: "error" in resolution ? resolution.error : null,
    };
  }));
  return { data: { requestType: def.requestType, requesterName: requester.name, steps } };
}

export interface ActOptions {
  bypassRoleApprover?: boolean;
  actorRole?: string;
}

export function canActOnNamedRoleStep(approverId: string, actorRole?: string, adminOverride = false): boolean {
  const requiredRole = approverId === "role-finance" ? "FINANCE" : approverId === "role-hr" ? "HR" : null;
  if (!requiredRole) return false;
  const role = actorRole?.toUpperCase();
  return role === requiredRole || (role === "ADMIN" && adminOverride);
}

export async function syncWorkflowModuleState(
  tx: Prisma.TransactionClient,
  instance: any,
  step: any,
  action: "approve" | "reject",
  workflowStatus: string,
  reason?: string,
  actorName?: string
) {
  if (instance.assetRequest && (action === "reject" || workflowStatus === "Approved")) {
    await tx.assetRequest.update({
      where: { id: instance.assetRequest.id },
      data: action === "reject"
        ? { status: "REJECTED", rejectionReason: reason?.trim() || null }
        : { status: "APPROVED", approvedBy: actorName ?? null, approvedAt: new Date() },
    });
  }

  if (instance.performanceGoal && (action === "reject" || workflowStatus === "Approved")) {
    await tx.performanceGoal.update({
      where: { id: instance.performanceGoal.id },
      data: { status: action === "reject" ? "Revision Requested" : "Locked" },
    });
  }

  if (instance.performanceRatingProposal) {
    if (action === "reject") {
      await tx.performanceRatingProposal.update({
        where: { id: instance.performanceRatingProposal.id },
        data: { status: "Rejected", decidedAt: new Date() },
      });
    } else if (workflowStatus === "Approved") {
      const proposal = await tx.performanceRatingProposal.findUnique({
        where: { id: instance.performanceRatingProposal.id },
      });
      if (proposal?.status === "Pending Approval") {
        await tx.performanceRatingHistory.create({
          data: {
            employeeId: proposal.employeeId,
            reviewCycleId: proposal.reviewCycleId,
            cycleName: proposal.cycleName,
            selfRating: proposal.selfRating,
            originalManagerRating: proposal.originalManagerRating,
            finalRating: proposal.finalRating,
            calibrationAdjusted: proposal.finalRating !== proposal.originalManagerRating,
            increment: proposal.increment,
            promotion: proposal.promotion,
            appraisalLetterUrl: proposal.appraisalLetterUrl,
            releasedOn: new Date(),
          },
        });
        await tx.performanceRatingProposal.update({
          where: { id: proposal.id },
          data: { status: "Released", decidedAt: new Date() },
        });
      }
    }
  }

  if (instance.policyVersion && (action === "reject" || workflowStatus === "Approved")) {
    const version = await tx.policyVersion.findUnique({
      where: { id: instance.policyVersion.id },
      include: { policy: { include: { versions: { orderBy: { versionNumber: "asc" } } } } },
    });
    if (!version) throw new Error("Workflow-linked policy version no longer exists.");
    if (action === "reject") {
      await tx.policyVersion.update({ where: { id: version.id }, data: { approvalStatus: "Rejected", decidedAt: new Date() } });
      await tx.policy.update({ where: { id: version.policyId }, data: { status: "Draft", nextReviewDate: null } });
    } else if (version.approvalStatus === "Pending Approval") {
      if (!version.effectiveDate) throw new Error("Policy version has no effective date.");
      const now = new Date();
      const nextReviewDate = version.policy.reviewCycleMonths
        ? new Date(Date.UTC(version.effectiveDate.getUTCFullYear(), version.effectiveDate.getUTCMonth() + version.policy.reviewCycleMonths, version.effectiveDate.getUTCDate()))
        : null;
      await tx.policy.update({ where: { id: version.policyId }, data: { status: "Published", nextReviewDate } });
      await tx.policyVersion.update({ where: { id: version.id }, data: { approvalStatus: "Approved", decidedAt: now, publishedAt: now } });
      const previous = version.policy.versions.filter((item) => item.versionNumber < version.versionNumber).at(-1);
      if (!version.requiresReacknowledgement && previous) {
        const acknowledgements = await tx.policyAcknowledgement.findMany({ where: { versionId: previous.id } });
        if (acknowledgements.length) {
          await tx.policyAcknowledgement.createMany({
            data: acknowledgements.map((acknowledgement) => ({
              versionId: version.id,
              employeeId: acknowledgement.employeeId,
              acknowledgedAt: acknowledgement.acknowledgedAt,
              device: acknowledgement.device,
            })),
            skipDuplicates: true,
          });
        }
      }
    }
  }

  if (instance.complianceObligation && (action === "reject" || workflowStatus === "Approved")) {
    const obligation = await tx.complianceObligation.findUnique({ where: { id: instance.complianceObligation.id } });
    if (!obligation) throw new Error("Workflow-linked compliance obligation no longer exists.");
    const approver = step.actedBy
      ? await tx.employee.findUnique({ where: { employeeCode: step.actedBy }, select: { userId: true } })
      : null;
    const status = action === "reject"
      ? "Rejected"
      : ["POSH Training Review", "Policy Acknowledgement Review"].includes(obligation.category) ? "Completed" : "Filed";
    await tx.complianceObligation.update({
      where: { id: obligation.id },
      data: { status, filedAt: action === "approve" ? new Date() : null, filedByUserId: action === "approve" ? approver?.userId ?? null : null },
    });
    await tx.complianceActivity.create({
      data: {
        actorName: actorName ?? "Workflow approver",
        action: action === "approve" ? "Obligation filed" : "Obligation filing rejected",
        category: "Calendar",
        details: `${obligation.title} ${action === "approve" ? `was marked ${status}` : "was returned for correction"}.`,
        severity: action === "approve" ? "info" : "warning",
      },
    });
  }

  if (instance.separation) {
    const clearanceNameByStep: Record<string, string> = {
      "Manager Acknowledgement": "Manager Clearance",
      "HR Clearance": "HR Clearance",
      "Finance Settlement": "Finance Clearance",
    };
    const clearanceName = clearanceNameByStep[step.name];
    if (!clearanceName) return;
    const clearance = await tx.separationClearance.findFirst({
      where: { separationId: instance.separation.id, item: clearanceName },
      select: { id: true },
    });
    if (!clearance) return;
    await tx.separationClearance.update({
      where: { id: clearance.id },
      data: {
        status: action === "approve" ? "Complete" : "Flagged",
        notes: action === "reject" ? reason?.trim() || "Rejected in workflow" : null,
        completedAt: action === "approve" ? new Date() : null,
      },
    });
    const outstanding = await tx.separationClearance.count({
      where: { separationId: instance.separation.id, status: { not: "Complete" } },
    });
    await tx.separation.update({
      where: { id: instance.separation.id },
      data: { status: outstanding === 0 ? "Cleared" : "Clearance In Progress" },
    });
  }
}

export function assertDistinctParallelApprover(group: any[], currentStepId: string, actorCode: string): void {
  if (group.some((candidate) => candidate.id !== currentStepId && candidate.status === "Approved" && candidate.actedBy === actorCode)) {
    throw AppError.forbidden("A different approver must complete each step in a parallel approval group.");
  }
}

export function assertRequesterCannotApprove(requesterCode: string, actorCode: string): void {
  if (requesterCode === actorCode) {
    throw AppError.forbidden("Requesters cannot approve or reject their own workflow requests.");
  }
}

export async function cancelPendingStepsAfterRejection(
  tx: Prisma.TransactionClient,
  instanceId: string,
  rejectedStepId: string
): Promise<number> {
  const result = await tx.workflowInstanceStep.updateMany({
    where: { instanceId, id: { not: rejectedStepId }, status: "Pending" },
    data: { status: "Cancelled" },
  });
  return result.count;
}

export async function actOnStep(
  instanceId: string,
  actorCode: string,
  actorName: string,
  action: "approve" | "reject",
  reason?: string,
  opts: ActOptions = {},
  stepId?: string
) {
  const instance = await prisma.workflowInstance.findUnique({ where: { id: instanceId }, include: INSTANCE_INCLUDE });
  if (!instance) throw AppError.notFound("Workflow instance not found");
  if (instance.status !== "In Progress") {
    throw AppError.badRequest(`This request is already ${instance.status}.`);
  }
  assertRequesterCannotApprove(instance.requester.employeeCode, actorCode);

  const orderedSteps = [...instance.steps].sort(
    (a, b) => (a.definitionStep?.orderIndex ?? 0) - (b.definitionStep?.orderIndex ?? 0)
  );
  const current = orderedSteps[instance.currentStepIndex];
  if (!current) throw AppError.badRequest("This request has no steps awaiting action.");
  const group = activeStepGroup(orderedSteps, instance.currentStepIndex);
  const eligiblePending = group.filter((candidate) => {
    if (candidate.status !== "Pending") return false;
    const roleStep = (candidate.approverId ?? "").startsWith("role-");
    return roleStep
      ? canActOnNamedRoleStep(candidate.approverId ?? "", opts.actorRole, opts.bypassRoleApprover)
      : candidate.approverId === actorCode || candidate.escalatedTo === actorCode;
  });
  const step = stepId
    ? group.find((candidate) => candidate.id === stepId)
    : eligiblePending.length === 1 ? eligiblePending[0] : undefined;
  if (!step || step.status !== "Pending") {
    if (!stepId && eligiblePending.length === 0 && group.some((candidate) => candidate.status === "Pending")) {
      throw AppError.forbidden(`${actorName} is not an eligible approver for this step.`);
    }
    throw AppError.badRequest("This step is not awaiting action.");
  }
  if (!stepId && eligiblePending.length > 1) {
    throw AppError.badRequest("An explicit step identifier is required when multiple parallel steps are actionable.");
  }

  const isRoleStep = (step.approverId ?? "").startsWith("role-");
  const eligible = [step.approverId, step.escalatedTo].filter(Boolean);
  const canAct = isRoleStep
    ? canActOnNamedRoleStep(step.approverId ?? "", opts.actorRole, opts.bypassRoleApprover)
    : eligible.includes(actorCode);
  if (!canAct) {
    throw AppError.forbidden(`${actorName} is not an eligible approver for this step.`);
  }
  if (step.parallelGroup) assertDistinctParallelApprover(group, step.id, actorCode);

  const now = new Date();
  let rejected = false;
  let groupComplete = false;
  let cancelledStepCount = 0;
  await prisma.$transaction(async (tx: any) => {
    // Serialize transitions for an instance, then claim only an unacted step.
    const locked = await tx.workflowInstance.updateMany({
      where: { id: instanceId, status: "In Progress", currentStepIndex: instance.currentStepIndex },
      data: { currentStepIndex: instance.currentStepIndex },
    });
    if (locked.count === 0) throw AppError.conflict("The workflow changed while this action was being processed.");

    const claimed = await tx.workflowInstanceStep.updateMany({
      where: { id: step.id, instanceId, status: "Pending" },
      data: {
        status: action === "approve" ? "Approved" : "Rejected",
        actedBy: actorCode,
        actedByName: actorName,
        roleApproverOverride: isRoleStep && opts.actorRole?.toUpperCase() === "ADMIN" && opts.bypassRoleApprover === true,
        actedAt: now,
        rejectionReason: action === "reject" ? reason ?? null : null,
      },
    });
    if (claimed.count === 0) {
      throw AppError.conflict(`Already actioned by ${step.actedByName ?? "someone else"} — first action wins, no change made.`);
    }

    if (action === "reject") {
      cancelledStepCount = await cancelPendingStepsAfterRejection(tx, instanceId, step.id);
      await tx.workflowInstance.updateMany({
        where: { id: instanceId, status: "In Progress", currentStepIndex: instance.currentStepIndex },
        data: { status: "Rejected" },
      });
      await syncWorkflowModuleState(tx, instance, step, action, "Rejected", reason, actorName);
      rejected = true;
      return;
    }

    const groupStates = await tx.workflowInstanceStep.findMany({
      where: { instanceId, id: { in: group.map((item) => item.id) } },
      select: { status: true },
    });
    groupComplete = groupStates.length === group.length && groupStates.every((item: { status: string }) => item.status === "Approved");
    if (groupComplete) {
      const newIndex = instance.currentStepIndex + group.length;
      await tx.workflowInstance.updateMany({
        where: { id: instanceId, status: "In Progress", currentStepIndex: instance.currentStepIndex },
        data: newIndex >= orderedSteps.length
          ? { status: "Approved", currentStepIndex: orderedSteps.length }
          : { currentStepIndex: newIndex },
      });
      if (newIndex >= orderedSteps.length) {
        await syncWorkflowModuleState(tx, instance, step, action, "Approved", undefined, actorName);
      }
    }

    await syncWorkflowModuleState(tx, instance, step, action, "In Progress", undefined, actorName);
  });

  if (rejected) {
    await logEvent(instanceId, `${instance.definition?.requestType ?? "Workflow"}.rejected`, `Request from ${instance.requester.firstName} ${instance.requester.lastName} rejected at step "${step.name}".`, actorName);
    await logEvent(instanceId, `${instance.definition?.requestType ?? "Workflow"}.step_rejected`, `${actorName} rejected "${step.name}" for ${instance.requester.firstName} ${instance.requester.lastName}.`, actorName);
    if (cancelledStepCount > 0) {
      await logEvent(instanceId, `${instance.definition?.requestType ?? "Workflow"}.steps_cancelled`, `${cancelledStepCount} pending approval step(s) were cancelled after rejection.`, actorName);
    }
    return getInstance(instanceId);
  }

  await logEvent(instanceId, `${instance.definition?.requestType ?? "Workflow"}.step_approved`, `${actorName} approved "${step.name}" for ${instance.requester.firstName} ${instance.requester.lastName}.`, actorName);
  if (isRoleStep && opts.actorRole?.toUpperCase() === "ADMIN" && opts.bypassRoleApprover === true) {
    await logEvent(
      instanceId,
      `${instance.definition?.requestType ?? "Workflow"}.role_approver_override`,
      `${actorName} (Admin) used an explicit override to approve the "${step.name}" role-based step.`,
      actorName
    );
  }

  if (!groupComplete) {
    return getInstance(instanceId);
  }

  if (instance.currentStepIndex + group.length >= orderedSteps.length) {
    await logEvent(instanceId, `${instance.definition?.requestType ?? "Workflow"}.approved`, `Request from ${instance.requester.firstName} ${instance.requester.lastName} fully approved.`, actorName);
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
    const current = orderedSteps[inst.currentStepIndex];
    if (!current) continue;
    const currentGroup = activeStepGroup(orderedSteps, inst.currentStepIndex);

    for (const step of currentGroup) {
      if (step.status !== "Pending" || step.escalatedTo) continue;
      const elapsedHours = (now.getTime() - step.startedAt.getTime()) / 3600000;
      if (elapsedHours < step.slaHours) continue;

      const original = step.approverId ? await findPerson(step.approverId) : null;
      const escalateTo = original?.managerId && original.managerId !== step.approverId ? original.managerId : "role-hr";
      const escalateToName = escalateTo === "role-hr" ? "HR Escalation Contact" : (await findPerson(escalateTo))?.name ?? escalateTo;
      const updated = await prisma.workflowInstanceStep.updateMany({
        where: { id: step.id, status: "Pending", escalatedTo: null },
        data: { escalatedTo: escalateTo, escalatedToName: escalateToName },
      });
      if (!updated.count) continue;
      await logEvent(
        inst.id,
        `${inst.definition?.requestType ?? "Workflow"}.escalated`,
        `Step "${step.name}" for ${inst.requester.firstName} ${inst.requester.lastName} escalated to ${escalateToName} (SLA of ${step.slaHours}h exceeded); ${step.approverName} can still act.`
      );
      escalatedCount += 1;
    }
  }

  return { data: { escalatedCount } };
}

export async function manuallyAssignApprover(instanceId: string, stepId: string, approverCode: string, actorName: string) {
  const instance = await prisma.workflowInstance.findUnique({ where: { id: instanceId }, include: INSTANCE_INCLUDE });
  if (!instance) throw AppError.notFound("Workflow instance not found");
  if (instance.status !== "Approver Resolution Failed") {
    throw AppError.badRequest("This instance is not awaiting manual approver resolution.");
  }

  const unresolved = instance.steps.find((s) => s.id === stepId && s.status === "Unresolved");
  if (!unresolved) throw AppError.badRequest("No unresolved step found on this instance.");

  const person = await findPerson(approverCode);
  if (!person) throw AppError.badRequest("Approver not found.");
  if (person.id === instance.requester.employeeCode) {
    throw AppError.badRequest("The requester cannot be assigned as their own approver.");
  }

  await prisma.$transaction(async (tx: any) => {
    const locked = await tx.workflowInstance.updateMany({
      where: { id: instanceId, status: "Approver Resolution Failed" },
      data: { status: "Approver Resolution Failed" },
    });
    if (!locked.count) throw AppError.conflict("The workflow changed while approvers were being assigned.");

    const assigned = await tx.workflowInstanceStep.updateMany({
      where: { id: unresolved.id, instanceId, status: "Unresolved" },
      data: { approverId: person.id, approverName: person.name, status: "Pending", startedAt: new Date() },
    });
    if (!assigned.count) throw AppError.conflict("This step has already been resolved.");

    const unresolvedCount = await tx.workflowInstanceStep.count({ where: { instanceId, status: "Unresolved" } });
    await tx.workflowInstance.update({
      where: { id: instanceId },
      data: unresolvedCount === 0
        ? { status: "In Progress", resolutionFailure: null }
        : { resolutionFailure: `${unresolvedCount} approval step(s) still require manual resolution.` },
    });
  });

  await logEvent(
    instanceId,
    `${instance.definition?.requestType ?? "Workflow"}.approver_manually_assigned`,
    `HR manually assigned ${person.name} to "${unresolved.name}" after resolution failure for ${instance.requester.firstName} ${instance.requester.lastName}'s request.`,
    actorName
  );

  return getInstance(instanceId);
}

// ── Event log ─────────────────────────────────────────────────────────────

export async function getEventLog(scope?: WorkflowReadScope) {
  const events = await prisma.workflowEvent.findMany({
    where: scope ? { instance: { is: workflowInstanceReadFilter(scope) } } : undefined,
    orderBy: { at: "desc" },
    take: 100,
  });
  return {
    data: events.map((e) => ({
      id: e.id,
      instanceId: e.instanceId,
      type: e.type,
      detail: e.detail,
      at: e.at.toISOString(),
    })),
  };
}
