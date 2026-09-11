import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAuditLog } from "../../services/audit.service";
import { serializeAttendanceList, serializeTeamSummary } from "../../serializers/attendance.serializer";
import { formatDate } from "../../serializers/helpers";
import { startOfDay } from "../../serializers/helpers";

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
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existing = await prisma.attendancePunch.findUnique({
    where: { employeeId_punchDate: { employeeId: empId, punchDate: today } },
  });
  if (existing?.punchIn) {
    throw AppError.conflict("Already checked in today");
  }

  const now = new Date();
  const punch = await prisma.attendancePunch.upsert({
    where: { employeeId_punchDate: { employeeId: empId, punchDate: today } },
    update: { punchIn: now, punchOut: null, method },
    create: {
      employeeId: empId,
      punchDate: today,
      punchIn: now,
      method,
      status: "Present",
    },
    include: PUNCH_INCLUDE,
  });

  writeAuditLog({
    action: "CREATE",
    entityType: "AttendancePunch",
    entityId: punch.id,
    newValue: { employeeId: empId, date: formatDate(today), action: "CHECK_IN" },
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
    prisma.attendanceBreak.findFirst({ where: { employeeId: empId, endedAt: null }, select: { id: true } }),
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

  const updated = await prisma.attendancePunch.update({
    where: { id: punch.id },
    data: { punchOut: new Date() },
    include: PUNCH_INCLUDE,
  });

  writeAuditLog({
    action: "UPDATE",
    entityType: "AttendancePunch",
    entityId: updated.id,
    newValue: { employeeId: empId, date: formatDate(today), action: "CHECK_OUT" },
  });

  const serialized = serializeAttendanceList([updated])[0];
  return { data: { employeeId: employeeCode, checkOut: serialized.checkOut } };
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
    const attendanceBreak = await prisma.attendanceBreak.create({
      data: { employeeId, breakType },
    });

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

  const attendanceBreak = await prisma.attendanceBreak.findUniqueOrThrow({
    where: { id: activeBreak.id },
  });

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
