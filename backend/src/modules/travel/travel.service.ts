import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAuditLog } from "../../services/audit.service";
import { createInAppForEmployee } from "../notifications/notifications.service";
import * as workflowService from "../workflow/workflow.service";
import { isPastTripStartDate, validateTravelDateRange } from "./travel.dates";
import { assertNotOwnTravelAction, assertPassportOnFile, calculateTravelSettlement, createTravelAdvanceRecoverySettlement, travelAdvanceValidationError } from "./travel.settlement";

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
  workflowInstance: {
    select: {
      status: true,
      steps: {
        select: {
          approverId: true,
          approverName: true,
          escalatedTo: true,
          escalatedToName: true,
          status: true,
          name: true,
          actedByName: true,
          roleApproverOverride: true,
        },
      },
    },
  },
} satisfies Prisma.TravelRequestInclude;

function actorName(actor: TravelActor) {
  return actor.name || actor.employeeCode;
}

function json<T>(value: Prisma.JsonValue | null): T | null {
  return value as T | null;
}

function serialize(row: any) {
  const pendingStep = row.workflowInstance?.steps?.find((step: any) => step.status === "Pending");
  const currentApprover = pendingStep
    ? pendingStep.approverId?.startsWith("role-")
      ? pendingStep.approverId.slice(5).toUpperCase()
      : pendingStep.escalatedToName || pendingStep.approverName
    : null;
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
    currentApprover,
    adminOverrides: row.workflowInstance?.steps
      ?.filter((step: any) => step.roleApproverOverride)
      .map((step: any) => ({ step: step.name, actorName: step.actedByName })) ?? [],
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
  const dates = validateTravelDateRange(input.startDate, input.endDate);
  if ("error" in dates && dates.error) throw AppError.badRequest(dates.error);
  const { start, end, durationDays } = dates;
  if (!input.destination.trim() || input.destination.trim().length < 2) throw AppError.badRequest("Destination is required");
  if (!input.purpose.trim() || input.purpose.trim().length < 10) throw AppError.badRequest("Business purpose must contain at least 10 characters");
  if (!Number.isFinite(Number(input.estimatedCost)) || Number(input.estimatedCost) <= 0) throw AppError.badRequest("Estimated cost must be greater than zero");
  return { start, end, durationDays };
}

async function notify(employeeId: string, title: string, body: string) {
  await createInAppForEmployee({ employeeId, title, body, category: "Travel", link: "/travel" });
}

async function notifyHr(title: string, body: string) {
  const recipients = await prisma.employee.findMany({ where: { user: { role: { name: { in: ["HR", "FINANCE", "ADMIN"] } }, isActive: true } }, select: { id: true } });
  await Promise.all(recipients.map((recipient) => notify(recipient.id, title, body)));
}

async function expireUnbookedRequests() {
  const today = new Date(new Date().toISOString().slice(0, 10));
  const candidates = await prisma.travelRequest.findMany({
    where: { status: { in: ["Approved", "Booking In Progress"] }, startDate: { lt: today } },
    select: { id: true, employeeId: true, requestNumber: true, status: true, advance: true, booking: true },
  });
  for (const candidate of candidates) {
    if (json<{ confirmedAt?: string | null }>(candidate.booking)?.confirmedAt) continue;
    const advanceGiven = json<{ amount: number }>(candidate.advance)?.amount || 0;
    const nextStatus = advanceGiven > 0 ? "Settlement Submitted" : "Expired";
    const settlement = advanceGiven > 0
      ? createTravelAdvanceRecoverySettlement(advanceGiven, "Unbooked trip expired after its start date; advance recovery is required.")
      : undefined;
    const updated = await prisma.$transaction(async (tx) => {
      const claim = await tx.travelRequest.updateMany({
        where: { id: candidate.id, status: candidate.status, startDate: { lt: today } },
        data: { status: nextStatus, ...(settlement ? { settlement: settlement as Prisma.InputJsonValue } : {}) },
      });
      if (!claim.count) return null;
      return tx.travelRequest.update({
        where: { id: candidate.id },
        data: { history: { create: {
          action: advanceGiven > 0 ? "EXPIRED_ADVANCE_RECOVERY" : "AUTO_EXPIRED",
          oldStatus: candidate.status,
          newStatus: nextStatus,
          comment: advanceGiven > 0 ? `Unbooked trip expired; recover ₹${advanceGiven.toLocaleString("en-IN")}.` : "Unbooked trip expired after its start date.",
        } } },
        select: { requestNumber: true },
      });
    });
    if (updated && advanceGiven > 0) {
      await notifyHr("Expired trip requires advance recovery", `${updated.requestNumber} expired unbooked; recover ₹${advanceGiven.toLocaleString("en-IN")} from the employee.`);
    } else if (updated) {
      await notify(candidate.employeeId, "Travel request expired", `${updated.requestNumber} expired because its start date passed before booking.`);
    }
  }
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
  await expireUnbookedRequests();
  const where: Prisma.TravelRequestWhereInput = {};
  const role = actor.role.toUpperCase();
  if (role === "ADMIN" || role === "HR" || role === "FINANCE") {
    // Operational roles can review all travel requests.
  } else if (role === "MANAGER") {
    where.OR = [{ employeeId: actor.employeeId }, { employee: { reportingManagerId: actor.employeeId } }];
  } else {
    where.employeeId = actor.employeeId;
  }
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
  const overlap = await prisma.travelRequest.findFirst({
    where: { id: { not: id }, employeeId: actor.employeeId, status: { in: ACTIVE_STATUSES }, startDate: { lte: end }, endDate: { gte: start } },
    select: { requestNumber: true },
  });
  if (overlap) throw AppError.conflict(`Travel dates overlap with active request ${overlap.requestNumber}`);
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

export async function editPendingRequest(id: string, input: TravelInput, actor: TravelActor) {
  const existing = await prisma.travelRequest.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Travel request not found");
  if (existing.employeeId !== actor.employeeId) throw AppError.forbidden("You can edit only your own travel request");
  if (!["Pending Manager Approval", "Resubmitted"].includes(existing.status)) {
    throw AppError.conflict("Only requests awaiting manager approval can be edited.");
  }

  const { start, end, durationDays } = validate(input);
  const overlap = await prisma.travelRequest.findFirst({
    where: { id: { not: id }, employeeId: actor.employeeId, status: { in: ACTIVE_STATUSES }, startDate: { lte: end }, endDate: { gte: start } },
    select: { requestNumber: true },
  });
  if (overlap) throw AppError.conflict(`Travel dates overlap with active request ${overlap.requestNumber}`);
  const def = await definition();

  const row = await prisma.$transaction(async (tx) => {
    const workflow = await workflowService.submitRequest(
      def.id,
      actor.employeeCode,
      { estimated_cost: Number(input.estimatedCost), duration_days: durationDays },
      tx
    );
    if (existing.workflowInstanceId) {
      await tx.workflowInstanceStep.updateMany({
        where: { instanceId: existing.workflowInstanceId, status: "Pending" },
        data: { status: "Cancelled" },
      });
      await tx.workflowInstance.updateMany({
        where: { id: existing.workflowInstanceId, status: "In Progress" },
        data: { status: "Cancelled" },
      });
    }
    return tx.travelRequest.update({
      where: { id },
      data: {
        workflowInstanceId: workflow.data.id,
        destination: input.destination.trim(),
        startDate: start,
        endDate: end,
        purpose: input.purpose.trim(),
        mode: input.mode,
        estimatedCost: Number(input.estimatedCost),
        isInternational: Boolean(input.isInternational),
        status: "Pending Manager Approval",
        decisionNotes: null,
        history: {
          create: {
            actorId: actor.employeeId,
            action: "EDIT_RESUBMIT",
            oldStatus: existing.status,
            newStatus: "Pending Manager Approval",
            comment: "Request updated and resubmitted for approval.",
          },
        },
      },
      include,
    });
  });

  await writeAuditLog({
    actorUserId: actor.userId,
    action: "UPDATE",
    entityType: "TravelRequest",
    entityId: id,
    oldValue: { status: existing.status, estimatedCost: Number(existing.estimatedCost) },
    newValue: { status: row.status, estimatedCost: Number(row.estimatedCost) },
  });
  return { data: serialize(row) };
}

export async function cancelRequest(id: string, reason: string, actor: TravelActor) {
  const cancellationReason = reason.trim();
  if (!cancellationReason) throw AppError.badRequest("A cancellation reason is required.");
  const existing = await prisma.travelRequest.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Travel request not found");
  if (existing.employeeId !== actor.employeeId) throw AppError.forbidden("You can cancel only your own travel request");
  if (!["Pending Manager Approval", "More Details Required", "Resubmitted", "Pending Finance Approval", "Approved", "Booking In Progress"].includes(existing.status)) {
    throw AppError.conflict("Only unbooked travel requests can be cancelled.");
  }
  const advanceGiven = json<{ amount: number }>(existing.advance)?.amount || 0;
  const nextStatus = advanceGiven > 0 ? "Settlement Submitted" : "Cancelled";
  const settlement = advanceGiven > 0
    ? createTravelAdvanceRecoverySettlement(advanceGiven, `Cancelled before travel: ${cancellationReason}`)
    : undefined;
  const row = await prisma.$transaction(async (tx) => {
    const changed = await tx.travelRequest.updateMany({ where: { id, status: existing.status }, data: {
      status: nextStatus,
      decisionNotes: cancellationReason,
      ...(settlement ? { settlement: settlement as Prisma.InputJsonValue } : {}),
    } });
    if (!changed.count) throw AppError.conflict("This travel request was updated by another action. Refresh and try again.");
    return tx.travelRequest.update({ where: { id }, data: {
      history: { create: { actorId: actor.employeeId, action: "CANCEL", oldStatus: existing.status, newStatus: nextStatus, comment: cancellationReason } },
    }, include });
  });
  await writeAuditLog({ actorUserId: actor.userId, action: "UPDATE", entityType: "TravelRequest", entityId: id, oldValue: { status: existing.status }, newValue: { status: nextStatus, reason: cancellationReason, advanceRecoveryRequired: advanceGiven > 0 } });
  if (advanceGiven > 0) await notifyHr("Cancelled travel request requires advance recovery", `${row.requestNumber} was cancelled before travel; recover ₹${advanceGiven.toLocaleString("en-IN")} from the employee.`);
  return { data: serialize(row) };
}

export async function decide(id: string, input: { action: "APPROVE" | "REJECT" | "REQUEST_MORE_DETAILS"; comment?: string }, actor: TravelActor) {
  const existing = await prisma.travelRequest.findUnique({ where: { id }, include: { employee: { select: { reportingManagerId: true, firstName: true, lastName: true } } } });
  if (!existing) throw AppError.notFound("Travel request not found");
  if (existing.employeeId === actor.employeeId) throw AppError.forbidden("Self-approval is not allowed");
  const role = actor.role.toUpperCase();
  const isManager = role === "MANAGER";
  const isFinance = role === "FINANCE" || role === "ADMIN";
  if (isManager && existing.employee.reportingManagerId !== actor.employeeId) throw AppError.forbidden("Managers can act only on direct-report requests");
  if (!isManager && !isFinance) throw AppError.forbidden("Only the reporting manager, Finance, or Admin can approve travel");
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
  await workflowService.actOnStep(existing.workflowInstanceId, actor.employeeCode, actorName(actor), input.action === "APPROVE" ? "approve" : "reject", input.comment, {
    bypassRoleApprover: role === "ADMIN",
    actorRole: role,
  });

  let status: string;
  if (input.action === "REJECT") status = "Rejected";
  else if (isManager && Number(existing.estimatedCost) > FINANCE_THRESHOLD) status = "Pending Finance Approval";
  else status = "Approved";
  const row = await prisma.$transaction(async (tx) => {
    const changed = await tx.travelRequest.updateMany({
      where: { id, status: existing.status },
      data: {
        status,
        decisionNotes: input.comment || null,
        managerApprovedAt: isManager && input.action === "APPROVE" ? new Date() : undefined,
        financeApprovedAt: isFinance && input.action === "APPROVE" ? new Date() : undefined,
      },
    });
    if (!changed.count) throw AppError.conflict("This travel request was already acted on. Refresh before trying again.");
    return tx.travelRequest.update({ where: { id }, data: {
      history: { create: { actorId: actor.employeeId, action: `${isManager ? "MANAGER" : "FINANCE"}_${input.action}`, oldStatus: existing.status, newStatus: status, comment: input.comment } },
    }, include });
  });
  if (status === "Pending Finance Approval") await notifyHr("Travel budget awaiting approval", `${existing.employee.firstName} ${existing.employee.lastName}'s ${row.requestNumber} requires Finance review.`);
  else await notify(existing.employeeId, `Travel request ${status.toLowerCase()}`, input.comment || `${row.requestNumber} is now ${status}.`);
  await writeAuditLog({ actorUserId: actor.userId, action: input.action === "APPROVE" ? "APPROVE" : "REJECT", entityType: "TravelRequest", entityId: id, oldValue: { status: existing.status }, newValue: { status, comment: input.comment } });
  return { data: serialize(row) };
}

export async function book(id: string, input: { mode: "api" | "manual"; reference?: string; simulateFailure?: boolean }, actor: TravelActor) {
  if (!["HR", "ADMIN"].includes(actor.role.toUpperCase())) throw AppError.forbidden("Only HR/Admin Travel Desk can manage bookings");
  const existing = await prisma.travelRequest.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Travel request not found");
  if (!["Approved", "Booking In Progress"].includes(existing.status)) throw AppError.conflict("Request must be approved before booking");
  if (json<{ confirmedAt?: string | null }>(existing.booking)?.confirmedAt) throw AppError.conflict("This request already has a confirmed booking.");
  if (isPastTripStartDate(existing.startDate)) {
    await expireUnbookedRequests();
    throw AppError.conflict("Unbooked trips cannot be booked after the start date.");
  }
  if (input.mode === "manual" && !input.reference?.trim()) throw AppError.badRequest("Booking reference is required");
  if (existing.isInternational) {
    const passport = await prisma.employeeDocument.findFirst({
      where: {
        employeeId: existing.employeeId,
        documentType: { contains: "passport", mode: "insensitive" },
        verificationStatus: "Verified",
        status: "VERIFIED",
        OR: [{ expiryDate: null }, { expiryDate: { gte: existing.endDate } }],
      },
      select: { documentNumber: true, expiryDate: true },
    });
    try {
      assertPassportOnFile(true, passport?.documentNumber);
    } catch (error) {
      throw AppError.conflict(error instanceof Error ? error.message : "A verified passport must be on file before booking.");
    }
  }
  const failed = input.mode === "api" && Boolean(input.simulateFailure);
  const booking = failed
    ? { mode: "api", confirmedAt: null, reference: null, passportRefUsed: null, bookingFailed: true, failureNote: "Booking provider failed; manual booking is required." }
    : { mode: input.mode, confirmedAt: new Date().toISOString(), reference: input.reference?.trim() || `TKT-${Date.now().toString().slice(-8)}`, passportRefUsed: existing.isInternational ? "Verified securely at booking" : null, bookingFailed: false, failureNote: null };
  const status = failed ? "Booking In Progress" : "Booked";
  const row = await prisma.$transaction(async (tx) => {
    const changed = await tx.travelRequest.updateMany({
      where: { id, status: existing.status, startDate: { gte: new Date(new Date().toISOString().slice(0, 10)) } },
      data: { status, booking },
    });
    if (!changed.count) throw AppError.conflict("This request has already been booked or updated. Refresh before trying again.");
    return tx.travelRequest.update({ where: { id }, data: { history: { create: { actorId: actor.employeeId, action: failed ? "BOOKING_FAILED" : "BOOK", oldStatus: existing.status, newStatus: status, comment: failed ? "Booking provider failed; manual booking is required." : booking.reference } } }, include });
  });
  await notify(existing.employeeId, failed ? "Travel booking needs manual action" : "Travel booked", failed ? booking.failureNote! : `Booking reference: ${booking.reference}`);
  return { data: serialize(row), apiFailed: failed };
}

export async function disburseAdvance(id: string, amount: number, actor: TravelActor) {
  if (!["FINANCE", "ADMIN"].includes(actor.role.toUpperCase())) throw AppError.forbidden("Only Finance can disburse travel advances");
  const existing = await prisma.travelRequest.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Travel request not found");
  try {
    assertNotOwnTravelAction(existing.employeeId, actor.employeeId, "disburse an advance for");
  } catch (error) {
    throw AppError.forbidden(error instanceof Error ? error.message : "You cannot disburse an advance for your own request.");
  }
  if (!["Approved", "Booking In Progress", "Booked"].includes(existing.status)) throw AppError.conflict("Request must be approved before advance disbursement");
  if (isPastTripStartDate(existing.startDate)) throw AppError.conflict("Advances cannot be disbursed after the trip start date.");
  if (existing.advance) throw AppError.conflict("Advance has already been disbursed");
  const amountError = travelAdvanceValidationError(amount, Number(existing.estimatedCost), ADVANCE_PERCENT);
  if (amountError) throw AppError.badRequest(amountError);
  const advance = { amount, disbursedAt: new Date().toISOString(), disbursedBy: actorName(actor) };
  const row = await prisma.$transaction(async (tx) => {
    const changed = await tx.travelRequest.updateMany({
      where: {
        id,
        status: existing.status,
        startDate: { gte: new Date(new Date().toISOString().slice(0, 10)) },
        advance: { equals: Prisma.DbNull },
      },
      data: { advance },
    });
    if (!changed.count) throw AppError.conflict("An advance has already been disbursed or this request has changed.");
    return tx.travelRequest.update({ where: { id }, data: { history: { create: { actorId: actor.employeeId, action: "ADVANCE_DISBURSED", oldStatus: existing.status, newStatus: existing.status, comment: `₹${amount}` } } }, include });
  });
  await notify(existing.employeeId, "Travel advance disbursed", `₹${amount.toLocaleString("en-IN")} was recorded for ${row.requestNumber}.`);
  return { data: serialize(row) };
}

export async function submitSettlement(
  id: string,
  actualCost: number,
  notes: string | undefined,
  actor: TravelActor,
  itemization: Array<{ description: string; amount: number }> = []
) {
  const existing = await prisma.travelRequest.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Travel request not found");
  if (existing.employeeId !== actor.employeeId) throw AppError.forbidden("You can settle only your own travel request");
  if (existing.status !== "Booked") {
    if (existing.status === "Settlement Submitted" && json<{ cancelledBeforeTravel?: boolean }>(existing.settlement)?.cancelledBeforeTravel) {
      throw AppError.conflict("This cancelled request is awaiting recovery; contact Finance to resolve the disbursed advance.");
    }
    throw AppError.conflict("Only a booked trip can be settled");
  }
  const endDate = existing.endDate.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  if (today <= endDate) throw AppError.conflict("Settlement can be submitted only after the trip end date");
  if (!Number.isFinite(actualCost) || actualCost < 0 || actualCost > 9_999_999_999.99) throw AppError.badRequest("Actual cost must be between ₹0 and ₹9,999,999,999.99");
  const normalizedItems = itemization.map((item) => {
    const description = item.description.trim();
    if (!description || !Number.isFinite(item.amount) || item.amount < 0) {
      throw AppError.badRequest("Each itemized expense needs a description and a non-negative amount.");
    }
    return { description, amount: item.amount };
  });
  const itemizedTotal = normalizedItems.reduce((total, item) => total + item.amount, 0);
  if (normalizedItems.length && Math.round(itemizedTotal * 100) !== Math.round(actualCost * 100)) {
    throw AppError.badRequest("Itemized expenses must add up to the actual cost.");
  }
  const advance = json<{ amount: number }>(existing.advance)?.amount || 0;
  const settlement = {
    ...calculateTravelSettlement(actualCost, advance),
    submittedAt: new Date().toISOString(),
    notes: notes || "",
    itemization: normalizedItems,
    resolution: null,
  };
  const result = await prisma.$transaction(async (tx) => {
    const changed = await tx.travelRequest.updateMany({ where: { id, status: "Booked" }, data: {
      status: "Settlement Submitted",
      settlement: settlement as Prisma.InputJsonValue,
    } });
    if (!changed.count) throw AppError.conflict("This trip was already settled or updated. Refresh before trying again.");
    const claim = await tx.expenseClaim.create({ data: {
      claimNumber: `EXP-TRV-${Date.now()}`, employeeId: actor.employeeId, category: "Travel", amount: actualCost,
      expenseDate: existing.endDate, businessPurpose: `${existing.requestNumber}: ${existing.purpose}`, status: "Draft", isDraft: true,
    } });
    return tx.travelRequest.update({ where: { id }, data: { linkedExpenseClaimId: claim.id, history: { create: { actorId: actor.employeeId, action: "SETTLEMENT_SUBMITTED", oldStatus: existing.status, newStatus: "Settlement Submitted", comment: notes } } }, include });
  });
  await notifyHr("Travel settlement awaiting resolution", `${result.requestNumber} settlement has been submitted and linked to an expense draft.`);
  return { data: serialize(result) };
}

export async function resolveSettlement(id: string, input: { method?: string; note?: string; reference?: string }, actor: TravelActor) {
  if (!["FINANCE", "ADMIN"].includes(actor.role.toUpperCase())) throw AppError.forbidden("Only Finance can close travel settlements");
  const existing = await prisma.travelRequest.findUnique({ where: { id } });
  if (!existing || existing.status !== "Settlement Submitted") throw AppError.conflict("No submitted settlement is available");
  try {
    assertNotOwnTravelAction(existing.employeeId, actor.employeeId, "close");
  } catch (error) {
    throw AppError.forbidden(error instanceof Error ? error.message : "You cannot close your own travel settlement.");
  }
  const settlement = json<any>(existing.settlement)!;
  if (settlement.balance > 0 && !input.method?.trim()) throw AppError.badRequest("A resolution method is required for a non-zero balance");
  const allowedMethods = ["Reimbursed", "Refunded", "Payroll Deduction", "Written Off"];
  if (settlement.balance !== 0 && !allowedMethods.includes(input.method || "")) {
    throw AppError.badRequest("Select a valid settlement resolution method.");
  }
  settlement.resolution = {
    method: settlement.balance === 0 ? "No balance due" : input.method,
    note: input.note || "",
    reference: input.reference?.trim() || null,
    approvedBy: actorName(actor),
    resolvedAt: new Date().toISOString(),
  };
  const closeComment = settlement.balance === 0
    ? "No balance due"
    : [settlement.resolution.method, settlement.resolution.reference, input.note?.trim()].filter(Boolean).join(" — ");
  const row = await prisma.$transaction(async (tx) => {
    const changed = await tx.travelRequest.updateMany({ where: { id, status: "Settlement Submitted" }, data: { status: "Closed", settlement } });
    if (!changed.count) throw AppError.conflict("This settlement was already closed or updated. Refresh before trying again.");
    return tx.travelRequest.update({ where: { id }, data: { history: { create: { actorId: actor.employeeId, action: "SETTLEMENT_CLOSED", oldStatus: existing.status, newStatus: "Closed", comment: closeComment } } }, include });
  });
  await notify(existing.employeeId, "Travel settlement closed", `${row.requestNumber} has been closed.`);
  await writeAuditLog({ actorUserId: actor.userId, action: "APPROVE", entityType: "TravelSettlement", entityId: id, newValue: { method: settlement.resolution.method, status: "Closed" } });
  return { data: serialize(row) };
}

export async function maskedPassport(actor: TravelActor) {
  const doc = await prisma.employeeDocument.findFirst({
    where: {
      employeeId: actor.employeeId,
      documentType: { contains: "Passport", mode: "insensitive" },
      verificationStatus: "Verified",
      status: "VERIFIED",
      OR: [{ expiryDate: null }, { expiryDate: { gt: new Date(new Date().toISOString().slice(0, 10)) } }],
    },
    select: { documentNumber: true },
  });
  const value = doc?.documentNumber;
  return { data: value ? `•••••${value.slice(-2)}` : null };
}
