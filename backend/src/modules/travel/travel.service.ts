import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAuditLog } from "../../services/audit.service";
import { createInAppForEmployee } from "../notifications/notifications.service";
import * as workflowService from "../workflow/workflow.service";

const REQUEST_TYPE = "Business Travel";
const FINANCE_THRESHOLD = 10_000;
const ADVANCE_PERCENT = 70;
const ACTIVE_STATUSES = ["Pending Manager Approval", "More Details Required", "Resubmitted", "Pending Finance Approval", "Approved", "Booking In Progress", "Booked"];

export interface TravelActor {
  userId: string;
  employeeId: string;
  employeeCode: string;
  role: string;
  name: string;
}

export interface TravelInput {
  destination: string;
  startDate: string;
  endDate: string;
  purpose: string;
  mode: "Air" | "Rail" | "Road";
  estimatedCost: number;
  isInternational?: boolean;
}

const include = {
  employee: { select: { employeeCode: true, firstName: true, lastName: true, reportingManagerId: true, designation: { select: { level: true } } } },
  history: { include: { actor: { select: { employeeCode: true, firstName: true, lastName: true } } }, orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.TravelRequestInclude;

function actorName(actor: TravelActor) {
  return actor.name || actor.employeeCode;
}

function json<T>(value: Prisma.JsonValue | null): T | null {
  return value as T | null;
}

function serialize(row: any) {
  return {
    id: row.id,
    requestNumber: row.requestNumber,
    employeeId: row.employee.employeeCode,
    employeeName: `${row.employee.firstName} ${row.employee.lastName}`.trim(),
    grade: row.employee.designation?.level || "N/A",
    destination: row.destination,
    startDate: row.startDate.toISOString().slice(0, 10),
    endDate: row.endDate.toISOString().slice(0, 10),
    purpose: row.purpose,
    mode: row.mode,
    estimatedCost: Number(row.estimatedCost),
    isInternational: row.isInternational,
    status: row.status,
    decisionNotes: row.decisionNotes,
    advance: json(row.advance),
    booking: json(row.booking),
    settlement: json(row.settlement),
    linkedExpenseClaimId: row.linkedExpenseClaimId,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    history: row.history.map((event: any) => ({
      ...event,
      actorName: event.actor ? `${event.actor.firstName} ${event.actor.lastName}`.trim() : "System",
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

function validate(input: TravelInput) {
  const start = new Date(`${input.startDate}T00:00:00.000Z`);
  const end = new Date(`${input.endDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw AppError.badRequest("Valid travel dates are required");
  if (start < new Date(new Date().toISOString().slice(0, 10))) throw AppError.badRequest("Travel cannot start in the past");
  if (end < start) throw AppError.badRequest("End date cannot be before start date");
  const durationDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  if (durationDays > 90) throw AppError.badRequest("A travel request cannot exceed 90 days");
  if (!input.destination.trim() || input.destination.trim().length < 2) throw AppError.badRequest("Destination is required");
  if (!input.purpose.trim() || input.purpose.trim().length < 10) throw AppError.badRequest("Business purpose must contain at least 10 characters");
  if (!Number.isFinite(Number(input.estimatedCost)) || Number(input.estimatedCost) <= 0) throw AppError.badRequest("Estimated cost must be greater than zero");
  return { start, end, durationDays };
}

async function notify(employeeId: string, title: string, body: string) {
  await createInAppForEmployee({ employeeId, title, body, category: "Travel", link: "/travel" });
}

async function notifyHr(title: string, body: string) {
  const recipients = await prisma.employee.findMany({ where: { user: { role: { name: { in: ["HR", "ADMIN"] } }, isActive: true } }, select: { id: true } });
  await Promise.all(recipients.map((recipient) => notify(recipient.id, title, body)));
}

async function definition() {
  const row = await prisma.workflowDefinition.findFirst({ where: { requestType: REQUEST_TYPE, status: "Active" }, orderBy: { createdAt: "desc" } });
  if (!row) throw AppError.conflict("Business Travel workflow is not installed. Install it from Workflow Library first.");
  return row;
}

async function requestNumber() {
  const year = new Date().getUTCFullYear();
  const count = await prisma.travelRequest.count({ where: { createdAt: { gte: new Date(`${year}-01-01T00:00:00.000Z`) } } });
  return `TRV-${year}-${String(count + 1).padStart(5, "0")}`;
}

export async function list(actor: TravelActor) {
  const where: Prisma.TravelRequestWhereInput = {};
  if (actor.role === "EMPLOYEE") where.employeeId = actor.employeeId;
  if (actor.role === "MANAGER") where.OR = [{ employeeId: actor.employeeId }, { employee: { reportingManagerId: actor.employeeId } }];
  const rows = await prisma.travelRequest.findMany({ where, include, orderBy: { createdAt: "desc" } });
  return { data: rows.map(serialize) };
}

export async function create(input: TravelInput, actor: TravelActor) {
  const { start, end, durationDays } = validate(input);
  const overlap = await prisma.travelRequest.findFirst({
    where: { employeeId: actor.employeeId, status: { in: ACTIVE_STATUSES }, startDate: { lte: end }, endDate: { gte: start } },
    select: { requestNumber: true },
  });
  if (overlap) throw AppError.conflict(`Travel dates overlap with active request ${overlap.requestNumber}`);
  const def = await definition();
  const workflow = await workflowService.submitRequest(def.id, actor.employeeCode, { estimated_cost: Number(input.estimatedCost), duration_days: durationDays });
  const row = await prisma.travelRequest.create({
    data: {
      requestNumber: await requestNumber(), employeeId: actor.employeeId, workflowInstanceId: workflow.data.id,
      destination: input.destination.trim(), startDate: start, endDate: end, purpose: input.purpose.trim(), mode: input.mode,
      estimatedCost: Number(input.estimatedCost), isInternational: Boolean(input.isInternational),
      history: { create: { actorId: actor.employeeId, action: "SUBMIT", newStatus: "Pending Manager Approval", comment: input.purpose.trim() } },
    }, include,
  });
  const employee = await prisma.employee.findUnique({ where: { id: actor.employeeId }, select: { reportingManagerId: true } });
  if (employee?.reportingManagerId) await notify(employee.reportingManagerId, "Travel request awaiting review", `${actorName(actor)} submitted ${row.requestNumber} for ${row.destination}.`);
  await writeAuditLog({ actorUserId: actor.userId, action: "CREATE", entityType: "TravelRequest", entityId: row.id, newValue: { requestNumber: row.requestNumber, status: row.status } });
  return { data: serialize(row) };
}

export async function resubmit(id: string, input: TravelInput, actor: TravelActor) {
  const existing = await prisma.travelRequest.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Travel request not found");
  if (existing.employeeId !== actor.employeeId) throw AppError.forbidden("You can resubmit only your own travel request");
  if (existing.status !== "More Details Required") throw AppError.conflict("Only a sent-back request can be resubmitted");
  const { start, end } = validate(input);
  const row = await prisma.travelRequest.update({
    where: { id }, data: {
      destination: input.destination.trim(), startDate: start, endDate: end, purpose: input.purpose.trim(), mode: input.mode,
      estimatedCost: Number(input.estimatedCost), isInternational: Boolean(input.isInternational), status: "Resubmitted", decisionNotes: null,
      history: { create: { actorId: actor.employeeId, action: "RESUBMIT", oldStatus: existing.status, newStatus: "Resubmitted", comment: input.purpose.trim() } },
    }, include,
  });
  await writeAuditLog({ actorUserId: actor.userId, action: "UPDATE", entityType: "TravelRequest", entityId: id, oldValue: { status: existing.status }, newValue: { status: row.status } });
  return { data: serialize(row) };
}

export async function decide(id: string, input: { action: "APPROVE" | "REJECT" | "REQUEST_MORE_DETAILS"; comment?: string }, actor: TravelActor) {
  const existing = await prisma.travelRequest.findUnique({ where: { id }, include: { employee: { select: { reportingManagerId: true, firstName: true, lastName: true } } } });
  if (!existing) throw AppError.notFound("Travel request not found");
  if (existing.employeeId === actor.employeeId) throw AppError.forbidden("Self-approval is not allowed");
  const isManager = actor.role === "MANAGER";
  const isFinance = actor.role === "HR" || actor.role === "ADMIN";
  if (isManager && existing.employee.reportingManagerId !== actor.employeeId) throw AppError.forbidden("Managers can act only on direct-report requests");
  if (!isManager && !isFinance) throw AppError.forbidden("Only the reporting manager or HR/Admin can approve travel");
  if (input.action !== "APPROVE" && !input.comment?.trim()) throw AppError.badRequest("A comment is mandatory for rejection or send-back");

  if (input.action === "REQUEST_MORE_DETAILS") {
    if (!isManager || !["Pending Manager Approval", "Resubmitted"].includes(existing.status)) throw AppError.badRequest("Send-back is available only during manager review");
    const row = await prisma.travelRequest.update({ where: { id }, data: { status: "More Details Required", decisionNotes: input.comment, history: { create: { actorId: actor.employeeId, action: "REQUEST_MORE_DETAILS", oldStatus: existing.status, newStatus: "More Details Required", comment: input.comment } } }, include });
    await notify(existing.employeeId, "Travel request needs more details", input.comment!);
    return { data: serialize(row) };
  }

  if (isManager && !["Pending Manager Approval", "Resubmitted"].includes(existing.status)) throw AppError.badRequest("Request is not awaiting manager approval");
  if (isFinance && existing.status !== "Pending Finance Approval") throw AppError.badRequest("Request is not awaiting Finance review");
  if (!existing.workflowInstanceId) throw AppError.conflict("Travel request is not linked to a workflow instance");
  await workflowService.actOnStep(existing.workflowInstanceId, actor.employeeCode, actorName(actor), input.action === "APPROVE" ? "approve" : "reject", input.comment, { bypassRoleApprover: isFinance });

  let status: string;
  if (input.action === "REJECT") status = "Rejected";
  else if (isManager && Number(existing.estimatedCost) > FINANCE_THRESHOLD) status = "Pending Finance Approval";
  else status = "Approved";
  const row = await prisma.travelRequest.update({ where: { id }, data: {
    status, decisionNotes: input.comment || null,
    managerApprovedAt: isManager && input.action === "APPROVE" ? new Date() : undefined,
    financeApprovedAt: isFinance && input.action === "APPROVE" ? new Date() : undefined,
    history: { create: { actorId: actor.employeeId, action: `${isManager ? "MANAGER" : "FINANCE"}_${input.action}`, oldStatus: existing.status, newStatus: status, comment: input.comment } },
  }, include });
  if (status === "Pending Finance Approval") await notifyHr("Travel budget awaiting approval", `${existing.employee.firstName} ${existing.employee.lastName}'s ${row.requestNumber} requires Finance review.`);
  else await notify(existing.employeeId, `Travel request ${status.toLowerCase()}`, input.comment || `${row.requestNumber} is now ${status}.`);
  await writeAuditLog({ actorUserId: actor.userId, action: input.action === "APPROVE" ? "APPROVE" : "REJECT", entityType: "TravelRequest", entityId: id, oldValue: { status: existing.status }, newValue: { status, comment: input.comment } });
  return { data: serialize(row) };
}

export async function book(id: string, input: { mode: "api" | "manual"; reference?: string; simulateFailure?: boolean }, actor: TravelActor) {
  if (!["HR", "ADMIN"].includes(actor.role)) throw AppError.forbidden("Only HR/Admin Travel Desk can manage bookings");
  const existing = await prisma.travelRequest.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Travel request not found");
  if (!["Approved", "Booking In Progress"].includes(existing.status)) throw AppError.conflict("Request must be approved before booking");
  if (input.mode === "manual" && !input.reference?.trim()) throw AppError.badRequest("Booking reference is required");
  const failed = input.mode === "api" && Boolean(input.simulateFailure);
  const booking = failed
    ? { mode: "api", confirmedAt: null, reference: null, passportRefUsed: null, bookingFailed: true, failureNote: "Booking provider failed; manual booking is required." }
    : { mode: input.mode, confirmedAt: new Date().toISOString(), reference: input.reference?.trim() || `TKT-${Date.now().toString().slice(-8)}`, passportRefUsed: existing.isInternational ? "Verified securely at booking" : null, bookingFailed: false, failureNote: null };
  const status = failed ? "Booking In Progress" : "Booked";
  const row = await prisma.travelRequest.update({ where: { id }, data: { status, booking, history: { create: { actorId: actor.employeeId, action: failed ? "BOOKING_FAILED" : "BOOK", oldStatus: existing.status, newStatus: status, comment: failed ? booking.failureNote : booking.reference } } }, include });
  await notify(existing.employeeId, failed ? "Travel booking needs manual action" : "Travel booked", failed ? booking.failureNote! : `Booking reference: ${booking.reference}`);
  return { data: serialize(row), apiFailed: failed };
}

export async function disburseAdvance(id: string, amount: number, actor: TravelActor) {
  if (!["HR", "ADMIN"].includes(actor.role)) throw AppError.forbidden("Only HR/Admin Finance Desk can disburse advances");
  const existing = await prisma.travelRequest.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Travel request not found");
  if (!["Approved", "Booking In Progress", "Booked"].includes(existing.status)) throw AppError.conflict("Request must be approved before advance disbursement");
  if (existing.advance) throw AppError.conflict("Advance has already been disbursed");
  const max = Math.round(Number(existing.estimatedCost) * ADVANCE_PERCENT / 100);
  if (amount <= 0 || amount > max) throw AppError.badRequest(`Advance cannot exceed ${ADVANCE_PERCENT}% of estimated cost (₹${max.toLocaleString("en-IN")})`);
  const advance = { amount, disbursedAt: new Date().toISOString(), disbursedBy: actorName(actor) };
  const row = await prisma.travelRequest.update({ where: { id }, data: { advance, history: { create: { actorId: actor.employeeId, action: "ADVANCE_DISBURSED", oldStatus: existing.status, newStatus: existing.status, comment: `₹${amount}` } } }, include });
  await notify(existing.employeeId, "Travel advance disbursed", `₹${amount.toLocaleString("en-IN")} was recorded for ${row.requestNumber}.`);
  return { data: serialize(row) };
}

export async function submitSettlement(id: string, actualCost: number, notes: string | undefined, actor: TravelActor) {
  const existing = await prisma.travelRequest.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Travel request not found");
  if (existing.employeeId !== actor.employeeId) throw AppError.forbidden("You can settle only your own travel request");
  if (existing.status !== "Booked") throw AppError.conflict("Only a booked trip can be settled");
  if (new Date(existing.endDate) > new Date()) throw AppError.conflict("Settlement can be submitted only after the trip end date");
  if (!Number.isFinite(actualCost) || actualCost < 0) throw AppError.badRequest("Actual cost must be zero or greater");
  const advance = json<{ amount: number }>(existing.advance)?.amount || 0;
  const difference = actualCost - advance;
  const settlement = { actualCost, advanceGiven: advance, balance: Math.abs(difference), balanceType: difference > 0 ? "Due to Employee" : difference < 0 ? "Due from Employee" : null, submittedAt: new Date().toISOString(), notes: notes || "", resolution: null };
  const result = await prisma.$transaction(async (tx) => {
    const claim = await tx.expenseClaim.create({ data: {
      claimNumber: `EXP-TRV-${Date.now()}`, employeeId: actor.employeeId, category: "Travel", amount: actualCost,
      expenseDate: existing.endDate, businessPurpose: `${existing.requestNumber}: ${existing.purpose}`, status: "Draft", isDraft: true,
    } });
    return tx.travelRequest.update({ where: { id }, data: { status: "Settlement Submitted", settlement: settlement as Prisma.InputJsonValue, linkedExpenseClaimId: claim.id, history: { create: { actorId: actor.employeeId, action: "SETTLEMENT_SUBMITTED", oldStatus: existing.status, newStatus: "Settlement Submitted", comment: notes } } }, include });
  });
  await notifyHr("Travel settlement awaiting resolution", `${result.requestNumber} settlement has been submitted and linked to an expense draft.`);
  return { data: serialize(result) };
}

export async function resolveSettlement(id: string, input: { method?: string; note?: string }, actor: TravelActor) {
  if (!["HR", "ADMIN"].includes(actor.role)) throw AppError.forbidden("Only HR/Admin Finance Desk can close settlements");
  const existing = await prisma.travelRequest.findUnique({ where: { id } });
  if (!existing || existing.status !== "Settlement Submitted") throw AppError.conflict("No submitted settlement is available");
  const settlement = json<any>(existing.settlement)!;
  if (settlement.balance > 0 && !input.method?.trim()) throw AppError.badRequest("A resolution method is required for a non-zero balance");
  settlement.resolution = { method: input.method || "N/A — zero balance", note: input.note || "", approvedBy: actorName(actor), resolvedAt: new Date().toISOString() };
  const row = await prisma.travelRequest.update({ where: { id }, data: { status: "Closed", settlement, history: { create: { actorId: actor.employeeId, action: "SETTLEMENT_CLOSED", oldStatus: existing.status, newStatus: "Closed", comment: input.note } } }, include });
  await notify(existing.employeeId, "Travel settlement closed", `${row.requestNumber} has been closed.`);
  await writeAuditLog({ actorUserId: actor.userId, action: "APPROVE", entityType: "TravelSettlement", entityId: id, newValue: { method: settlement.resolution.method, status: "Closed" } });
  return { data: serialize(row) };
}

export async function maskedPassport(actor: TravelActor) {
  const doc = await prisma.employeeDocument.findFirst({ where: { employeeId: actor.employeeId, documentType: { contains: "Passport", mode: "insensitive" } }, select: { documentNumber: true } });
  const value = doc?.documentNumber;
  return { data: value ? `•••••${value.slice(-2)}` : null };
}
