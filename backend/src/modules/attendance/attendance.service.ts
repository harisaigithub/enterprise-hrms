import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAuditLog } from "../../services/audit.service";
import { serializeAttendanceList, serializeTeamSummary } from "../../serializers/attendance.serializer";
import { formatDate } from "../../serializers/helpers";
import { startOfDay } from "../../serializers/helpers";

function formatTime(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(11, 16);
}

function toNumber(val: any): number {
  return val != null ? Number(val) : 0;
}

const PUNCH_INCLUDE = {
  employee: { select: { employeeCode: true } },
} satisfies Prisma.AttendancePunchInclude;

/** Resolve an employee code (EMP001) to the DB PK, with scope guard.
 *  If actorEmployeeId is given, the resolved employee must match the actor
 *  (employees can only check-in/out for themselves). HR/Admin callers
 *  pass undefined to bypass. */
export async function resolveEmployeeId(employeeCode: string, actorEmployeeId?: string): Promise<string> {
  const emp = await prisma.employee.findUnique({ where: { employeeCode }, select: { id: true } });
  if (!emp) throw AppError.notFound("Employee not found");
  if (actorEmployeeId && emp.id !== actorEmployeeId) {
    throw AppError.forbidden("You can only manage your own attendance");
  }
  return emp.id;
}

export interface AttendanceFilters {
  employeeId?: string;
  month?: number;
  year?: number;
}

export async function listAttendance(filters: AttendanceFilters, actorEmployeeId?: string) {
  const where: Prisma.AttendancePunchWhereInput = {};

  if (filters.employeeId) {
    where.employee = { employeeCode: filters.employeeId };
  } else if (actorEmployeeId) {
    // Default to the authenticated employee's own records.
    where.employee = { id: actorEmployeeId };
  }

  if (filters.month && filters.year) {
    const month = filters.month;
    const year = filters.year;
    where.punchDate = {
      gte: new Date(Date.UTC(year, month - 1, 1)),
      lt: new Date(Date.UTC(year, month, 1)),
    };
  }

  const rows = await prisma.attendancePunch.findMany({
    where,
    include: PUNCH_INCLUDE,
    orderBy: { punchDate: "desc" },
  });

  return { data: serializeAttendanceList(rows) };
}

export async function getTeamSummary() {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [punches, onLeaveToday] = await Promise.all([
    prisma.attendancePunch.findMany({
      where: { punchDate: { gte: today, lt: tomorrow } },
      include: { employee: { select: { employeeCode: true } } },
    }),
    prisma.leaveRequest.findMany({
      where: {
        status: "Approved",
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: { id: true },
    }),
  ]);

  const present = punches.filter((p) => p.status === "Present").length;
  const late = punches.filter((p) => p.status === "Late").length;
  const wfh = punches.filter((p) => p.status === "WFH").length;
  const total = punches.length + onLeaveToday.length; // total tracked employees

  return {
    data: serializeTeamSummary({
      date: formatDate(today) ?? "",
      present,
      late,
      absent: Math.max(0, total - present - late - wfh - onLeaveToday.length),
      onLeave: onLeaveToday.length,
      wfh,
      total,
    }),
  };
}

export async function checkIn(employeeCode: string, actorEmployeeId?: string, method = "Web") {
  const empId = await resolveEmployeeId(employeeCode, actorEmployeeId);
  const today = startOfDay(new Date());

  const existing = await prisma.attendancePunch.findUnique({
    where: { employeeId_punchDate: { employeeId: empId, punchDate: today } },
  });
  if (existing?.punchIn) {
    throw AppError.conflict("Already checked in today");
  }

  const now = new Date();

  // Shift & Grace Period check: Default 09:00 AM with 15 min grace = 09:15 AM
  const emp = await prisma.employee.findUnique({
    where: { id: empId },
    include: { shift: true },
  });
  const graceMinutes = emp?.shift?.gracePeriodMinutes ?? 15;
  const shiftStartHour = 9;
  const shiftStartMinute = 0;

  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const totalCurrentMinutes = currentHours * 60 + currentMinutes;
  const totalShiftAllowedMinutes = shiftStartHour * 60 + shiftStartMinute + graceMinutes;

  let computedStatus = "Present";
  if (totalCurrentMinutes > totalShiftAllowedMinutes) {
    computedStatus = "Late";
  }

  const punch = await prisma.attendancePunch.upsert({
    where: { employeeId_punchDate: { employeeId: empId, punchDate: today } },
    update: { punchIn: now, punchOut: null, method, status: computedStatus },
    create: {
      employeeId: empId,
      punchDate: today,
      punchIn: now,
      method,
      status: computedStatus,
      scheduledHours: 8.0,
    },
    include: PUNCH_INCLUDE,
  });

  writeAuditLog({
    action: "CREATE",
    entityType: "AttendancePunch",
    entityId: punch.id,
    newValue: { employeeId: empId, date: formatDate(today), action: "CHECK_IN", status: computedStatus },
  });

  const serialized = serializeAttendanceList([punch])[0];
  return { data: { employeeId: employeeCode, date: serialized.date, checkIn: serialized.checkIn, status: serialized.status } };
}

export async function checkOut(employeeCode: string, actorEmployeeId?: string) {
  const empId = await resolveEmployeeId(employeeCode, actorEmployeeId);
  const today = startOfDay(new Date());

  const [punch, activeBreak] = await Promise.all([
    prisma.attendancePunch.findUnique({
      where: { employeeId_punchDate: { employeeId: empId, punchDate: today } },
    }),
    prisma.attendanceBreak.findFirst({
      where: { employeeId: empId, endedAt: null },
      select: { id: true },
    }),
  ]);
  if (!punch?.punchIn) {
    throw AppError.badRequest("Check in first before checking out");
  }
  if (punch.punchOut) {
    throw AppError.conflict("Already checked out today");
  }
  if (activeBreak) {
    throw AppError.conflict("End your active break before checking out");
  }

  const now = new Date();
  const punchInTime = punch.punchIn.getTime();
  const punchOutTime = now.getTime();
  const actualHours = Math.round(((punchOutTime - punchInTime) / (1000 * 60 * 60)) * 100) / 100;

  // Overtime rule: if actual hours > 8.0 hours
  let overtimeHours = 0;
  if (actualHours > 8.0) {
    overtimeHours = Math.round((actualHours - 8.0) * 100) / 100;
  }

  let finalStatus = punch.status;
  if (actualHours < 4.0 && punch.status !== "Late") {
    finalStatus = "Half-Day";
  } else if (now.getHours() < 17 && punch.status === "Present") {
    finalStatus = "Early-Checkout";
  }

  const updated = await prisma.attendancePunch.update({
    where: { id: punch.id },
    data: {
      punchOut: now,
      actualHours,
      overtimeHours,
      status: finalStatus,
    },
    include: PUNCH_INCLUDE,
  });

  writeAuditLog({
    action: "UPDATE",
    entityType: "AttendancePunch",
    entityId: updated.id,
    newValue: { employeeId: empId, date: formatDate(today), action: "CHECK_OUT", actualHours, overtimeHours },
  });

  const serialized = serializeAttendanceList([updated])[0];
  return { data: { employeeId: employeeCode, checkOut: serialized.checkOut, status: serialized.status, hoursWorked: actualHours, overtimeHours } };
}

export async function startBreak(employeeId: string, actorUserId: string, breakType = "Short Break") {
  const today = startOfDay(new Date());
  const punch = await prisma.attendancePunch.findUnique({
    where: { employeeId_punchDate: { employeeId, punchDate: today } },
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

export async function requestRegularization(
  employeeCode: string,
  input: {
    date: string;
    requestedStatus: string;
    requestedPunchIn?: string;
    requestedPunchOut?: string;
    reason: string;
  },
  actorEmployeeId?: string
) {
  const empId = await resolveEmployeeId(employeeCode, actorEmployeeId);
  const targetDate = startOfDay(new Date(input.date));

  // Find original punch if any
  const existingPunch = await prisma.attendancePunch.findUnique({
    where: { employeeId_punchDate: { employeeId: empId, punchDate: targetDate } },
  });

  const originalStatus = existingPunch?.status || "Absent";

  const reg = await prisma.attendanceRegularization.create({
    data: {
      employeeId: empId,
      date: targetDate,
      originalStatus,
      requestedStatus: input.requestedStatus || "Present",
      requestedPunchIn: input.requestedPunchIn ? new Date(input.requestedPunchIn) : null,
      requestedPunchOut: input.requestedPunchOut ? new Date(input.requestedPunchOut) : null,
      reason: input.reason,
      status: "Pending",
    },
  });

  return { data: reg };
}

export async function listRegularizations(filters: { employeeId?: string; status?: string }, actorRole?: string, actorEmployeeId?: string) {
  const where: Prisma.AttendanceRegularizationWhereInput = {};

  if (actorRole === "EMPLOYEE" && actorEmployeeId) {
    where.employeeId = actorEmployeeId;
  } else if (actorRole === "MANAGER" && actorEmployeeId) {
    where.OR = [
      { employeeId: actorEmployeeId },
      { employee: { reportingManagerId: actorEmployeeId } },
    ];
  } else if (filters.employeeId) {
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
    })),
  };
}

export async function decideRegularization(
  id: string,
  decision: { status: "Approved" | "Rejected"; decisionNotes?: string },
  actorUserId?: string
) {
  const reg = await prisma.attendanceRegularization.findUnique({
    where: { id },
    include: { employee: true },
  });
  if (!reg) throw AppError.notFound("Regularization request not found");
  if (reg.status !== "Pending") {
    throw AppError.conflict(`Request has already been ${reg.status.toLowerCase()}`);
  }

  const isApproved = decision.status === "Approved";

  const updatedReg = await prisma.attendanceRegularization.update({
    where: { id },
    data: {
      status: decision.status,
      decisionNotes: decision.decisionNotes || (isApproved ? "Approved by manager" : "Rejected"),
      approverId: actorUserId || null,
      decidedAt: new Date(),
    },
  });

  // If approved, update the attendance punch
  if (isApproved) {
    const punchIn = reg.requestedPunchIn || new Date(`${formatDate(reg.date)}T09:00:00Z`);
    const punchOut = reg.requestedPunchOut || new Date(`${formatDate(reg.date)}T18:00:00Z`);
    const actualHours = Math.round(((punchOut.getTime() - punchIn.getTime()) / (1000 * 60 * 60)) * 100) / 100;

    await prisma.attendancePunch.upsert({
      where: {
        employeeId_punchDate: { employeeId: reg.employeeId, punchDate: reg.date },
      },
      update: {
        status: reg.requestedStatus,
        punchIn,
        punchOut,
        actualHours,
      },
      create: {
        employeeId: reg.employeeId,
        punchDate: reg.date,
        status: reg.requestedStatus,
        punchIn,
        punchOut,
        actualHours,
        scheduledHours: 8.0,
      },
    });

    writeAuditLog({
      action: "UPDATE",
      entityType: "AttendancePunch",
      entityId: reg.id,
      newValue: { employeeId: reg.employeeId, date: formatDate(reg.date), status: reg.requestedStatus },
    });
  }

  return { data: updatedReg };
}

/* -------------------------------------------------------------------------- */
/*                               Shifts Master                                */
/* -------------------------------------------------------------------------- */

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
    })),
  };
}

export async function createShift(input: {
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes?: number;
  breakDurationMinutes?: number;
}) {
  const dummyDate = "1970-01-01";
  const shift = await prisma.attendanceShift.create({
    data: {
      name: input.name,
      startTime: new Date(`${dummyDate}T${input.startTime}:00Z`),
      endTime: new Date(`${dummyDate}T${input.endTime}:00Z`),
      gracePeriodMinutes: input.gracePeriodMinutes ?? 15,
      breakDurationMinutes: input.breakDurationMinutes ?? 60,
    },
  });
  return { data: shift };
}
