import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import type { AccessTokenPayload } from "../../lib/jwt";

async function actorName(actor?: AccessTokenPayload) {
  if (!actor?.employeeId) return actor?.role || "System";
  const employee = await prisma.employee.findUnique({
    where: { id: actor.employeeId },
    select: { firstName: true, lastName: true },
  });
  return employee ? `${employee.firstName} ${employee.lastName}` : actor.employeeCode || actor.role;
}

async function activity(actor: AccessTokenPayload | undefined, action: string, category: string, details: string, severity = "info") {
  await prisma.complianceActivity.create({ data: { actorName: await actorName(actor), action, category, details, severity } });
}

function withDerivedStatus<T extends { status: string; dueDate: Date }>(row: T) {
  const done = row.status === "Filed" || row.status === "Completed";
  return { ...row, status: !done && row.dueDate < new Date() ? "Overdue" : row.status };
}

export async function dashboard() {
  const now = new Date();
  const [overdueObligations, openCases, caseHolds, recordHolds, needsClassificationReview] = await Promise.all([
    prisma.complianceObligation.count({ where: { dueDate: { lt: now }, status: { notIn: ["Filed", "Completed"] } } }),
    prisma.complianceCase.count({ where: { status: { not: { startsWith: "Closed" } } } }),
    prisma.complianceCase.count({ where: { legalHold: true } }),
    prisma.complianceRetentionRecord.count({ where: { legalHold: true } }),
    prisma.complianceRetentionRecord.count({ where: { classification: "Unclassified", purgedAt: null } }),
  ]);
  return { overdueObligations, openCases, legalHoldsActive: caseHolds + recordHolds, needsClassificationReview };
}

export async function listObligations() {
  return (await prisma.complianceObligation.findMany({ orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }] })).map(withDerivedStatus);
}

export async function createObligation(input: any, actor?: AccessTokenPayload) {
  const obligation = await prisma.complianceObligation.create({ data: {
    title: input.title, category: input.category, dueDate: input.dueDate, owner: input.owner,
    recurrence: input.recurring, createdByUserId: actor?.sub,
  } });
  await activity(actor, "Obligation added", "Calendar", `Added \"${obligation.title}\", due ${obligation.dueDate.toISOString().slice(0, 10)}.`);
  return withDerivedStatus(obligation);
}

export async function markFiled(id: string, actor?: AccessTokenPayload) {
  const existing = await prisma.complianceObligation.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Compliance obligation not found");
  const status = ["POSH Training Review", "Policy Acknowledgement Review"].includes(existing.category) ? "Completed" : "Filed";
  const obligation = await prisma.complianceObligation.update({ where: { id }, data: { status, filedAt: new Date(), filedByUserId: actor?.sub } });
  await activity(actor, "Obligation completed", "Calendar", `Marked \"${obligation.title}\" as ${status}.`);
  return obligation;
}

export async function caseSummaries() {
  return prisma.complianceCase.findMany({
    select: { id: true, caseNumber: true, category: true, status: true, legalHold: true },
    orderBy: { openedAt: "desc" },
  });
}

async function requireCaseAccess(id: string, actor?: AccessTokenPayload) {
  const item = await prisma.complianceCase.findUnique({ where: { id } });
  if (!item) throw AppError.notFound("Compliance case not found");
  const investigators = Array.isArray(item.investigatorEmployeeIds) ? item.investigatorEmployeeIds.map(String) : [];
  if (actor?.role !== "ADMIN" && (!actor?.employeeId || !investigators.includes(actor.employeeId))) {
    await activity(actor, "Case access denied", "Compliance Case", `Access denied to ${item.caseNumber}.`, "warning");
    throw AppError.forbidden("You are not a named investigator on this confidential case");
  }
  const employees = investigators.length ? await prisma.employee.findMany({
    where: { id: { in: investigators } }, select: { id: true, employeeCode: true, firstName: true, lastName: true },
  }) : [];
  return { ...item, investigators: employees.map((e) => ({ id: e.id, employeeCode: e.employeeCode, name: `${e.firstName} ${e.lastName}` })) };
}

export const caseDetail = requireCaseAccess;

export async function setCaseHold(id: string, reason: string | null, actor?: AccessTokenPayload) {
  const item = await requireCaseAccess(id, actor);
  if (reason !== null && !reason.trim()) throw AppError.badRequest("A legal-hold reason is required");
  const updated = await prisma.complianceCase.update({ where: { id }, data: {
    legalHold: reason !== null, legalHoldReason: reason?.trim() || null, legalHoldBy: reason !== null ? await actorName(actor) : null,
  } });
  await activity(actor, reason !== null ? "Case legal hold applied" : "Case legal hold cleared", "Legal Hold", `${item.caseNumber}: ${reason || "hold cleared"}.`, "warning");
  return requireCaseAccess(updated.id, actor);
}

export function listRetention() {
  return prisma.complianceRetentionRecord.findMany({ orderBy: { retentionExpiresAt: "asc" } });
}

export async function setRecordHold(id: string, reason: string | null, actor?: AccessTokenPayload) {
  const existing = await prisma.complianceRetentionRecord.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Retention record not found");
  if (reason !== null && !reason.trim()) throw AppError.badRequest("A legal-hold reason is required");
  const record = await prisma.complianceRetentionRecord.update({ where: { id }, data: {
    legalHold: reason !== null, legalHoldReason: reason?.trim() || null, legalHoldBy: reason !== null ? await actorName(actor) : null,
  } });
  await activity(actor, reason !== null ? "Record legal hold applied" : "Record legal hold cleared", "Legal Hold", `${record.label}: ${reason || "hold cleared"}.`, "warning");
  return record;
}

export async function runRetention(actor?: AccessTokenPayload) {
  const records = await prisma.complianceRetentionRecord.findMany({ where: { purgedAt: null } });
  const now = new Date();
  const result = { purged: [] as string[], blockedByHold: [] as string[], needsReview: [] as string[], notDue: [] as string[] };
  await prisma.$transaction(async (tx) => {
    for (const record of records) {
      if (record.retentionExpiresAt > now) { result.notDue.push(record.id); continue; }
      if (record.legalHold) {
        result.blockedByHold.push(record.id);
        await tx.complianceRetentionRecord.update({ where: { id: record.id }, data: { jobStatus: "Blocked by Legal Hold" } });
      } else if (record.classification === "Unclassified") {
        result.needsReview.push(record.id);
        await tx.complianceRetentionRecord.update({ where: { id: record.id }, data: { jobStatus: "Needs Manual Classification Review" } });
      } else {
        result.purged.push(record.id);
        await tx.complianceRetentionRecord.update({ where: { id: record.id }, data: { jobStatus: "Purged", purgedAt: now } });
      }
    }
  });
  await activity(actor, "Retention job run", "Retention", `${result.purged.length} purged, ${result.blockedByHold.length} blocked, ${result.needsReview.length} need review.`);
  return result;
}

export async function auditFeed(filters: any) {
  const where: Prisma.AuditLogWhereInput = {};
  if (filters.fromDate || filters.toDate) where.createdAt = {
    ...(filters.fromDate ? { gte: filters.fromDate } : {}), ...(filters.toDate ? { lte: filters.toDate } : {}),
  };
  if (filters.moduleFilter) where.entityType = { contains: filters.moduleFilter, mode: "insensitive" };
  const rows = await prisma.auditLog.findMany({ where, include: { actor: { select: { email: true, employee: { select: { firstName: true, lastName: true } } } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return rows.map((row) => ({
    id: row.id, timestamp: row.createdAt, actor: row.actor?.employee ? `${row.actor.employee.firstName} ${row.actor.employee.lastName}` : row.actor?.email || "System",
    module: row.entityType, field: row.entityType, action: row.action, maskedValue: null, employeeRef: null,
  }));
}

export function activities() {
  return prisma.complianceActivity.findMany({ orderBy: { createdAt: "desc" }, take: 100 }).then((rows) => rows.map((row) => ({ ...row, timestamp: row.createdAt })));
}
