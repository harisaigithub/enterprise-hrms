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

/** Resolve an employee code (EMP001) to the DB PK, with scope guard. */
export async function resolveEmployeeId(employeeCode: string, actorEmployeeId?: string): Promise<string> {
  const emp = await prisma.employee.findUnique({ where: { employeeCode }, select: { id: true } });
  if (!emp) throw AppError.notFound("Employee not found");
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

  const punch = await prisma.attendancePunch.findUnique({
    where: { employeeId_punchDate: { employeeId: empId, punchDate: today } },
  });
  if (!punch?.punchIn) {
    throw AppError.badRequest("Check in first before checking out");
  }
  if (punch.punchOut) {
    throw AppError.conflict("Already checked out today");
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
