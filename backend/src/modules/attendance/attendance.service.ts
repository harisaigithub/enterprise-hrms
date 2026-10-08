import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAuditLog } from "../../services/audit.service";
import { createInAppForEmployee } from "../notifications/notifications.service";
import * as workflowService from "../workflow/workflow.service";
import { serializeAttendanceList, serializeTeamSummary } from "../../serializers/attendance.serializer";
import { formatDate } from "../../serializers/helpers";
import { attendanceEmployeeIds, requireAttendanceReader } from "./attendance.scope";
import type { AttendanceActor } from "./attendance.scope";
import { createShiftSchema } from "./attendance.schemas";
import { assertPeriodOpen } from "./payroll-lock";
import {
  addDays,
  DEFAULT_TIMEZONE,
  formatLocalTime,
  isValidLocalDate,
  localDateOf,
  localDateToDbDate,
  timeColumnToMinutes,
  zonedInstant,
} from "./attendance.time";
import type { ShiftSnapshot } from "./attendance.engine";

// Re-export roster functions for controller binding
export { getTeamSummary, getSummaryRows } from "./attendance.roster";

function formatTime(d: Date | null | undefined): string | null {
  if (!d) return null;
  return formatLocalTime(d, DEFAULT_TIMEZONE);
}

function toNumber(val: any): number {
  return val != null ? Number(val) : 0;
}

const PUNCH_INCLUDE = {
  employee: {
    select: {
      employeeCode: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.AttendancePunchInclude;

export async function resolveEmployeeId(employeeCode: string, actorEmployeeId?: string): Promise<string> {
  if (!actorEmployeeId) throw AppError.forbidden("Account is not linked to an employee record");
  const emp = await prisma.employee.findUnique({ where: { employeeCode }, select: { id: true } });
  if (!emp) throw AppError.notFound("Employee not found");
  if (emp.id !== actorEmployeeId) {
    throw AppError.forbidden("You can only manage your own attendance");
  }
  return emp.id;
}

export interface AttendanceFilters {
  employeeId?: string;
  month?: number;
  year?: number;
}

export async function listAttendance(filters: AttendanceFilters, actor?: AttendanceActor) {
  const visibleIds = await attendanceEmployeeIds(actor);

  const punchWhere: Prisma.AttendancePunchWhereInput = {};
  const dayWhere: Prisma.AttendanceDayWhereInput = {};

  if (visibleIds !== null) {
    punchWhere.employeeId = { in: visibleIds };
    dayWhere.employeeId = { in: visibleIds };
  }

  if (filters.employeeId) {
    punchWhere.employee = { employeeCode: filters.employeeId };
    dayWhere.employee = { employeeCode: filters.employeeId };
  }

  if (filters.month && filters.year) {
    const month = filters.month;
    const year = filters.year;
    const range = {
      gte: new Date(Date.UTC(year, month - 1, 1)),
      lt: new Date(Date.UTC(year, month, 1)),
    };
    punchWhere.punchDate = range;
    dayWhere.date = range;
  }

  // AttendanceDay is the finalized daily/payroll truth. AttendancePunch only
  // supplies raw punch-in/out details. Read both so leave/weekly-off/finalized
  // rows remain visible even when no physical punch exists.
  const [punches, days] = await Promise.all([
    prisma.attendancePunch.findMany({
      where: punchWhere,
      include: PUNCH_INCLUDE,
      orderBy: { punchDate: "desc" },
    }),
    prisma.attendanceDay.findMany({
      where: dayWhere,
      include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } } },
      orderBy: { date: "desc" },
    }),
  ]);

  return { data: serializeAttendanceList(punches, days) };
}

async function resolveShiftSnapshot(employeeId: string, businessDate: string): Promise<ShiftSnapshot> {
  const dbDate = localDateToDbDate(businessDate);
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      shiftId: true,
      shift: {
        select: {
          id: true, name: true, type: true, startTime: true, endTime: true,
          gracePeriodMinutes: true, breakDurationMinutes: true,
          overtimeThresholdHours: true,
          requiredMinutes: true, weeklyOffDays: true,
        },
      },
      shiftAssignments: {
        where: { effectiveFrom: { lte: dbDate }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: dbDate } }] },
        orderBy: { effectiveFrom: "desc" },
        take: 1,
        select: {
          shift: {
            select: {
              id: true, name: true, type: true, startTime: true, endTime: true,
              gracePeriodMinutes: true, breakDurationMinutes: true,
              overtimeThresholdHours: true, requiredMinutes: true, weeklyOffDays: true,
            },
          },
        },
      },
    },
  });
  if (!employee) throw AppError.notFound("Employee not found");
  const shift: any = employee.shiftAssignments[0]?.shift ?? employee.shift;
  if (!shift) {
    return {
      id: null, name: "Default (09:00-18:00)", type: "FIXED",
      startMinute: 540, endMinute: 1080, graceMinutes: 15, breakMinutes: 60,
      weeklyOffDays: [0, 6], requiredMinutes: 480, overtimeThresholdMinutes: 480,
    };
  }
  const startMinute = timeColumnToMinutes(shift.startTime);
  const endMinute = timeColumnToMinutes(shift.endTime);
  return {
    id: shift.id,
    name: shift.name,
    type: shift.type ?? (endMinute <= startMinute ? "OVERNIGHT" : "FIXED"),
    startMinute,
    endMinute,
    graceMinutes: shift.gracePeriodMinutes,
    breakMinutes: shift.breakDurationMinutes,
    requiredMinutes: shift.requiredMinutes ?? null,
    overtimeThresholdMinutes: shift.overtimeThresholdHours != null ? Math.round(Number(shift.overtimeThresholdHours) * 60) : null,
    weeklyOffDays: Array.isArray(shift.weeklyOffDays) ? shift.weeklyOffDays.map(Number) : [0, 6],
  };
}

async function resolvePunchBusinessDate(employeeId: string, now: Date): Promise<{ date: string; shift: ShiftSnapshot }> {
  const today = localDateOf(now, DEFAULT_TIMEZONE);
  const candidates = [today, addDays(today, -1)];
  for (const date of candidates) {
    const shift = await resolveShiftSnapshot(employeeId, date);
    const duration = (shift.endMinute - shift.startMinute + 1440) % 1440 || 1440;
    const start = zonedInstant(date, shift.startMinute, DEFAULT_TIMEZONE);
    const end = new Date(start.getTime() + duration * 60_000);
    const buffer = 120 * 60_000;
    if (now.getTime() >= start.getTime() && now.getTime() <= end.getTime() + buffer) {
      return { date, shift };
    }
  }
  return { date: today, shift: await resolveShiftSnapshot(employeeId, today) };
}

async function resolveOpenPunchContext(employeeId: string, now: Date) {
  const today = localDateOf(now, DEFAULT_TIMEZONE);
  for (const date of [today, addDays(today, -1)]) {
    const punch = await prisma.attendancePunch.findUnique({
      where: { employeeId_punchDate: { employeeId, punchDate: localDateToDbDate(date) } },
    });
    if (punch?.punchIn && !punch.punchOut) {
      return { date, shift: await resolveShiftSnapshot(employeeId, date), punch };
    }
  }
  return null;
}

async function refreshPunchFromEngine(employeeId: string, businessDate: string, now = new Date()) {
  const rows = await import("./attendance.roster.js").then((m) => m.computeDayRows(businessDate, [employeeId], now, DEFAULT_TIMEZONE));
  return rows[0]?.result ?? null;
}

async function persistAttendanceDayResult(employeeId: string, businessDate: string, result: any) {
  if (!result?.isFinal) return;
  const date = localDateToDbDate(businessDate);
  const period = await prisma.payrollPeriod.findFirst({
    where: { startDate: { lte: date }, endDate: { gte: date } },
    select: { status: true },
  });
  if (period && period.status !== "OPEN") return;
  await prisma.attendanceDay.upsert({
    where: { employeeId_date: { employeeId, date } },
   update: {
  status: result.dayStatus,
  scheduledHours: Number((result.scheduledMinutes / 60).toFixed(2)),
  actualHours: Number((result.workedMinutes / 60).toFixed(2)),
  shortfallHours: Number((result.shortfallMinutes / 60).toFixed(2)),
  overtimeHours: Number((result.approvedOvertimeMinutes || 0).toFixed(2)),

  payableDayFraction: Number((result.payableDayFraction || 0).toFixed(2)),
  lopFraction: Number((result.lopFraction || 0).toFixed(2)),
  unpaidLeaveFraction: Number((result.unpaidLeaveFraction || 0).toFixed(2)),
},
    create: {
  employeeId,
  date,
  status: result.dayStatus,
  scheduledHours: Number((result.scheduledMinutes / 60).toFixed(2)),
  actualHours: Number((result.workedMinutes / 60).toFixed(2)),
  shortfallHours: Number((result.shortfallMinutes / 60).toFixed(2)),
  overtimeHours: Number((result.approvedOvertimeMinutes || 0).toFixed(2)),

  payableDayFraction: Number((result.payableDayFraction || 0).toFixed(2)),
  lopFraction: Number((result.lopFraction || 0).toFixed(2)),
  unpaidLeaveFraction: Number((result.unpaidLeaveFraction || 0).toFixed(2)),
},
  });
}

export async function checkIn(employeeCode: string, actorEmployeeId?: string, method = "Web") {
  const allowedMethods = ["Web", "Biometric", "GPS"];
  if (!allowedMethods.includes(method)) throw AppError.badRequest("Unsupported attendance capture method");
  if (method === "Web" && process.env.ATTENDANCE_ALLOW_WEB_PUNCH === "false") {
    throw AppError.forbidden("Web attendance is disabled. Use biometric or GPS attendance.");
  }
  const empId = await resolveEmployeeId(employeeCode, actorEmployeeId);
  const now = new Date();
  const context = await resolvePunchBusinessDate(empId, now);
  const punchDate = localDateToDbDate(context.date);
  await assertPeriodOpen(context.date);

  const existing = await prisma.attendancePunch.findUnique({
    where: { employeeId_punchDate: { employeeId: empId, punchDate } },
  });
  if (existing?.punchIn) throw AppError.conflict("Already checked in for this attendance day");
  if (existing?.punchOut) throw AppError.conflict("Attendance record is already closed");

  const openPunch = await resolveOpenPunchContext(empId, now);
  if (openPunch) {
    throw AppError.conflict(`You already have an open attendance punch for ${openPunch.date}`);
  }

  let created;
  try {
    created = await prisma.attendancePunch.create({
      data: {
        employeeId: empId,
        punchDate,
        punchIn: now,
        method: method || "Web",
        status: "Present",
        scheduledHours: Number(((context.shift.requiredMinutes ?? Math.max(0, ((context.shift.endMinute - context.shift.startMinute + 1440) % 1440 || 1440) - context.shift.breakMinutes)) / 60).toFixed(2)),
      },
      include: PUNCH_INCLUDE,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw AppError.conflict("Attendance was already checked in. Refresh and try again.");
    }
    throw error;
  }

  const result = await refreshPunchFromEngine(empId, context.date, now);
  const status = result?.isLate ? "Late" : method?.toUpperCase() === "WFH" ? "WFH" : "Present";
  const updated = await prisma.attendancePunch.update({
    where: { id: created.id },
    data: {
      status,
      scheduledHours: result ? Number((result.scheduledMinutes / 60).toFixed(2)) : created.scheduledHours,
    },
    include: PUNCH_INCLUDE,
  });

  await writeAuditLog({
    action: "CREATE", entityType: "AttendancePunch", entityId: updated.id,
    newValue: { employeeId: empId, date: context.date, action: "CHECK_IN", method, status },
  });

  return {
    data: {
      employeeId: employeeCode,
      date: context.date,
      checkIn: formatLocalTime(updated.punchIn, DEFAULT_TIMEZONE),
      status,
      businessDate: context.date,
      shift: context.shift.name,
    },
  };
}

export async function checkOut(employeeCode: string, actorEmployeeId?: string) {
  const empId = await resolveEmployeeId(employeeCode, actorEmployeeId);
  const now = new Date();
  const openPunch = await resolveOpenPunchContext(empId, now);
  if (!openPunch) throw AppError.badRequest("Check in first before checking out");
  const context = { date: openPunch.date, shift: openPunch.shift };
  const punch = openPunch.punch;
  await assertPeriodOpen(context.date);

  const activeBreak = await prisma.attendanceBreak.findFirst({
    where: { employeeId: empId, endedAt: null },
    select: { id: true },
  });
  if (punch.punchOut) throw AppError.conflict("Already checked out for this attendance day");
  if (activeBreak) throw AppError.conflict("End your active break before checking out");

  const updated = await prisma.attendancePunch.update({ where: { id: punch.id }, data: { punchOut: now } });
  const result = await refreshPunchFromEngine(empId, context.date, now);
  if (!result) throw AppError.conflict("Attendance calculation could not be completed");

  await persistAttendanceDayResult(empId, context.date, result);
  const finalStatus = result.isLate ? "Late" : result.dayStatus === "HALF_DAY" ? "Half-Day" : result.dayStatus === "INCOMPLETE" ? "Incomplete" : "Present";
  const saved = await prisma.attendancePunch.update({
    where: { id: updated.id },
    data: {
      status: finalStatus,
      actualHours: Number((result.workedMinutes / 60).toFixed(2)),
      overtimeHours: Number((result.rawOvertimeMinutes / 60).toFixed(2)),
      scheduledHours: Number((result.scheduledMinutes / 60).toFixed(2)),
      isOvertimeApproved: result.approvedOvertimeMinutes > 0,
    },
    include: PUNCH_INCLUDE,
  });

  await writeAuditLog({
    action: "UPDATE", entityType: "AttendancePunch", entityId: saved.id,
    newValue: { employeeId: empId, date: context.date, action: "CHECK_OUT", actualHours: result.workedMinutes / 60, rawOvertimeHours: result.rawOvertimeMinutes / 60 },
  });

  return {
    data: {
      employeeId: employeeCode,
      date: context.date,
      checkOut: formatLocalTime(saved.punchOut, DEFAULT_TIMEZONE),
      status: finalStatus,
      hoursWorked: Number((result.workedMinutes / 60).toFixed(2)),
      overtimeHours: Number((result.rawOvertimeMinutes / 60).toFixed(2)),
    },
  };
}

export async function startBreak(employeeId: string, actorUserId: string, breakType = "Short Break") {
  const actor = await prisma.employee.findFirst({ where: { id: employeeId, userId: actorUserId }, select: { id: true } });
  if (!actor) throw AppError.forbidden("You can only manage your own breaks");
  const now = new Date();
  const context = await resolvePunchBusinessDate(employeeId, now);
  await assertPeriodOpen(context.date);
  const punch = await prisma.attendancePunch.findUnique({
    where: { employeeId_punchDate: { employeeId, punchDate: localDateToDbDate(context.date) } },
    select: { punchIn: true, punchOut: true },
  });

  if (!punch?.punchIn) throw AppError.badRequest("Check in first before starting a break");
  if (punch.punchOut) throw AppError.badRequest("A break cannot be started after check-out");

  try {
    const attendanceBreak = await prisma.attendanceBreak.create({ data: { employeeId, breakType } });

    await writeAuditLog({
      actorUserId,
      action: "CREATE",
      entityType: "AttendanceBreak",
      entityId: attendanceBreak.id,
      newValue: { employeeId, breakType, action: "BREAK_START", startedAt: attendanceBreak.startedAt },
    });

    return {
      data: {
        id: attendanceBreak.id,
        breakType: attendanceBreak.breakType,
        startTime: attendanceBreak.startedAt.toISOString(),
        endTime: null,
        durationMinutes: null,
      },
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw AppError.conflict("A break is already active");
    }
    throw error;
  }
}

export async function endBreak(employeeId: string, actorUserId: string) {
  const actor = await prisma.employee.findFirst({ where: { id: employeeId, userId: actorUserId }, select: { id: true } });
  if (!actor) throw AppError.forbidden("You can only manage your own breaks");
  const activeBreak = await prisma.attendanceBreak.findFirst({
    where: { employeeId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (!activeBreak) throw AppError.badRequest("No active break found");

  const endedAt = new Date();
  const durationMinutes = Math.max(0, Math.floor((endedAt.getTime() - activeBreak.startedAt.getTime()) / 60000));
  const closed = await prisma.attendanceBreak.updateMany({
    where: { id: activeBreak.id, endedAt: null },
    data: { endedAt, durationMinutes },
  });
  if (closed.count !== 1) throw AppError.conflict("This break has already ended");

  const attendanceBreak = await prisma.attendanceBreak.findUniqueOrThrow({ where: { id: activeBreak.id } });

  await writeAuditLog({
    actorUserId,
    action: "UPDATE",
    entityType: "AttendanceBreak",
    entityId: attendanceBreak.id,
    oldValue: { endedAt: null },
    newValue: { action: "BREAK_END", endedAt, durationMinutes },
  });

  return {
    data: {
      id: attendanceBreak.id,
      breakType: attendanceBreak.breakType,
      startTime: attendanceBreak.startedAt.toISOString(),
      endTime: attendanceBreak.endedAt?.toISOString() ?? null,
      durationMinutes: attendanceBreak.durationMinutes,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                         Attendance Regularization                          */
/* -------------------------------------------------------------------------- */

const REGULARIZATION_ACTIVE_STATUSES = ["Submitted", "More Details Required", "Resubmitted", "Manager Approved"];
const REGULARIZATION_REQUEST_TYPE = "Attendance Regularization";

type RegularizationActor = {
  userId: string;
  employeeId: string;
  employeeCode: string;
  role: string;
  name: string;
};

type RegularizationInput = {
  date: string;
  requestedStatus: string;
  requestedPunchIn?: string;
  requestedPunchOut?: string;
  reason: string;
};

function validateRegularizationInput(input: RegularizationInput) {
  if (!isValidLocalDate(input.date)) throw AppError.badRequest("A valid attendance date is required");
  const targetDate = localDateToDbDate(input.date);
  const todayLocal = localDateOf(new Date(), DEFAULT_TIMEZONE);
  if (input.date >= todayLocal) {
    throw AppError.badRequest("Regularization is allowed only for past attendance dates");
  }

  const punchIn = input.requestedPunchIn ? new Date(input.requestedPunchIn) : null;
  const punchOut = input.requestedPunchOut ? new Date(input.requestedPunchOut) : null;
  if (!punchIn || !punchOut || Number.isNaN(punchIn.getTime()) || Number.isNaN(punchOut.getTime())) {
    throw AppError.badRequest("Valid requested punch-in and punch-out times are required");
  }
  if (punchOut <= punchIn) throw AppError.badRequest("Punch-out must be later than punch-in");
  const hours = (punchOut.getTime() - punchIn.getTime()) / 3600000;
  if (hours > 18) throw AppError.badRequest("Requested work duration cannot exceed 18 hours");
  return { targetDate, punchIn, punchOut };
}

async function notifyEmployee(employeeId: string, title: string, body: string) {
  await createInAppForEmployee({ employeeId, title, body, category: "Attendance Regularization", link: "/attendance" });
}

async function notifyHr(title: string, body: string) {
  const recipients = await prisma.employee.findMany({
    where: { user: { role: { name: { in: ["HR", "ADMIN"] } }, isActive: true } },
    select: { id: true },
  });
  await Promise.all(recipients.map((employee) => notifyEmployee(employee.id, title, body)));
}

async function activeAttendanceDefinition() {
  const definition = await prisma.workflowDefinition.findFirst({
    where: { requestType: REGULARIZATION_REQUEST_TYPE, status: "Active" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!definition) {
    throw AppError.conflict("Attendance Regularization workflow is not installed. Install it from Workflow Library first.");
  }
  return definition;
}

export async function requestRegularization(
  employeeCode: string,
  input: RegularizationInput,
  actor: RegularizationActor
) {
  const empId = await resolveEmployeeId(employeeCode, actor.employeeId);
  const { targetDate, punchIn, punchOut } = validateRegularizationInput(input);
  await assertPeriodOpen(targetDate.toISOString().slice(0, 10));

  const duplicate = await prisma.attendanceRegularization.findFirst({
    where: { employeeId: empId, date: targetDate, status: { in: REGULARIZATION_ACTIVE_STATUSES } },
    select: { id: true, status: true },
  });
  if (duplicate) throw AppError.conflict(`An active regularization request already exists for this date (${duplicate.status})`);

  const monthStart = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth() + 1, 1));
  const monthlyRequestCount = await prisma.attendanceRegularization.count({
    where: { employeeId: empId, date: { gte: monthStart, lt: monthEnd } },
  });
  const definition = await activeAttendanceDefinition();

  const existingPunch = await prisma.attendancePunch.findUnique({
    where: { employeeId_punchDate: { employeeId: empId, punchDate: targetDate } },
  });
  const originalStatus = existingPunch?.status || "Absent";

  const workflow = await workflowService.submitRequest(definition.id, employeeCode, {
    source_module: "Attendance",
    attendance_date: input.date,
    monthly_request_count: monthlyRequestCount + 1,
  });

  const reg = await prisma.attendanceRegularization.create({
    data: {
      employeeId: empId,
      date: targetDate,
      originalStatus,
      requestedStatus: input.requestedStatus || "Present",
      requestedPunchIn: punchIn,
      requestedPunchOut: punchOut,
      reason: input.reason,
      status: "Submitted",
      workflowInstanceId: workflow.data.id,
      history: {
        create: { actorEmployeeId: actor.employeeId, action: "SUBMIT", toStatus: "Submitted", comment: input.reason },
      },
    },
  });

  const manager = await prisma.employee.findUnique({ where: { id: empId }, select: { reportingManagerId: true } });
  if (manager?.reportingManagerId) {
    await notifyEmployee(manager.reportingManagerId, "Attendance correction awaiting review", `${actor.name} submitted a correction for ${input.date}.`);
  }
  await writeAuditLog({ actorUserId: actor.userId, action: "CREATE", entityType: "AttendanceRegularization", entityId: reg.id, newValue: { status: reg.status, date: input.date } });

  return { data: reg };
}

export async function listRegularizations(filters: { employeeId?: string; status?: string }, actorRole?: string, actorEmployeeId?: string) {
  const role = requireAttendanceReader(actorRole ? { role: actorRole, employeeId: actorEmployeeId } : undefined);
  const where: Prisma.AttendanceRegularizationWhereInput = {};

  if (role === "EMPLOYEE") {
    where.employeeId = actorEmployeeId;
  } else if (role === "MANAGER") {
    const visibleIds = await attendanceEmployeeIds({ role: "MANAGER", employeeId: actorEmployeeId });
where.employeeId = { in: visibleIds ?? [] };
  }
  if (filters.employeeId) {
    where.employee = { employeeCode: filters.employeeId };
  }

  if (filters.status) {
    where.status = filters.status;
  }

  const rows = await prisma.attendanceRegularization.findMany({
    where,
    include: {
      employee: {
        select: { employeeCode: true, firstName: true, lastName: true, avatarUrl: true, department: { select: { name: true } } },
      },
      history: {
        include: { actor: { select: { employeeCode: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "asc" },
      },
      workflowInstance: { select: { id: true, status: true, currentStepIndex: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    data: rows.map((r) => ({
      id: r.id,
      employeeId: r.employee.employeeCode,
      employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
      avatar: r.employee.avatarUrl,
      department: r.employee.department?.name,
      date: formatDate(r.date),
      originalStatus: r.originalStatus,
      requestedStatus: r.requestedStatus,
      requestedPunchIn: r.requestedPunchIn ? formatTime(r.requestedPunchIn) : null,
      requestedPunchOut: r.requestedPunchOut ? formatTime(r.requestedPunchOut) : null,
      reason: r.reason,
      status: r.status,
      decisionNotes: r.decisionNotes,
      decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      workflow: r.workflowInstance,
      history: r.history.map((item) => ({
        id: item.id,
        action: item.action,
        fromStatus: item.fromStatus,
        toStatus: item.toStatus,
        comment: item.comment,
        actorName: item.actor ? `${item.actor.firstName} ${item.actor.lastName}` : "System",
        actorEmployeeId: item.actor?.employeeCode ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
    })),
  };
}

export async function actOnRegularization(
  id: string,
  decision: { action: "APPROVE" | "REJECT" | "REQUEST_MORE_DETAILS"; comment?: string },
  actor: RegularizationActor
) {
  const reg = await prisma.attendanceRegularization.findUnique({
    where: { id },
    include: { employee: { select: { employeeCode: true, firstName: true, lastName: true, reportingManagerId: true } } },
  });
  if (!reg) throw AppError.notFound("Regularization request not found");

  // 🛡️ SECURITY GUARD: Block any adjustments if the target payroll period is locked (with ISO date string format)
  await assertPeriodOpen(reg.date.toISOString().split("T")[0]);

  if (["Approved", "Rejected"].includes(reg.status)) throw AppError.conflict(`Request is already ${reg.status.toLowerCase()}`);
  if (reg.employeeId === actor.employeeId) throw AppError.forbidden("You cannot approve your own attendance correction");
  if (!reg.workflowInstanceId) throw AppError.conflict("This request is not linked to a workflow instance");

  const isManager = actor.role === "MANAGER";
  const isHr = actor.role === "HR" || actor.role === "ADMIN";
  if (isManager && reg.employee.reportingManagerId !== actor.employeeId) {
    throw AppError.forbidden("Managers can approve only requests from their direct reports");
  }
  if (!isManager && !isHr) throw AppError.forbidden("Only a reporting manager or HR can act on this request");

  if (decision.action !== "APPROVE" && !decision.comment?.trim()) {
    throw AppError.badRequest("A comment is required when rejecting or requesting more details");
  }

  if (decision.action === "REQUEST_MORE_DETAILS") {
    if (!isManager || !["Submitted", "Resubmitted"].includes(reg.status)) {
      throw AppError.badRequest("More details can be requested only by the reporting manager during manager review");
    }
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.attendanceRegularization.update({
        where: { id },
        data: { status: "More Details Required", decisionNotes: decision.comment, approverId: actor.employeeId },
      });
      await tx.attendanceRegularizationHistory.create({
        data: { regularizationId: id, actorEmployeeId: actor.employeeId, action: decision.action, fromStatus: reg.status, toStatus: row.status, comment: decision.comment },
      });
      return row;
    });
    await notifyEmployee(reg.employeeId, "Attendance correction needs more details", decision.comment!);
    await writeAuditLog({ actorUserId: actor.userId, action: "UPDATE", entityType: "AttendanceRegularization", entityId: id, oldValue: { status: reg.status }, newValue: { status: updated.status, comment: decision.comment } });
    return { data: updated };
  }

  if (isManager && !["Submitted", "Resubmitted"].includes(reg.status)) throw AppError.badRequest("This request is not awaiting manager review");
  if (isHr && reg.status !== "Manager Approved") throw AppError.badRequest("HR can act only after manager approval");

  const workflowAction = decision.action === "APPROVE" ? "approve" : "reject";
  await workflowService.actOnStep(reg.workflowInstanceId, actor.employeeCode, actor.name, workflowAction, decision.comment, {
    bypassRoleApprover: actor.role === "ADMIN" && isHr,
    actorRole: actor.role,
  });

  if (decision.action === "REJECT") {
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.attendanceRegularization.update({ where: { id }, data: { status: "Rejected", decisionNotes: decision.comment, approverId: actor.employeeId, decidedAt: new Date() } });
      await tx.attendanceRegularizationHistory.create({ data: { regularizationId: id, actorEmployeeId: actor.employeeId, action: "REJECT", fromStatus: reg.status, toStatus: "Rejected", comment: decision.comment } });
      return row;
    });
    await notifyEmployee(reg.employeeId, "Attendance correction rejected", decision.comment!);
    await writeAuditLog({ actorUserId: actor.userId, action: "REJECT", entityType: "AttendanceRegularization", entityId: id, oldValue: { status: reg.status }, newValue: { status: "Rejected", comment: decision.comment } });
    return { data: updated };
  }

  if (isManager) {
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.attendanceRegularization.update({ where: { id }, data: { status: "Manager Approved", decisionNotes: decision.comment || "Approved by reporting manager", approverId: actor.employeeId } });
      await tx.attendanceRegularizationHistory.create({ data: { regularizationId: id, actorEmployeeId: actor.employeeId, action: "MANAGER_APPROVE", fromStatus: reg.status, toStatus: "Manager Approved", comment: decision.comment } });
      return row;
    });
    await notifyHr("Attendance correction awaiting HR verification", `${reg.employee.firstName} ${reg.employee.lastName}'s correction requires final verification.`);
    await writeAuditLog({ actorUserId: actor.userId, action: "APPROVE", entityType: "AttendanceRegularization", entityId: id, oldValue: { status: reg.status }, newValue: { status: updated.status } });
    return { data: updated };
  }

  const punchIn = reg.requestedPunchIn!;
  const punchOut = reg.requestedPunchOut!;
  const updated = await prisma.$transaction(async (tx) => {
    await tx.attendancePunch.upsert({
      where: { employeeId_punchDate: { employeeId: reg.employeeId, punchDate: reg.date } },
      update: { punchIn, punchOut },
      create: { employeeId: reg.employeeId, punchDate: reg.date, punchIn, punchOut, status: "Present" },
    });
    const row = await tx.attendanceRegularization.update({ where: { id }, data: { status: "Approved", decisionNotes: decision.comment || "Verified by HR", approverId: actor.employeeId, decidedAt: new Date() } });
    await tx.attendanceRegularizationHistory.create({ data: { regularizationId: id, actorEmployeeId: actor.employeeId, action: "HR_APPROVE", fromStatus: reg.status, toStatus: "Approved", comment: decision.comment } });
    return row;
  });

  const result = await refreshPunchFromEngine(reg.employeeId, reg.date.toISOString().slice(0, 10), new Date());
  if (result) {
    await persistAttendanceDayResult(reg.employeeId, reg.date.toISOString().slice(0, 10), result);
    await prisma.attendancePunch.update({
      where: { employeeId_punchDate: { employeeId: reg.employeeId, punchDate: reg.date } },
      data: {
        status: result.isLate ? "Late" : result.dayStatus === "HALF_DAY" ? "Half-Day" : result.dayStatus === "INCOMPLETE" ? "Incomplete" : "Present",
        scheduledHours: Number((result.scheduledMinutes / 60).toFixed(2)),
        actualHours: Number((result.workedMinutes / 60).toFixed(2)),
        overtimeHours: Number((result.rawOvertimeMinutes / 60).toFixed(2)),
        isOvertimeApproved: result.approvedOvertimeMinutes > 0,
      },
    });
  }
  await notifyEmployee(reg.employeeId, "Attendance correction approved", `Your attendance for ${formatDate(reg.date)} has been updated after HR verification.`);
  await writeAuditLog({
    actorUserId: actor.userId,
    action: "APPROVE",
    entityType: "AttendanceRegularization",
    entityId: id,
    oldValue: { status: reg.status },
    newValue: { status: "Approved", attendanceStatus: result?.dayStatus ?? "PRESENT", actualHours: result ? result.workedMinutes / 60 : null },
  });
  return { data: updated };
}

export async function resubmitRegularization(id: string, input: RegularizationInput, actor: RegularizationActor) {
  const reg = await prisma.attendanceRegularization.findUnique({ where: { id } });
  if (!reg) throw AppError.notFound("Regularization request not found");
  if (reg.employeeId !== actor.employeeId) throw AppError.forbidden("You can resubmit only your own request");
  if (reg.status !== "More Details Required") throw AppError.conflict("Only a request awaiting more details can be resubmitted");
  const { targetDate, punchIn, punchOut } = validateRegularizationInput(input);
  await assertPeriodOpen(targetDate.toISOString().slice(0, 10));
  if (targetDate.getTime() !== reg.date.getTime()) throw AppError.badRequest("The attendance date cannot be changed during resubmission");

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.attendanceRegularization.update({
      where: { id },
      data: { requestedStatus: input.requestedStatus, requestedPunchIn: punchIn, requestedPunchOut: punchOut, reason: input.reason, status: "Resubmitted", decisionNotes: null },
    });
    await tx.attendanceRegularizationHistory.create({ data: { regularizationId: id, actorEmployeeId: actor.employeeId, action: "RESUBMIT", fromStatus: reg.status, toStatus: "Resubmitted", comment: input.reason } });
    return row;
  });
  const manager = await prisma.employee.findUnique({ where: { id: reg.employeeId }, select: { reportingManagerId: true } });
  if (manager?.reportingManagerId) await notifyEmployee(manager.reportingManagerId, "Attendance correction resubmitted", `${actor.name} added the requested details.`);
  await writeAuditLog({ actorUserId: actor.userId, action: "UPDATE", entityType: "AttendanceRegularization", entityId: id, oldValue: { status: reg.status }, newValue: { status: updated.status } });
  return { data: updated };
}

export async function listShifts() {
  const shifts = await prisma.attendanceShift.findMany({
    orderBy: { name: "asc" },
  });
  return {
    data: shifts.map((s) => ({
      id: s.id,
      name: s.name,
      startTime: formatTime(s.startTime),
      endTime: formatTime(s.endTime),
      gracePeriodMinutes: s.gracePeriodMinutes,
      breakDurationMinutes: s.breakDurationMinutes,
      overtimeThresholdHours: toNumber(s.overtimeThresholdHours),
      shiftType: s.type,
      weeklyOffDays: Array.isArray(s.weeklyOffDays) ? s.weeklyOffDays : [0, 6],
      requiredMinutes: s.requiredMinutes ?? null,
    })),
  };
}

export async function createShift(rawInput: unknown, actor?: AttendanceActor) {
  if (!actor) throw AppError.unauthorized();
  if (!["HR", "ADMIN"].includes(actor.role?.toUpperCase())) {
    throw AppError.forbidden("Only HR or Admin can create shifts");
  }
  const parsed = createShiftSchema.safeParse(rawInput);
  if (!parsed.success) throw AppError.validation(parsed.error.issues);
  const input = parsed.data;
  const dummyDate = "1970-01-01";
  const shift = await prisma.attendanceShift.create({
    data: {
      name: input.name,
      type: input.shiftType,
      startTime: new Date(`${dummyDate}T${input.startTime}:00Z`),
      endTime: new Date(`${dummyDate}T${input.endTime}:00Z`),
      gracePeriodMinutes: input.gracePeriodMinutes ?? 15,
      breakDurationMinutes: input.breakDurationMinutes ?? 60,
      requiredMinutes: input.requiredMinutes ?? null,
      weeklyOffDays: input.weeklyOffDays,
      overtimeThresholdHours: input.overtimeThresholdHours ?? 8,
    },
  });
  return { data: shift };
}
