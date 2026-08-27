import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAuditLog } from "../../services/audit.service";
import type { AccessTokenPayload } from "../../lib/jwt";

const CATEGORY_CONFIG = {
  "IT Tickets": { queue: "IT Support", slaHours: 8 },
  "HR Tickets": { queue: "HR", slaHours: 24 },
  "Finance Tickets": { queue: "Finance", slaHours: 24 },
  "Asset Support": { queue: "Asset Support Team", slaHours: 16 },
  "HR - Grievance/Confidential": { queue: "HR-Compliance (Restricted)", slaHours: 24 },
} as const;

const REOPEN_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
type Category = keyof typeof CATEGORY_CONFIG;

const include = {
  requester: { select: { employeeCode: true, firstName: true, lastName: true } },
  assignedTo: { select: { employeeCode: true, firstName: true, lastName: true } },
  comments: {
    include: { author: { select: { employeeCode: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.HelpdeskTicketInclude;

function requireEmployee(actor?: AccessTokenPayload) {
  if (!actor?.employeeId) throw AppError.forbidden("Account is not linked to an employee record");
  return actor.employeeId;
}

function isAgent(actor?: AccessTokenPayload) {
  return ["ADMIN", "HR"].includes(actor?.role ?? "");
}

function serialize(row: any, actor?: AccessTokenPayload) {
  const now = Date.now();
  const escalated = !["Resolved", "Closed"].includes(row.status) && now > new Date(row.slaDeadline).getTime();
  const canReopen = row.requesterId === actor?.employeeId && row.status === "Resolved" && row.resolvedAt && now <= new Date(row.resolvedAt).getTime() + REOPEN_WINDOW_MS;
  const comments = (row.comments ?? []).filter((c: any) => !c.isInternal || isAgent(actor));
  return {
    id: row.id,
    ticketNumber: row.ticketNumber,
    employeeId: row.requester.employeeCode,
    employeeName: `${row.requester.firstName} ${row.requester.lastName}`,
    category: row.category,
    queue: row.queue,
    subject: row.subject,
    description: row.description,
    priority: row.priority,
    status: row.status,
    isConfidential: row.isConfidential,
    attachmentFileName: row.attachmentFileName,
    assignedAgent: row.assignedTo ? `${row.assignedTo.firstName} ${row.assignedTo.lastName}` : "Unassigned",
    assignedEmployeeCode: row.assignedTo?.employeeCode ?? null,
    slaHours: CATEGORY_CONFIG[row.category as Category]?.slaHours ?? 24,
    slaDeadline: row.slaDeadline,
    escalated,
    escalatedTo: escalated ? "Queue owner" : null,
    resolutionNotes: row.resolutionNotes,
    resolvedOn: row.resolvedAt,
    createdOn: row.createdAt,
    updatedOn: row.updatedAt,
    canReopen,
    comments: comments.map((c: any) => ({
      id: c.id,
      author: `${c.author.firstName} ${c.author.lastName}`,
      message: c.message,
      isInternal: c.isInternal,
      timestamp: c.createdAt,
    })),
  };
}

async function nextTicketNumber() {
  const latest = await prisma.helpdeskTicket.findFirst({ orderBy: { createdAt: "desc" }, select: { ticketNumber: true } });
  const next = (Number(latest?.ticketNumber.replace(/\D/g, "")) || 0) + 1;
  return `TCK-${String(next).padStart(5, "0")}`;
}

function accessWhere(actor?: AccessTokenPayload): Prisma.HelpdeskTicketWhereInput {
  const employeeId = requireEmployee(actor);
  if (actor?.role === "ADMIN") return {};
  if (actor?.role === "HR") return { OR: [{ requesterId: employeeId }, { isConfidential: false }, { queue: "HR-Compliance (Restricted)" }] };
  return { requesterId: employeeId };
}

async function accessibleTicket(id: string, actor?: AccessTokenPayload) {
  const ticket = await prisma.helpdeskTicket.findFirst({ where: { id, AND: [accessWhere(actor)] }, include });
  if (!ticket) throw AppError.notFound("Helpdesk ticket not found");
  return ticket;
}

export function listQueues(actor?: AccessTokenPayload) {
  if (!isAgent(actor)) return [];
  return [...new Set(Object.values(CATEGORY_CONFIG).map((c) => c.queue))];
}

export async function listTickets(filters: { scope?: string; queue?: string; status?: string; search?: string; page?: number; limit?: number }, actor?: AccessTokenPayload) {
  const page = Number(filters.page ?? 1);
  const limit = Number(filters.limit ?? 20);
  const employeeId = requireEmployee(actor);
  const where: Prisma.HelpdeskTicketWhereInput = filters.scope === "queue"
    ? { AND: [accessWhere(actor), isAgent(actor) ? {} : { requesterId: employeeId }] }
    : { requesterId: employeeId };
  if (filters.queue) where.queue = filters.queue;
  if (filters.status) where.status = filters.status;
  if (filters.search) where.OR = [
    { ticketNumber: { contains: filters.search, mode: "insensitive" } },
    { subject: { contains: filters.search, mode: "insensitive" } },
    { description: { contains: filters.search, mode: "insensitive" } },
  ];
  const [rows, total] = await prisma.$transaction([
    prisma.helpdeskTicket.findMany({ where, include, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.helpdeskTicket.count({ where }),
  ]);
  return { data: rows.map((row) => serialize(row, actor)), total };
}

export async function getTicket(id: string, actor?: AccessTokenPayload) {
  return serialize(await accessibleTicket(id, actor), actor);
}

export async function createTicket(input: { category: Category; subject: string; description: string; priority: string; attachmentFileName?: string | null }, actor?: AccessTokenPayload) {
  const requesterId = requireEmployee(actor);
  const config = CATEGORY_CONFIG[input.category];
  const createdAt = new Date();
  const ticket = await prisma.helpdeskTicket.create({
    data: {
      ticketNumber: await nextTicketNumber(), requesterId, category: input.category,
      queue: config.queue, subject: input.subject.trim(), description: input.description.trim(),
      priority: input.priority, isConfidential: input.category === "HR - Grievance/Confidential",
      attachmentFileName: input.attachmentFileName || null,
      slaDeadline: new Date(createdAt.getTime() + config.slaHours * 60 * 60 * 1000), createdAt,
    }, include,
  });
  void writeAuditLog({ actorUserId: actor?.sub, action: "CREATE", entityType: "HelpdeskTicket", entityId: ticket.id, newValue: { ticketNumber: ticket.ticketNumber, category: ticket.category, priority: ticket.priority } });
  return serialize(ticket, actor);
}

export async function addComment(id: string, input: { message: string; isInternal?: boolean }, actor?: AccessTokenPayload) {
  const authorId = requireEmployee(actor);
  const ticket = await accessibleTicket(id, actor);
  if (ticket.status === "Closed") throw AppError.conflict("Closed tickets cannot receive comments");
  if (input.isInternal && !isAgent(actor)) throw AppError.forbidden("Only helpdesk agents can add internal notes");
  await prisma.helpdeskComment.create({ data: { ticketId: ticket.id, authorId, message: input.message.trim(), isInternal: Boolean(input.isInternal) } });
  void writeAuditLog({ actorUserId: actor?.sub, action: "UPDATE", entityType: "HelpdeskTicket", entityId: ticket.id, newValue: { commentAdded: true, internal: Boolean(input.isInternal) } });
  return getTicket(id, actor);
}

export async function assignTicket(id: string, employeeCode: string, actor?: AccessTokenPayload) {
  const ticket = await accessibleTicket(id, actor);
  const assignee = await prisma.employee.findUnique({ where: { employeeCode }, select: { id: true } });
  if (!assignee) throw AppError.notFound("Assignee employee not found");
  const updated = await prisma.helpdeskTicket.update({ where: { id }, data: { assignedToId: assignee.id, status: ticket.status === "Open" ? "Assigned" : ticket.status }, include });
  void writeAuditLog({ actorUserId: actor?.sub, action: "UPDATE", entityType: "HelpdeskTicket", entityId: id, oldValue: { assignedToId: ticket.assignedToId }, newValue: { assignedToId: assignee.id } });
  return serialize(updated, actor);
}

export async function updateStatus(id: string, input: { status: string; resolutionNotes?: string }, actor?: AccessTokenPayload) {
  const ticket = await accessibleTicket(id, actor);
  if (["In Progress", "Resolved"].includes(input.status) && !ticket.assignedToId) {
    throw AppError.conflict("Assign the ticket before starting or resolving it");
  }
  if (actor?.role === "HR" && ticket.assignedToId !== actor.employeeId) {
    throw AppError.forbidden("Only the assigned agent can update this ticket");
  }
  if (["Resolved", "Closed"].includes(input.status) && !input.resolutionNotes?.trim()) throw AppError.badRequest("Resolution notes are required");
  if (ticket.status === "Closed") throw AppError.conflict("Closed tickets cannot be updated");
  const now = new Date();
  const updated = await prisma.helpdeskTicket.update({
    where: { id },
    data: {
      status: input.status,
      resolutionNotes: input.resolutionNotes?.trim() || ticket.resolutionNotes,
      resolvedAt: input.status === "Resolved" ? now : ticket.resolvedAt,
      closedAt: input.status === "Closed" ? now : ticket.closedAt,
    }, include,
  });
  void writeAuditLog({ actorUserId: actor?.sub, action: "UPDATE", entityType: "HelpdeskTicket", entityId: id, oldValue: { status: ticket.status }, newValue: { status: input.status } });
  return serialize(updated, actor);
}

export async function reopenTicket(id: string, reason: string, actor?: AccessTokenPayload) {
  const ticket = await accessibleTicket(id, actor);
  const requesterId = requireEmployee(actor);
  if (ticket.requesterId !== requesterId) throw AppError.forbidden("Only the requester can reopen this ticket");
  if (ticket.status !== "Resolved" || !ticket.resolvedAt) throw AppError.conflict("Only resolved tickets can be reopened");
  if (Date.now() > ticket.resolvedAt.getTime() + REOPEN_WINDOW_MS) throw AppError.conflict("The 3-day reopen window has expired");
  const updated = await prisma.$transaction(async (tx) => {
    await tx.helpdeskComment.create({ data: { ticketId: id, authorId: requesterId, message: reason.trim() } });
    // Keep the previous resolution details as history. A later resolution will
    // replace them with the newest resolution while the reopen reason remains
    // in the immutable conversation thread.
    return tx.helpdeskTicket.update({ where: { id }, data: { status: "Reopened", reopenedAt: new Date() }, include });
  });
  void writeAuditLog({ actorUserId: actor?.sub, action: "UPDATE", entityType: "HelpdeskTicket", entityId: id, oldValue: { status: "Resolved" }, newValue: { status: "Reopened" } });
  return serialize(updated, actor);
}
