import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAuditLog } from "../../services/audit.service";
import type { AccessTokenPayload } from "../../lib/jwt";
import * as workflowService from "../workflow/workflow.service";
import { submitAndLinkWorkflow } from "../workflow/submission";

const include = { versions: { orderBy: { versionNumber: "asc" as const }, include: { workflowInstance: { select: { id: true, status: true } } } } };

function requireEmployee(actor?: AccessTokenPayload) {
  if (!actor?.employeeId) throw AppError.forbidden("Account is not linked to an employee record");
  return actor.employeeId;
}

async function actorName(actor?: AccessTokenPayload) {
  if (!actor?.employeeId) return actor?.role || "System";
  const employee = await prisma.employee.findUnique({ where: { id: actor.employeeId }, select: { firstName: true, lastName: true } });
  return employee ? `${employee.firstName} ${employee.lastName}` : actor.employeeCode || actor.role;
}

function dateOnly(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function serializePolicy(policy: any) {
  const current = policy.versions.at(-1);
  return {
    id: policy.id,
    title: policy.title,
    category: policy.category,
    scope: policy.scope,
    mandatoryAcknowledgement: policy.mandatoryAcknowledgement,
    reviewCycleMonths: policy.reviewCycleMonths,
    status: policy.status,
    currentVersionId: current?.id ?? null,
    nextReviewDate: dateOnly(policy.nextReviewDate),
    versions: policy.versions.map((version: any) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      effectiveDate: dateOnly(version.effectiveDate),
      ackDeadlineDays: version.acknowledgementDeadlineDays,
      requiresReacknowledgement: version.requiresReacknowledgement,
      approvalStatus: version.approvalStatus,
      workflowInstanceId: version.workflowInstanceId,
      workflowStatus: version.workflowInstance?.status ?? null,
      summary: version.summary,
      createdAt: dateOnly(version.createdAt),
      createdBy: version.createdByName,
      publishedAt: version.publishedAt,
    })),
  };
}

async function employeeScope(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { department: { select: { name: true } }, location: { select: { name: true } } },
  });
  return [
    "Company-wide",
    ...(employee?.department?.name ? [`Department: ${employee.department.name}`] : []),
    ...(employee?.location?.name ? [`Location: ${employee.location.name}`] : []),
  ];
}

export async function listPolicies(actor?: AccessTokenPayload) {
  let where: Prisma.PolicyWhereInput = {};
  if (!actor || !["HR", "ADMIN"].includes(actor.role)) {
    const employeeId = requireEmployee(actor);
    where = { status: "Published", scope: { in: await employeeScope(employeeId), mode: "insensitive" } };
  }
  const policies = await prisma.policy.findMany({ where, include, orderBy: { updatedAt: "desc" } });
  return policies.map(serializePolicy);
}

export async function createPolicy(input: any, actor?: AccessTokenPayload) {
  if (input.mandatoryAcknowledgement && !input.ackDeadlineDays) {
    throw AppError.badRequest("Mandatory policies need an acknowledgement deadline");
  }
  const createdByName = await actorName(actor);
  const policy = await prisma.policy.create({
    data: {
      title: input.title,
      category: input.category,
      scope: input.scope,
      mandatoryAcknowledgement: input.mandatoryAcknowledgement,
      reviewCycleMonths: input.reviewCycleMonths || null,
      createdByUserId: actor?.sub,
      versions: { create: {
        versionNumber: 1,
        effectiveDate: input.effectiveDate,
        acknowledgementDeadlineDays: input.mandatoryAcknowledgement ? input.ackDeadlineDays : null,
        requiresReacknowledgement: true,
        summary: input.summary,
        createdByUserId: actor?.sub,
        createdByName,
      } },
    }, include,
  });
  void writeAuditLog({ actorUserId: actor?.sub, action: "CREATE", entityType: "Policy", entityId: policy.id, newValue: { title: policy.title, status: policy.status } });
  return serializePolicy(policy);
}

export async function addVersion(id: string, input: any, actor?: AccessTokenPayload) {
  const policy = await prisma.policy.findUnique({ where: { id }, include });
  if (!policy) throw AppError.notFound("Policy not found");
  if (policy.mandatoryAcknowledgement && !input.ackDeadlineDays) {
    throw AppError.badRequest("Mandatory policies need an acknowledgement deadline");
  }
  const latestNumber = policy.versions.at(-1)?.versionNumber ?? 0;
  const createdByName = await actorName(actor);
  await prisma.$transaction([
    prisma.policyVersion.create({ data: {
      policyId: id,
      versionNumber: latestNumber + 1,
      effectiveDate: input.effectiveDate,
      acknowledgementDeadlineDays: policy.mandatoryAcknowledgement ? input.ackDeadlineDays : null,
      requiresReacknowledgement: input.requiresReacknowledgement,
      summary: input.summary,
      createdByUserId: actor?.sub,
      createdByName,
    } }),
    prisma.policy.update({ where: { id }, data: { status: "Draft", nextReviewDate: null } }),
  ]);
  void writeAuditLog({ actorUserId: actor?.sub, action: "UPDATE", entityType: "Policy", entityId: id, newValue: { versionNumber: latestNumber + 1, status: "Draft" } });
  return serializePolicy(await prisma.policy.findUniqueOrThrow({ where: { id }, include }));
}

export async function publishPolicy(id: string, actor?: AccessTokenPayload) {
  const policy = await prisma.policy.findUnique({ where: { id }, include });
  if (!policy) throw AppError.notFound("Policy not found");
  const current = policy.versions.at(-1);
  if (!current?.effectiveDate) throw AppError.badRequest("Set an effective date before publishing");
  if (policy.mandatoryAcknowledgement && !current.acknowledgementDeadlineDays) {
    throw AppError.badRequest("Mandatory policies need an acknowledgement deadline before publishing");
  }
  if (current.approvalStatus === "Pending Approval" && current.workflowInstanceId) {
    return { policy: serializePolicy(policy) };
  }
  if (policy.status === "Published") return { policy: serializePolicy(policy) };
  if (current.approvalStatus === "Rejected") {
    throw AppError.conflict("This policy version was rejected. Create a new version before resubmitting it.");
  }
  const requester = actor?.employeeId
    ? await prisma.employee.findUnique({ where: { id: actor.employeeId }, select: { employeeCode: true, status: true } })
    : null;
  if (!requester || requester.status !== "Active") throw AppError.forbidden("An active employee account is required to submit policy approval");

  const result = await submitAndLinkWorkflow({
    requestType: "Policy Publication",
    requesterCode: requester.employeeCode,
    attributes: async (tx) => {
      const employeeWhere: Prisma.EmployeeWhereInput = { status: { not: "Inactive" } };
      if (policy.scope.startsWith("Department: ")) {
        employeeWhere.department = { is: { name: policy.scope.slice("Department: ".length) } };
      } else if (policy.scope.startsWith("Location: ")) {
        employeeWhere.location = { is: { name: policy.scope.slice("Location: ".length) } };
      }
      return { affected_employee_count: await tx.employee.count({ where: employeeWhere }) };
    },
    submitRequest: workflowService.submitRequest,
    linkOwner: async (tx, workflowInstanceId) => {
      const claimed = await tx.policyVersion.updateMany({
        where: { id: current.id, approvalStatus: current.approvalStatus, workflowInstanceId: current.workflowInstanceId },
        data: { approvalStatus: "Pending Approval", workflowInstanceId },
      });
      if (claimed.count !== 1) throw AppError.conflict("This policy version changed while approval was being submitted.");
      await tx.policy.update({ where: { id }, data: { status: "Pending Approval" } });
      return tx.policy.findUniqueOrThrow({ where: { id }, include });
    },
  });
  void writeAuditLog({ actorUserId: actor?.sub, action: "UPDATE", entityType: "Policy", entityId: id, oldValue: { status: policy.status }, newValue: { status: "Pending Approval", versionNumber: current.versionNumber } });
  return { policy: serializePolicy(result) };
}

function serializeAcknowledgement(row: any) {
  return {
    id: row.id,
    policyId: row.version.policyId,
    versionId: row.versionId,
    employeeId: row.employee.employeeCode,
    employeeName: `${row.employee.firstName} ${row.employee.lastName}`,
    acknowledgedAt: dateOnly(row.acknowledgedAt),
    device: row.device,
  };
}

const acknowledgementInclude = {
  version: { select: { policyId: true } },
  employee: { select: { employeeCode: true, firstName: true, lastName: true } },
};

export async function getMyAcknowledgements(actor?: AccessTokenPayload) {
  const employeeId = requireEmployee(actor);
  const rows = await prisma.policyAcknowledgement.findMany({ where: { employeeId }, include: acknowledgementInclude, orderBy: { acknowledgedAt: "desc" } });
  return rows.map(serializeAcknowledgement);
}

export async function acknowledgePolicy(policyId: string, versionId: string, device?: string, actor?: AccessTokenPayload) {
  const employeeId = requireEmployee(actor);
  const policy = await prisma.policy.findUnique({ where: { id: policyId }, include });
  if (!policy || policy.status !== "Published") throw AppError.notFound("Published policy not found");
  const current = policy.versions.at(-1);
  if (!current || current.id !== versionId) throw AppError.conflict("Only the current policy version can be acknowledged");
  if (!(await employeeScope(employeeId)).some((scope) => scope.toLowerCase() === policy.scope.toLowerCase())) {
    throw AppError.forbidden("This policy does not apply to your employee scope");
  }
  const acknowledgement = await prisma.policyAcknowledgement.upsert({
    where: { versionId_employeeId: { versionId, employeeId } },
    create: { versionId, employeeId, device: device?.slice(0, 255) || null },
    update: {},
    include: acknowledgementInclude,
  });
  void writeAuditLog({ actorUserId: actor?.sub, action: "APPROVE", entityType: "Policy", entityId: policyId, newValue: { versionId, employeeId, acknowledgement: true } });
  return serializeAcknowledgement(acknowledgement);
}

export async function getComplianceData(_actor?: AccessTokenPayload) {
  const [rows, employees] = await prisma.$transaction([
    prisma.policyAcknowledgement.findMany({ include: acknowledgementInclude, orderBy: { acknowledgedAt: "desc" } }),
    prisma.employee.findMany({
      where: { status: { not: "Inactive" } },
      select: { id: true, employeeCode: true, firstName: true, lastName: true, department: { select: { name: true } }, location: { select: { name: true } } },
      orderBy: { employeeCode: "asc" },
    }),
  ]);
  return {
    acknowledgements: rows.map(serializeAcknowledgement),
    employees: employees.map((employee) => ({
      id: employee.employeeCode,
      name: `${employee.firstName} ${employee.lastName}`,
      department: employee.department?.name ?? null,
      location: employee.location?.name ?? null,
    })),
  };
}
