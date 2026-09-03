import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAuditLog } from "../../services/audit.service";
import {
  serializeLeaveTypeList,
  serializeLeaveBalanceList,
  serializeLeaveRequestList,
} from "../../serializers/leave.serializer";
import { countWeekdays, startOfDay } from "../../serializers/helpers";
import type { AccessTokenPayload } from "../../lib/jwt";

const REQUEST_INCLUDE = {
  employee: { select: { employeeCode: true, firstName: true, lastName: true } },
  leaveType: true,
  approver: { select: { employeeCode: true, firstName: true, lastName: true } },
} satisfies Prisma.LeaveRequestInclude;

const BALANCE_INCLUDE = { leaveType: true } satisfies Prisma.LeaveBalanceInclude;

export async function listLeaveTypes() {
  const types = await prisma.leaveType.findMany({ orderBy: { name: "asc" } });
  return { data: serializeLeaveTypeList(types) };
}

export interface BalanceFilters {
  employeeId?: string;
  year?: number;
}

export async function getLeaveBalance(filters: BalanceFilters, actor?: AccessTokenPayload) {
  const year = filters.year ?? new Date().getFullYear();
  const requestedEmployeeCode = ["ADMIN", "HR"].includes(actor?.role ?? "")
    ? filters.employeeId
    : actor?.employeeCode;
  const employee = requestedEmployeeCode
    ? await prisma.employee.findUnique({ where: { employeeCode: requestedEmployeeCode }, select: { id: true } })
    : null;
  if (requestedEmployeeCode && !employee) throw AppError.notFound("Employee not found");

  const balances = await prisma.leaveBalance.findMany({
    where: { year, ...(employee ? { employeeId: employee.id } : {}) },
    include: BALANCE_INCLUDE,
    orderBy: { leaveType: { name: "asc" } },
  });

  // Compute pending days by summing weekdays between start/end of pending requests.
  const pendingRequests = await prisma.leaveRequest.findMany({
    where: {
      status: "Pending",
      ...(employee ? { employeeId: employee.id } : {}),
      startDate: { gte: new Date(`${year}-01-01T00:00:00Z`) },
    },
    select: { leaveTypeId: true, startDate: true, endDate: true },
  });

  const pendingByType = new Map<string, number>();
  for (const req of pendingRequests) {
    const days = countWeekdays(req.startDate, req.endDate);
    pendingByType.set(req.leaveTypeId, (pendingByType.get(req.leaveTypeId) ?? 0) + days);
  }

  const data = balances.map((b) => ({
    ...b,
    pendingDays: pendingByType.get(b.leaveTypeId) ?? 0,
  }));

  return { data: serializeLeaveBalanceList(data) };
}

export interface RequestFilters {
  employeeId?: string;
  status?: string;
}

export async function listLeaveRequests(filters: RequestFilters, actor?: AccessTokenPayload) {
  const where: Prisma.LeaveRequestWhereInput = {};
  if (actor?.role === "EMPLOYEE") {
    if (!actor.employeeId) throw AppError.forbidden("Employee account is not linked");
    where.employeeId = actor.employeeId;
  } else if (actor?.role === "MANAGER") {
    if (!actor.employeeId) throw AppError.forbidden("Manager account is not linked");
    where.OR = [
      { employeeId: actor.employeeId },
      { employee: { reportingManagerId: actor.employeeId } },
    ];
  } else if (filters.employeeId) {
    where.employee = { employeeCode: filters.employeeId };
  }
  if (filters.status) where.status = filters.status;

  const rows = await prisma.leaveRequest.findMany({
    where,
    include: REQUEST_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return { data: serializeLeaveRequestList(rows), total: rows.length };
}

export interface ApplyLeaveInput {
  employeeId?: string;
  leaveTypeId: string; // the public leave type code (LT01)
  startDate: string;
  endDate: string;
  reason?: string;
}

export async function applyLeave(input: ApplyLeaveInput, actor?: AccessTokenPayload) {
  const start = new Date(`${input.startDate}T00:00:00Z`);
  const end = new Date(`${input.endDate}T00:00:00Z`);
  if (end < start) throw AppError.badRequest("End date cannot be before start date");

  const days = countWeekdays(start, end);
  if (days <= 0) throw AppError.badRequest("Leave period contains no working days");

  // Never trust client: employee is resolved from the authenticated user unless
  // the caller is HR/admin and explicitly applies on behalf of someone.
  let employee = actor?.employeeId
    ? await prisma.employee.findUnique({ where: { id: actor.employeeId }, select: { id: true } })
    : null;

  if (input.employeeId && input.employeeId !== "") {
    const canApplyForOthers = ["ADMIN", "HR"].includes(actor?.role ?? "");
    if (!canApplyForOthers && input.employeeId !== actor?.employeeCode) {
      throw AppError.forbidden("You cannot apply for leave on behalf of another employee");
    }
    const target = await prisma.employee.findUnique({ where: { employeeCode: input.employeeId }, select: { id: true } });
    if (!target) throw AppError.notFound("Employee not found");
    employee = target;
  }
  if (!employee) throw AppError.badRequest("Employee could not be determined");

  const leaveType = await prisma.leaveType.findUnique({ where: { code: input.leaveTypeId } });
  if (!leaveType) throw AppError.notFound("Leave type not found");

  // Overlap check: no other non-rejected request spanning this range.
  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: employee.id,
      status: { notIn: ["Rejected", "Cancelled"] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (overlap) throw AppError.conflict("You already have a leave request overlapping these dates");

  // Balance check for the current year.
  const year = start.getUTCFullYear();
  const balance = await prisma.leaveBalance.findUnique({
    where: { employeeId_leaveTypeId_year: { employeeId: employee.id, leaveTypeId: leaveType.id, year } },
  });
  const used = balance ? Number(balance.usedDays) : 0;
  const available = balance ? Number(balance.totalDays) - used : leaveType.defaultAnnualDays;
  if (days > available) {
    throw AppError.conflict(`Insufficient leave balance for ${leaveType.name} (${available} day(s) available, ${days} requested)`);
  }

  const request = await prisma.leaveRequest.create({
    data: {
      employeeId: employee.id,
      leaveTypeId: leaveType.id,
      startDate: start,
      endDate: end,
      reason: input.reason ?? null,
      status: "Pending",
    },
    include: REQUEST_INCLUDE,
  });

  writeAuditLog({
    action: "CREATE",
    entityType: "LeaveRequest",
    entityId: request.id,
    newValue: { leaveType: leaveType.code, start: input.startDate, end: input.endDate, days },
  });

  return { data: serializeLeaveRequestList([request])[0] };
}

async function getRequestForAction(requestId: string) {
  const request = await prisma.leaveRequest.findUnique({ where: { id: requestId }, include: REQUEST_INCLUDE });
  if (!request) throw AppError.notFound("Leave request not found");
  return request;
}

export async function approveLeave(requestId: string, approverEmployeeId: string, comments?: string) {
  const request = await getRequestForAction(requestId);
  if (request.status !== "Pending") throw AppError.conflict(`Only pending requests can be approved (current: ${request.status})`);

  // No self-approval (maker-checker).
  if (request.employeeId === approverEmployeeId) {
    throw AppError.forbidden("You cannot approve your own leave request");
  }

  const days = countWeekdays(request.startDate, request.endDate);
  const updated = await prisma.$transaction(async (tx: any) => {
    const year = request.startDate.getUTCFullYear();
    const updatedReq = await tx.leaveRequest.update({
      where: { id: request.id },
      data: {
        status: "Approved",
        approvedBy: approverEmployeeId,
        approvedOn: new Date(),
        comments: comments ?? null,
      },
      include: REQUEST_INCLUDE,
    });

    await tx.leaveBalance.upsert({
      where: { employeeId_leaveTypeId_year: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year } },
      create: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year, totalDays: request.leaveType.defaultAnnualDays, usedDays: days },
      update: { usedDays: { increment: days } },
    });

    return updatedReq;
  });

  writeAuditLog({
    action: "APPROVE",
    entityType: "LeaveRequest",
    entityId: request.id,
    oldValue: { status: "Pending" },
    newValue: { status: "Approved", comments: comments ?? null },
  });

  return { data: { id: updated.id, status: "Approved", comments: comments ?? "" } };
}

export async function rejectLeave(requestId: string, approverEmployeeId: string, comments?: string) {
  const rejectionReason = comments?.trim();
  if (!rejectionReason) throw AppError.badRequest("Rejection reason is required");
  const request = await getRequestForAction(requestId);
  if (request.status !== "Pending") throw AppError.conflict(`Only pending requests can be rejected (current: ${request.status})`);

  if (request.employeeId === approverEmployeeId) {
    throw AppError.forbidden("You cannot reject your own leave request");
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: request.id },
    data: { status: "Rejected", approvedBy: approverEmployeeId, approvedOn: new Date(), comments: rejectionReason },
    include: REQUEST_INCLUDE,
  });

  writeAuditLog({
    action: "REJECT",
    entityType: "LeaveRequest",
    entityId: request.id,
    oldValue: { status: "Pending" },
    newValue: { status: "Rejected", comments: rejectionReason },
  });

  return { data: { id: updated.id, status: "Rejected", comments: rejectionReason } };
}

export function normalizeDateRange(start: Date, end: Date): { start: Date; end: Date } {
  return { start: startOfDay(start), end: startOfDay(end) };
}
