import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAuditLog } from "../../services/audit.service";
import path from "path";
import { randomUUID } from "crypto";

import minioClient, {
  MINIO_BUCKET,
} from "../../config/minio";
import {
  serializeLeaveTypeList,
  serializeLeaveBalanceList,
  serializeLeaveRequestList,
} from "../../serializers/leave.serializer";
import { countWeekdays, startOfDay } from "../../serializers/helpers";
import type { AccessTokenPayload } from "../../lib/jwt";
import { attendanceEmployeeIds } from "../attendance/attendance.scope";
import { assertPeriodOpen } from "../attendance/payroll-lock";
import { materializeAttendanceDay } from "../attendance/attendance.roster";
import * as workflowService from "../workflow/workflow.service";

const REQUEST_INCLUDE = {
  employee: { select: { employeeCode: true, firstName: true, lastName: true, locationId: true, shiftId: true, shift: { select: { weeklyOffDays: true } } } },
  leaveType: true,
  approver: { select: { employeeCode: true, firstName: true, lastName: true } },
  workflowInstance: { select: { id: true, status: true, currentStepIndex: true, steps: { select: { name: true, status: true, approverName: true } } } },
} satisfies Prisma.LeaveRequestInclude;

const BALANCE_INCLUDE = { leaveType: true } satisfies Prisma.LeaveBalanceInclude;

function parseDateOnly(value: string, field: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw AppError.badRequest(`${field} must be YYYY-MM-DD`);
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) throw AppError.badRequest(`${field} is not a valid calendar date`);
  return date;
}

function addUtcDays(date: Date, days: number) { const next = new Date(date); next.setUTCDate(next.getUTCDate() + days); return next; }
function dateKey(date: Date) { return date.toISOString().slice(0, 10); }
function normalizePortion(value: unknown, fallback = "FULL") {
  const portion = String(value ?? fallback).toUpperCase();
  if (!["FULL", "FIRST_HALF", "SECOND_HALF"].includes(portion)) throw AppError.badRequest("Day portion must be FULL, FIRST_HALF or SECOND_HALF");
  return portion;
}

async function calculateEffectiveLeaveDays(employeeId: string, start: Date, end: Date, startDayPortion = "FULL", endDayPortion = "FULL") {
  const startPortion = normalizePortion(startDayPortion);
  const endPortion = normalizePortion(endDayPortion);
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { locationId: true, shift: { select: { weeklyOffDays: true } }, shiftAssignments: { where: { effectiveFrom: { lte: end }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: start } }] }, orderBy: { effectiveFrom: "desc" }, take: 1, select: { shift: { select: { weeklyOffDays: true } } } } },
  });
  if (!employee) throw AppError.notFound("Employee not found");
  const assignedWeeklyOff = employee.shiftAssignments[0]?.shift?.weeklyOffDays;
  const weeklyOffDays = Array.isArray(assignedWeeklyOff) ? assignedWeeklyOff.map(Number) : (Array.isArray(employee.shift?.weeklyOffDays) ? employee.shift.weeklyOffDays.map(Number) : [0, 6]);
  const holidays = await prisma.holiday.findMany({ where: { date: { gte: start, lte: end }, isMandatory: true, OR: [...(employee.locationId ? [{ locationId: employee.locationId }] : []), { locationId: null }] }, select: { date: true } });
  const holidayKeys = new Set(holidays.map((h) => dateKey(h.date)));
  let total = 0;
  const singleDay = dateKey(start) === dateKey(end);
  for (let cursor = new Date(start); cursor <= end; cursor = addUtcDays(cursor, 1)) {
    const key = dateKey(cursor);
    if (weeklyOffDays.includes(cursor.getUTCDay()) || holidayKeys.has(key)) continue;
    if (singleDay) { total += startPortion === "FULL" && endPortion === "FULL" ? 1 : (startPortion === "FIRST_HALF" && endPortion === "SECOND_HALF" ? 1 : 0.5); continue; }
    if (key === dateKey(start)) total += startPortion === "FULL" ? 1 : 0.5;
    else if (key === dateKey(end)) total += endPortion === "FULL" ? 1 : 0.5;
    else total += 1;
  }
  return Math.round(total * 2) / 2;
}

async function assertDatesOpen(start: Date, end: Date) { for (let cursor = new Date(start); cursor <= end; cursor = addUtcDays(cursor, 1)) await assertPeriodOpen(dateKey(cursor)); }
async function recalculateAffectedAttendance(employeeId: string, start: Date, end: Date) {
  for (let cursor = new Date(start); cursor <= end; cursor = addUtcDays(cursor, 1)) await materializeAttendanceDay(dateKey(cursor));
}

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

  // Reconcile displayed used days from APPROVED requests as well as the
  // LeaveBalance row. This repairs balances created before approval-deduction
  // logic was enabled and keeps the UI correct after an approval.
  const approvedRequests = await prisma.leaveRequest.findMany({
    where: {
      status: "Approved",
      ...(employee ? { employeeId: employee.id } : {}),
      startDate: { gte: new Date(`${year}-01-01T00:00:00Z`) },
    },
    select: { leaveTypeId: true, startDate: true, endDate: true, startDayPortion: true, endDayPortion: true },
  });

  const approvedByType = new Map<string, number>();
  for (const req of approvedRequests) {
    if (req.startDate.getUTCFullYear() !== year) continue;
    const days = await calculateEffectiveLeaveDays(
      employee!.id,
      req.startDate,
      req.endDate,
      req.startDayPortion,
      req.endDayPortion
    );
    approvedByType.set(req.leaveTypeId, (approvedByType.get(req.leaveTypeId) ?? 0) + days);
  }

  // Compute pending days using the same effective leave-day engine as application/approval.
  // This preserves half-day portions and excludes the employee's weekly-offs/holidays.
  const pendingRequests = await prisma.leaveRequest.findMany({
    where: {
      status: "Pending",
      ...(employee ? { employeeId: employee.id } : {}),
      startDate: { gte: new Date(`${year}-01-01T00:00:00Z`) },
    },
    select: { leaveTypeId: true, startDate: true, endDate: true, startDayPortion: true, endDayPortion: true },
  });

  const pendingByType = new Map<string, number>();
  for (const req of pendingRequests) {
    if (req.startDate.getUTCFullYear() !== year) continue;
    const days = await calculateEffectiveLeaveDays(
      employee!.id,
      req.startDate,
      req.endDate,
      req.startDayPortion,
      req.endDayPortion
    );
    pendingByType.set(req.leaveTypeId, (pendingByType.get(req.leaveTypeId) ?? 0) + days);
  }

  const data = balances.map((b) => ({
    ...b,
    // Approved requests are the source of truth for "used". This also
    // repairs any stale LeaveBalance.usedDays values from older approvals.
    usedDays: new Prisma.Decimal(approvedByType.get(b.leaveTypeId) ?? 0),
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
  const role = actor?.role?.toUpperCase();
  if (role === "EMPLOYEE" || role === "MANAGER") {
    if (!actor?.employeeId) throw AppError.forbidden("Account is not linked to an employee record");
    const visibleIds = await attendanceEmployeeIds({ role, employeeId: actor.employeeId });
    if (visibleIds) where.employeeId = { in: visibleIds };
  } else if (!role || !["HR", "ADMIN"].includes(role)) {
    throw AppError.forbidden("You are not authorized to view leave requests");
  }
  if (filters.employeeId) where.employee = { employeeCode: filters.employeeId };
  if (filters.status) where.status = filters.status;
  const rows = await prisma.leaveRequest.findMany({ where, include: REQUEST_INCLUDE, orderBy: { createdAt: "desc" } });
  const dayOverrides = new Map<string, number>();
  for (const row of rows) dayOverrides.set(row.id, await calculateEffectiveLeaveDays(row.employeeId, row.startDate, row.endDate, row.startDayPortion, row.endDayPortion));
  return { data: serializeLeaveRequestList(rows, dayOverrides), total: rows.length };
}

export interface ApplyLeaveInput {
  employeeId?: string; leaveTypeId: string; startDate: string; endDate: string; startDayPortion?: string; endDayPortion?: string; reason?: string;
  documentName?: string; documentUrl?: string; documentMimeType?: string; documentSize?: number;
}

export async function applyLeave(input: ApplyLeaveInput, actor?: AccessTokenPayload) {
  const start = parseDateOnly(input.startDate, "startDate");
  const end = parseDateOnly(input.endDate, "endDate");
  if (end < start) throw AppError.badRequest("End date cannot be before start date");
  if (start.getUTCFullYear() !== end.getUTCFullYear()) throw AppError.badRequest("Leave requests cannot span two calendar years; submit separate requests for each year");
  const startDayPortion = normalizePortion(input.startDayPortion);
  const endDayPortion = normalizePortion(input.endDayPortion);
  let employee = actor?.employeeId ? await prisma.employee.findUnique({ where: { id: actor.employeeId }, select: { id: true } }) : null;
  if (input.employeeId && input.employeeId !== "") {
    const canApplyForOthers = ["ADMIN", "HR"].includes(actor?.role?.toUpperCase() ?? "");
    if (!canApplyForOthers && input.employeeId !== actor?.employeeCode) throw AppError.forbidden("You cannot apply for leave on behalf of another employee");
    const target = await prisma.employee.findUnique({ where: { employeeCode: input.employeeId }, select: { id: true } });
    if (!target) throw AppError.notFound("Employee not found"); employee = target;
  }
  if (!employee) throw AppError.badRequest("Could not determine employee for leave application");
  const empRecord = await prisma.employee.findUnique({
    where: { id: employee.id },
    select: { id: true, employeeCode: true, status: true, locationId: true },
  });
  if (!empRecord) throw AppError.notFound("Employee not found");
  if (empRecord.status === "Inactive" || empRecord.status === "Terminated") throw AppError.badRequest("Inactive or terminated employees cannot apply for leave.");
  await assertDatesOpen(start, end);
  const days = await calculateEffectiveLeaveDays(employee.id, start, end, startDayPortion, endDayPortion);
  if (days <= 0) throw AppError.badRequest("Selected leave period contains no working time");
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.leaveTypeId);
  const leaveType = await prisma.leaveType.findFirst({ where: isUuid ? { id: input.leaveTypeId } : { code: input.leaveTypeId } });
  if (!leaveType) throw AppError.notFound("Leave type not found");
  const overlap = await prisma.leaveRequest.findFirst({ where: { employeeId: employee.id, status: { notIn: ["Rejected", "Cancelled"] }, startDate: { lte: end }, endDate: { gte: start } } });
  if (overlap) throw AppError.conflict("You already have a leave request overlapping these dates");
  const year = start.getUTCFullYear();
  // Unpaid/LWP leave is intentionally balance-free: it is approved as unpaid time
  // and converted to unpaid attendance/payroll days instead of consuming a leave bucket.
  if (leaveType.isPaid !== false) {
    const balance = await prisma.leaveBalance.findUnique({ where: { employeeId_leaveTypeId_year: { employeeId: employee.id, leaveTypeId: leaveType.id, year } } });
    const used = balance ? Number(balance.usedDays) : 0;
    const pendingRows = await prisma.leaveRequest.findMany({ where: { employeeId: employee.id, leaveTypeId: leaveType.id, status: "Pending" }, select: { startDate: true, endDate: true, startDayPortion: true, endDayPortion: true } });
    let pending = 0;
    for (const row of pendingRows) if (row.startDate.getUTCFullYear() === year) pending += await calculateEffectiveLeaveDays(employee.id, row.startDate, row.endDate, row.startDayPortion, row.endDayPortion);
    const total = balance ? Number(balance.totalDays) : Number(leaveType.defaultAnnualDays);
    const available = total - used - pending;
    if (days > available) throw AppError.conflict(`Insufficient leave balance for ${leaveType.name} (${Math.max(0, available)} day(s) available, ${days} requested)`);
  }

  const definition = await prisma.workflowDefinition.findFirst({
    where: { requestType: "Leave Request", status: "Active" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!definition) throw AppError.conflict("Leave workflow is not installed. Install it from Workflow Library first.");

  const request = await prisma.$transaction(async (tx) => {
    const workflow = await workflowService.submitRequest(
      definition.id,
      empRecord!.employeeCode,
      { duration_days: days, leave_type: leaveType.code },
      tx
    );
    return tx.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        startDate: start,
        endDate: end,
        startDayPortion,
        endDayPortion,
        reason: input.reason ?? null,
        status: "Pending",
        workflowInstanceId: workflow.data.id,
        documentName: input.documentName ?? null,
        documentUrl: input.documentUrl ?? null,
        documentMimeType: input.documentMimeType ?? null,
        documentSize: input.documentSize ?? null,
      },
      include: REQUEST_INCLUDE,
    });
  });

  writeAuditLog({
    action: "CREATE",
    entityType: "LeaveRequest",
    entityId: request.id,
    newValue: { leaveType: leaveType.code, start: input.startDate, end: input.endDate, days, startDayPortion, endDayPortion },
  });

  return { data: serializeLeaveRequestList([request], new Map([[request.id, days]]))[0] };
}

async function getRequestForAction(requestId: string) {
  const request = await prisma.leaveRequest.findUnique({ where: { id: requestId }, include: REQUEST_INCLUDE });
  if (!request) throw AppError.notFound("Leave request not found");
  return request;
}

async function assertLeaveDecisionScope(request: any, approverEmployeeId: string, role: string) {
  const normalizedRole = role.toUpperCase();
  if (request.employeeId === approverEmployeeId) throw AppError.forbidden("You cannot decide your own leave request");
  if (normalizedRole === "MANAGER") {
    const visibleIds = await attendanceEmployeeIds({ role: normalizedRole, employeeId: approverEmployeeId });
    if (!visibleIds || !visibleIds.includes(request.employeeId)) throw AppError.forbidden("You are not authorized to decide this leave request");
  } else if (!["ADMIN", "HR"].includes(normalizedRole)) throw AppError.forbidden("You are not authorized to decide leave requests");
}

export async function approveLeave(requestId: string, approverEmployeeId: string, role: string, comments?: string) {
  const request = await getRequestForAction(requestId);
  if (request.status !== "Pending") throw AppError.conflict(`Only pending requests can be approved (current: ${request.status})`);
  await assertLeaveDecisionScope(request, approverEmployeeId, role);
  await assertDatesOpen(request.startDate, request.endDate);
  const days = await calculateEffectiveLeaveDays(request.employeeId, request.startDate, request.endDate, request.startDayPortion, request.endDayPortion);
  if (days <= 0) throw AppError.badRequest("The leave request contains no working time");

  if (request.workflowInstanceId) {
    const approver = await prisma.employee.findUnique({ where: { id: approverEmployeeId }, select: { employeeCode: true, firstName: true, lastName: true } });
    if (!approver) throw AppError.notFound("Approver employee not found");
    const workflow = await workflowService.actOnStep(
      request.workflowInstanceId,
      approver.employeeCode,
      `${approver.firstName} ${approver.lastName}`.trim(),
      "approve",
      comments,
      { bypassRoleApprover: role === "ADMIN", actorRole: role }
    );
    if (workflow.data.status !== "Approved") {
      return { data: { id: request.id, status: request.status, workflowStatus: workflow.data.status, comments: comments ?? "" } };
    }
  }

  const updated = await prisma.$transaction(async (tx: any) => {
    const claimed = await tx.leaveRequest.updateMany({ where: { id: request.id, status: "Pending" }, data: { status: "Approved", approvedBy: approverEmployeeId, approvedOn: new Date(), comments: comments?.trim() || null } });
    if (claimed.count !== 1) throw AppError.conflict("This leave request was already processed by another approver");
    if (request.leaveType.isPaid !== false) {
      const balance = await tx.leaveBalance.findUnique({ where: { employeeId_leaveTypeId_year: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year: request.startDate.getUTCFullYear() } } });
      const total = balance ? Number(balance.totalDays) : Number(request.leaveType.defaultAnnualDays);
      const used = balance ? Number(balance.usedDays) : 0;
      if (used + days > total) throw AppError.conflict(`Insufficient leave balance at approval time (${Math.max(0, total - used)} day(s) available)`);
      await tx.leaveBalance.upsert({ where: { employeeId_leaveTypeId_year: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year: request.startDate.getUTCFullYear() } }, create: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year: request.startDate.getUTCFullYear(), totalDays: total, usedDays: days }, update: { usedDays: { increment: days } } });
    }
    return tx.leaveRequest.findUnique({ where: { id: request.id }, include: REQUEST_INCLUDE });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  // Rebuild the persisted usedDays from all approved requests so older
  // approvals (made before this deduction logic existed) are also reflected.
  if (request.leaveType.isPaid !== false) {
    const approvedForType = await prisma.leaveRequest.findMany({
      where: {
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        status: "Approved",
        startDate: { gte: new Date(`${request.startDate.getUTCFullYear()}-01-01T00:00:00Z`) },
        endDate: { lt: new Date(`${request.startDate.getUTCFullYear() + 1}-01-01T00:00:00Z`) },
      },
      select: { startDate: true, endDate: true, startDayPortion: true, endDayPortion: true },
    });
    let reconciledUsed = 0;
    for (const approved of approvedForType) {
      reconciledUsed += await calculateEffectiveLeaveDays(
        request.employeeId,
        approved.startDate,
        approved.endDate,
        approved.startDayPortion,
        approved.endDayPortion
      );
    }
    await prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year: request.startDate.getUTCFullYear(),
        },
      },
      create: {
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        year: request.startDate.getUTCFullYear(),
        totalDays: Number(request.leaveType.defaultAnnualDays),
        usedDays: reconciledUsed,
      },
      update: { usedDays: reconciledUsed },
    });
  }

  await recalculateAffectedAttendance(request.employeeId, request.startDate, request.endDate);
  writeAuditLog({ action: "APPROVE", entityType: "LeaveRequest", entityId: request.id, oldValue: { status: "Pending" }, newValue: { status: "Approved", comments: comments?.trim() || null, days } });
  return { data: { id: updated!.id, status: "Approved", comments: comments?.trim() || "", days } };
}

export async function rejectLeave(requestId: string, approverEmployeeId: string, role: string, comments?: string) {
  const rejectionReason = comments?.trim();
  if (!rejectionReason) throw AppError.badRequest("Rejection reason is required");
  const request = await getRequestForAction(requestId);
  if (request.status !== "Pending") throw AppError.conflict(`Only pending requests can be rejected (current: ${request.status})`);
  await assertLeaveDecisionScope(request, approverEmployeeId, role);
  await assertDatesOpen(request.startDate, request.endDate);

  if (request.workflowInstanceId) {
    const approver = await prisma.employee.findUnique({ where: { id: approverEmployeeId }, select: { employeeCode: true, firstName: true, lastName: true } });
    if (!approver) throw AppError.notFound("Approver employee not found");
    await workflowService.actOnStep(
      request.workflowInstanceId, approver.employeeCode, `${approver.firstName} ${approver.lastName}`.trim(),
      "reject", rejectionReason, { bypassRoleApprover: role.toUpperCase() === "ADMIN", actorRole: role }
    );
  }

  const updated = await prisma.leaveRequest.updateMany({
    where: { id: request.id, status: "Pending" },
    data: { status: "Rejected", approvedBy: approverEmployeeId, approvedOn: new Date(), comments: rejectionReason },
  });
  if (updated.count !== 1) throw AppError.conflict("This leave request was already processed by another approver");
  writeAuditLog({ action: "REJECT", entityType: "LeaveRequest", entityId: request.id, oldValue: { status: "Pending" }, newValue: { status: "Rejected", comments: rejectionReason } });
  return { data: { id: request.id, status: "Rejected", comments: rejectionReason } };
}

export async function cancelLeave(requestId: string, actor?: AccessTokenPayload) {
  if (!actor?.employeeId) throw AppError.forbidden("Account is not linked to an employee record");
  const request = await getRequestForAction(requestId);
  const role = actor.role?.toUpperCase();
  const privileged = ["ADMIN", "HR"].includes(role ?? "");
  if (!privileged && request.employeeId !== actor.employeeId) throw AppError.forbidden("You can only cancel your own leave requests");
  if (!["Pending", "Approved"].includes(request.status)) throw AppError.conflict(`Only pending or approved requests can be cancelled (current: ${request.status})`);
  await assertDatesOpen(request.startDate, request.endDate);
  const days = await calculateEffectiveLeaveDays(request.employeeId, request.startDate, request.endDate, request.startDayPortion, request.endDayPortion);
  await prisma.$transaction(async (tx: any) => {
    const claimed = await tx.leaveRequest.updateMany({ where: { id: request.id, status: request.status }, data: { status: "Cancelled", comments: "Cancelled by employee/HR" } });
    if (claimed.count !== 1) throw AppError.conflict("This leave request was already updated");
    if (request.status === "Approved" && request.leaveType.isPaid !== false) {
      const balance = await tx.leaveBalance.findUnique({ where: { employeeId_leaveTypeId_year: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year: request.startDate.getUTCFullYear() } } });
      if (balance) await tx.leaveBalance.update({ where: { id: balance.id }, data: { usedDays: { decrement: days } } });
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (request.status === "Approved") await recalculateAffectedAttendance(request.employeeId, request.startDate, request.endDate);
  writeAuditLog({ action: "CANCEL", entityType: "LeaveRequest", entityId: request.id, oldValue: { status: request.status }, newValue: { status: "Cancelled", days } });
  return { data: { id: request.id, status: "Cancelled" } };
}

export function normalizeDateRange(start: Date, end: Date): { start: Date; end: Date } {
  return { start: startOfDay(start), end: startOfDay(end) };
}

export async function uploadLeaveDocument(
  file: Express.Multer.File
) {
  if (!file) {
    throw AppError.badRequest("Document is required");
  }

  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    throw AppError.badRequest(
      "Only PDF, JPG and PNG files are allowed"
    );
  }

  const extension = path.extname(file.originalname);

  const objectName =
    `leave/documents/${randomUUID()}${extension}`;

  await minioClient.putObject(
    MINIO_BUCKET,
    objectName,
    file.buffer,
    file.size,
    {
      "Content-Type": file.mimetype,
    }
  );

  const fileName = objectName.split("/").pop();

  const fileUrl =
    `/uploads/leave/${fileName}`;

  return {
    data: {
      documentName: file.originalname,
      documentUrl: fileUrl,
      documentMimeType: file.mimetype,
      documentSize: file.size,
      objectName,
    },
  };
}

