import { Prisma, type ChecklistItemStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAuditLog } from "../../services/audit.service";
import { createInAppForEmployee } from "../notifications/notifications.service";

type DbClient = Prisma.TransactionClient | typeof prisma;
type TemplateItem = { key: string; category: string; title: string; owner: "HR" | "IT" | "Employee" | "Manager"; dueOffsetDays: number; dependsOn?: string };

const CHECKLIST_TEMPLATE: TemplateItem[] = [
  { key: "doc-upload", category: "Documents & Policy", title: "Upload ID & address proof", owner: "Employee", dueOffsetDays: -3 },
  { key: "doc-edu", category: "Documents & Policy", title: "Upload education certificates", owner: "Employee", dueOffsetDays: -3 },
  { key: "identity-verify", category: "Documents & Policy", title: "Verify identity documents", owner: "HR", dueOffsetDays: -2, dependsOn: "doc-upload" },
  { key: "policy-accept", category: "Documents & Policy", title: "Accept Code of Conduct & IT Policy", owner: "Employee", dueOffsetDays: -1 },
  { key: "personal-details", category: "Documents & Policy", title: "Complete remaining personal details", owner: "Employee", dueOffsetDays: -1 },
  { key: "it-account", category: "IT & Assets", title: "Create corporate email & core accounts", owner: "IT", dueOffsetDays: -1, dependsOn: "identity-verify" },
  { key: "asset-laptop", category: "IT & Assets", title: "Allocate laptop", owner: "IT", dueOffsetDays: 0 },
  { key: "asset-accesscard", category: "IT & Assets", title: "Allocate access card", owner: "IT", dueOffsetDays: 0 },
  { key: "laptop-handover", category: "IT & Assets", title: "Confirm laptop handover", owner: "Employee", dueOffsetDays: 0, dependsOn: "asset-laptop" },
  { key: "induction", category: "Induction & Buddy", title: "Attend induction session", owner: "HR", dueOffsetDays: 1 },
  { key: "buddy-assign", category: "Induction & Buddy", title: "Assign onboarding buddy", owner: "Manager", dueOffsetDays: -1 },
  { key: "probation-review", category: "Probation", title: "Schedule probation review", owner: "Manager", dueOffsetDays: 90 },
];

const includeItems = { checklistItems: { orderBy: { dueDate: "asc" as const } } };

function addDays(value: Date, days: number) { const result = new Date(value); result.setUTCDate(result.getUTCDate() + days); return result; }
function addMonths(value: Date, months: number) { const result = new Date(value); result.setUTCMonth(result.getUTCMonth() + months); return result; }

async function managerName(client: DbClient, reportingManagerId?: string | null) {
  if (!reportingManagerId) return null;
  const manager = await client.employee.findUnique({ where: { id: reportingManagerId }, select: { firstName: true, lastName: true } });
  return manager ? `${manager.firstName} ${manager.lastName}`.trim() : null;
}

/** Creates the durable onboarding record and its dependency-aware default checklist. */
export async function provisionOnboardingForEmployee(input: {
  employeeId: string; joinDate: Date; probationMonths?: number | null; reportingManagerId?: string | null;
}, client: DbClient = prisma) {
  const existing = await client.onboarding.findUnique({ where: { employeeId: input.employeeId }, include: { checklistItems: true } });
  const onboarding = existing ?? await client.onboarding.create({
    data: {
      employeeId: input.employeeId,
      joinDate: input.joinDate,
      probationEndDate: addMonths(input.joinDate, input.probationMonths ?? 6),
      buddy: await managerName(client, input.reportingManagerId),
    },
    include: { checklistItems: true },
  });
  if (onboarding.checklistItems.length > 0) return onboarding;

  const ids = new Map<string, string>();
  for (const template of CHECKLIST_TEMPLATE) {
    const dependencyTitle = CHECKLIST_TEMPLATE.find((item) => item.key === template.dependsOn)?.title;
    const created = await client.onboardingChecklistItem.create({
      data: {
        onboardingId: onboarding.id,
        title: template.title,
        category: template.category,
        owner: template.owner,
        dueDate: addDays(input.joinDate, template.dueOffsetDays),
        status: template.dependsOn ? "Blocked" : "Pending",
        dependsOn: template.dependsOn ? ids.get(template.dependsOn) : null,
        blockedReason: template.dependsOn ? `Waiting on "${dependencyTitle}"` : null,
      },
    });
    ids.set(template.key, created.id);
  }
  return onboarding;
}

async function ensureExistingChecklists() {
  const empty = await prisma.onboarding.findMany({ where: { checklistItems: { none: {} } }, select: { employeeId: true, joinDate: true } });
  for (const record of empty) {
    const employee = await prisma.employee.findUnique({ where: { id: record.employeeId }, select: { probationPeriodMonths: true, reportingManagerId: true } });
    await provisionOnboardingForEmployee({ employeeId: record.employeeId, joinDate: record.joinDate, probationMonths: employee?.probationPeriodMonths, reportingManagerId: employee?.reportingManagerId });
  }
}

export async function listOnboardingRecords() {
  await ensureExistingChecklists();
  const records = await prisma.onboarding.findMany({ include: includeItems, orderBy: { joinDate: "asc" } });
  return { data: await Promise.all(records.map(serializeOnboarding)) };
}

export async function getOnboardingRecord(employeeId: string) {
  let record = await prisma.onboarding.findUnique({ where: { employeeId }, include: includeItems });
  if (!record) throw AppError.notFound("Onboarding record not found");
  if (record.checklistItems.length === 0) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { probationPeriodMonths: true, reportingManagerId: true } });
    await provisionOnboardingForEmployee({ employeeId, joinDate: record.joinDate, probationMonths: employee?.probationPeriodMonths, reportingManagerId: employee?.reportingManagerId });
    record = await prisma.onboarding.findUnique({ where: { employeeId }, include: includeItems });
  }
  return { data: await serializeOnboarding(record) };
}

export async function getOnboardingSummary() {
  await ensureExistingChecklists();
  const records = await prisma.onboarding.findMany({ where: { status: { not: "CANCELLED" } }, include: { checklistItems: true } });
  const items = records.flatMap((record) => record.checklistItems);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const completeItems = items.filter((item) => item.status === "Complete").length;
  return { data: {
    newJoiners: records.filter((record) => record.status !== "COMPLETED").length,
    avgCompletion: items.length ? Math.round((completeItems / items.length) * 100) : 0,
    overdueItems: items.filter((item) => item.status !== "Complete" && item.status !== "Blocked" && new Date(item.dueDate) < today).length,
    pendingProcurement: items.filter((item) => item.status === "Pending_Procurement").length,
  } };
}

const TRANSITIONS: Record<ChecklistItemStatus, ChecklistItemStatus[]> = {
  Pending: ["Complete", "Pending_Procurement"],
  Pending_Procurement: ["Pending", "Complete"],
  Complete: ["Pending"],
  Blocked: [],
};

function normalizeStatus(status: string): ChecklistItemStatus {
  const normalized = status === "Pending Procurement" ? "Pending_Procurement" : status;
  if (!["Pending", "Complete", "Pending_Procurement"].includes(normalized)) throw AppError.badRequest(`Invalid checklist status: ${status}`);
  return normalized as ChecklistItemStatus;
}

export async function updateChecklistItemStatus(employeeId: string, itemId: string, requestedStatus: string, actorUserId?: string) {
  const status = normalizeStatus(requestedStatus);
  const onboarding = await prisma.onboarding.findUnique({ where: { employeeId }, include: { checklistItems: true } });
  if (!onboarding) throw AppError.notFound("Onboarding record not found");
  if (onboarding.status === "CANCELLED") throw AppError.conflict("Cancelled onboarding cannot be updated");
  const item = onboarding.checklistItems.find((entry) => entry.id === itemId);
  if (!item) throw AppError.notFound("Checklist item not found");
  if (!TRANSITIONS[item.status].includes(status)) throw AppError.conflict(`Checklist status cannot change from ${item.status} to ${status}`);
  if (status === "Complete" && item.dependsOn) {
    const dependency = onboarding.checklistItems.find((entry) => entry.id === item.dependsOn);
    if (!dependency || dependency.status !== "Complete") throw AppError.conflict(`Cannot complete "${item.title}" until "${dependency?.title ?? "its dependency"}" is complete`);
  }

  const updatedRecord = await prisma.$transaction(async (tx) => {
    await tx.onboardingChecklistItem.update({ where: { id: item.id }, data: { status, completedAt: status === "Complete" ? new Date() : null, blockedReason: null } });
    const dependents = onboarding.checklistItems.filter((entry) => entry.dependsOn === item.id);
    for (const dependent of dependents) {
      if (status === "Complete" && dependent.status === "Blocked") {
        await tx.onboardingChecklistItem.update({ where: { id: dependent.id }, data: { status: "Pending", blockedReason: null } });
      } else if (status !== "Complete" && dependent.status !== "Blocked") {
        await tx.onboardingChecklistItem.update({ where: { id: dependent.id }, data: { status: "Blocked", completedAt: null, blockedReason: `Waiting on "${item.title}"` } });
      }
    }
    const items = await tx.onboardingChecklistItem.findMany({ where: { onboardingId: onboarding.id } });
    const nextStatus = items.length > 0 && items.every((entry) => entry.status === "Complete")
      ? "COMPLETED"
      : items.some((entry) => entry.status === "Complete" || entry.status === "Pending_Procurement") ? "IN_PROGRESS" : "NOT_STARTED";
    await tx.onboarding.update({ where: { id: onboarding.id }, data: { status: nextStatus } });
    return tx.onboarding.findUnique({ where: { employeeId }, include: includeItems });
  });

  void writeAuditLog({ actorUserId, action: "UPDATE", entityType: "OnboardingChecklistItem", entityId: item.id, oldValue: { status: item.status }, newValue: { status, employeeId, title: item.title } });
  if (status === "Complete") void createInAppForEmployee({ employeeId, title: "Onboarding task completed", body: `${item.title} has been completed.`, category: "Onboarding Reminder", link: "/onboarding" }).catch(() => undefined);
  return { data: await serializeOnboarding(updatedRecord) };
}

async function serializeOnboarding(record: any) {
  if (!record) throw AppError.notFound("Onboarding record not found");
  const employee = await prisma.employee.findUnique({ where: { id: record.employeeId }, select: { firstName: true, lastName: true, avatarUrl: true, department: { select: { name: true } }, designation: { select: { title: true } } } });
  const employeeName = employee ? `${employee.firstName} ${employee.lastName ?? ""}`.trim() : "Unknown Employee";
  const today = new Date().toISOString().slice(0, 10);
  return {
    employeeId: record.employeeId, employeeName,
    avatar: employee?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(employeeName)}`,
    designation: employee?.designation?.title ?? "—", department: employee?.department?.name ?? "—",
    joinDate: new Date(record.joinDate).toISOString().slice(0, 10), buddy: record.buddy || "Not assigned",
    probationEndDate: new Date(record.probationEndDate).toISOString().slice(0, 10), status: record.status,
    items: (record.checklistItems ?? []).map((item: any) => {
      const dueDate = new Date(item.dueDate).toISOString().slice(0, 10);
      return { id: item.id, title: item.title, category: item.category, owner: item.owner, dueDate,
        status: item.status === "Pending_Procurement" ? "Pending Procurement" : item.status,
        dependsOn: item.dependsOn, blockedReason: item.blockedReason,
        isOverdue: !["Complete", "Blocked"].includes(item.status) && dueDate < today };
    }),
  };
}
