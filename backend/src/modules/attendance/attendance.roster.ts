/**
 * Roster-based daily attendance: ONE function (`computeDayRows`) feeds the dashboard cards,
 * the drill-down modal and the nightly materializer, so counts and rows cannot diverge.
 */
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { attendanceEmployeeIds } from "./attendance.scope";
import type { AttendanceActor } from "./attendance.scope";
import {
  computeAttendanceDay,
  summarizeBuckets,
  type BreakFact,
  type DashboardBucket,
  type DayResult,
  type ShiftSnapshot,
} from "./attendance.engine";
import {
  addDays,
  dbDateToLocalDate,
  DEFAULT_TIMEZONE,
  formatLocalTime,
  isValidLocalDate,
  localDateOf,
  localDateToDbDate,
  timeColumnToMinutes,
  zonedInstant,
} from "./attendance.time";
import { periodStateFor } from "./payroll-lock";

/** Align with your real Employee.status values. Notice-period employees still work, so they stay rostered. */
const NOT_ROSTERED_STATUSES = ["Terminated", "Separated", "Inactive", "Absconded"];

/** Matches the previous hard-coded behaviour: 09:00-18:00, 60 min break, 15 min grace = 8 h. */
const DEFAULT_SHIFT: ShiftSnapshot = {
  id: null,
  name: "Default (09:00-18:00)",
  type: "FIXED",
  startMinute: 9 * 60,
  endMinute: 18 * 60,
  graceMinutes: 15,
  breakMinutes: 60,
  weeklyOffDays: [0, 6],
};

export interface DayRow {
  employeeId: string; // internal UUID
  employeeCode: string;
  employeeName: string;
  department: string | null;
  shiftId: string | null;
  shiftName: string;
  punchIn: Date | null;
  punchOut: Date | null;
  legacyStatus: string;
  result: DayResult;
}

function toSnapshot(s: any): ShiftSnapshot {
  const start = timeColumnToMinutes(s.startTime);
  const end = timeColumnToMinutes(s.endTime);
  return {
    id: s.id,
    name: s.name,
    type: s.type ?? (end < start ? "OVERNIGHT" : "FIXED"),
    startMinute: start,
    endMinute: end,
    graceMinutes: s.gracePeriodMinutes,
    breakMinutes: s.breakDurationMinutes,
    requiredMinutes: s.requiredMinutes ?? null,
    overtimeThresholdMinutes:
      s.overtimeThresholdHours != null ? Math.round(Number(s.overtimeThresholdHours) * 60) : null,
    weeklyOffDays: s.weeklyOffDays ?? [0, 6],
  };
}

/** Resolve a leave request's coverage for one date (handles half-day start/end portions). */
function leaveFractionFor(req: any, date: string): { fraction: number; half: "FIRST" | "SECOND" | null } {
  const start = dbDateToLocalDate(req.startDate);
  const end = dbDateToLocalDate(req.endDate);
  const isStart = start === date;
  const isEnd = end === date;
  if (!isStart && !isEnd) return { fraction: 1, half: null };

  if (isStart && isEnd) {
    const first = req.startDayPortion;
    const second = req.endDayPortion;
    if (first === "FIRST_HALF" && second === "SECOND_HALF") return { fraction: 1, half: null };
    if (first === "SECOND_HALF" && second === "FIRST_HALF") return { fraction: 1, half: null };
    if (first === "FIRST_HALF" || second === "FIRST_HALF") return { fraction: 0.5, half: "FIRST" };
    if (first === "SECOND_HALF" || second === "SECOND_HALF") return { fraction: 0.5, half: "SECOND" };
    return { fraction: 1, half: null };
  }

  const portion: string = isStart ? req.startDayPortion : req.endDayPortion;
  if (portion === "FIRST_HALF") return { fraction: 0.5, half: "FIRST" };
  if (portion === "SECOND_HALF") return { fraction: 0.5, half: "SECOND" };
  return { fraction: 1, half: null };
}

export function legacyStatus(r: DayResult, wfh: boolean): string {
  switch (r.dayStatus) {
    case "HOLIDAY": return "Holiday";
    case "WEEKLY_OFF": return "Weekly-Off";
    case "ON_LEAVE": return "On Leave";
    case "ON_DUTY": return "On-Duty";
    case "ABSENT": return "Absent";
    case "HALF_DAY": return "Half-Day";
    case "INCOMPLETE": return "Incomplete";
    case "NOT_STARTED": return "Not Yet In";
    default: return wfh ? "WFH" : r.isLate ? "Late" : "Present";
  }
}

/**
 * Compute one DayRow per rostered employee for `date`.
 */
export async function computeDayRows(
  date: string,
  employeeIds: string[] | null,
  now: Date = new Date(),
  timezone: string = DEFAULT_TIMEZONE
): Promise<DayRow[]> {
  const dbDate = localDateToDbDate(date);

  const employees = await prisma.employee.findMany({
    where: {
      isSoftDeleted: false,
      status: { notIn: NOT_ROSTERED_STATUSES },
      dateOfJoining: { lte: dbDate },
      ...(employeeIds ? { id: { in: employeeIds } } : {}),
    },
    select: {
      id: true, employeeCode: true, firstName: true, lastName: true,
      shiftId: true, locationId: true, department: { select: { name: true } },
    },
    orderBy: { employeeCode: "asc" },
  });
  if (employees.length === 0) return [];
  const ids = employees.map((e) => e.id);

  const windowStart = zonedInstant(date, 0, timezone);
  const windowEnd = zonedInstant(addDays(date, 2), 0, timezone);

  const [assignments, shifts, holidays, leaves, punches, breaks] = await Promise.all([
    prisma.employeeShiftAssignment.findMany({
      where: {
        employeeId: { in: ids },
        effectiveFrom: { lte: dbDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: dbDate } }],
      },
      orderBy: { effectiveFrom: "desc" },
      select: { employeeId: true, shiftId: true },
    }),
    prisma.attendanceShift.findMany(),
    prisma.holiday.findMany({
      where: { date: dbDate, isMandatory: true },
      select: { name: true, locationId: true },
    }),
    prisma.leaveRequest.findMany({
      where: { employeeId: { in: ids }, status: "Approved", startDate: { lte: dbDate }, endDate: { gte: dbDate } },
      select: {
        employeeId: true, startDate: true, endDate: true, startDayPortion: true, endDayPortion: true,
        leaveType: { select: { isPaid: true } },
      },
    }),
    prisma.attendancePunch.findMany({ where: { employeeId: { in: ids }, punchDate: dbDate } }),
    prisma.attendanceBreak.findMany({
      where: { employeeId: { in: ids }, startedAt: { gte: windowStart, lt: windowEnd } },
      select: { employeeId: true, breakType: true, startedAt: true, endedAt: true },
    }),
  ]);

  const shiftById = new Map<string, ShiftSnapshot>(shifts.map((s) => [s.id, toSnapshot(s)] as [string, ShiftSnapshot]));
  const assignedShift = new Map<string, string>();
  for (const a of assignments) if (!assignedShift.has(a.employeeId)) assignedShift.set(a.employeeId, a.shiftId);
  
  const globalHoliday = holidays.find((h) => h.locationId === null) ?? null;
  const holidayByLocation = new Map<string, { name: string; locationId: string | null }>(
    holidays.filter((h): h is { name: string; locationId: string } => h.locationId !== null)
      .map((h) => [h.locationId, h])
  );

  const punchByEmp = new Map(punches.map((p) => [p.employeeId, p]));
  const leavesByEmp = new Map<string, typeof leaves>();
  for (const l of leaves) {
    const existing = leavesByEmp.get(l.employeeId) ?? [];
    leavesByEmp.set(l.employeeId, [...existing, l]);
  }

  const breaksByEmp = new Map<string, BreakFact[]>();
  for (const b of breaks) {
    const list = breaksByEmp.get(b.employeeId) ?? [];
    list.push({ type: b.breakType, start: b.startedAt, end: b.endedAt });
    breaksByEmp.set(b.employeeId, list);
  }

  return employees.map((e) => {
    const shift =
      shiftById.get(assignedShift.get(e.id) ?? "") ?? (e.shiftId ? shiftById.get(e.shiftId) : undefined) ?? DEFAULT_SHIFT;
    const holiday = (e.locationId && holidayByLocation.get(e.locationId)) || globalHoliday;
    const punch = punchByEmp.get(e.id);

    let paid = 0, unpaid = 0;
    let coveredHalf: "FIRST" | "SECOND" | null = null;
    for (const l of leavesByEmp.get(e.id) ?? []) {
      const { fraction, half } = leaveFractionFor(l, date);
      if (l.leaveType?.isPaid === false) unpaid += fraction; else paid += fraction;
      coveredHalf = half ?? coveredHalf;
    }

    const wfh = punch?.status === "WFH";
    const onDutyFraction = punch?.status === "On-Duty" ? 1 : 0;

    const result = computeAttendanceDay({
      date, timezone, now, shift,
      holiday: holiday ? { name: holiday.name } : null,
      leave: paid || unpaid ? { paidFraction: paid, unpaidFraction: unpaid } : null,
      onDutyFraction, coveredHalf, wfh,
      punchIn: punch?.punchIn ?? null,
      punchOut: punch?.punchOut ?? null,
      breaks: breaksByEmp.get(e.id) ?? [],
      overtimeApproved: punch?.isOvertimeApproved ?? false,
    });

    return {
      employeeId: e.id,
      employeeCode: e.employeeCode,
      employeeName: `${e.firstName} ${e.lastName}`.trim(),
      department: e.department?.name ?? null,
      shiftId: shift.id,
      shiftName: shift.name,
      punchIn: punch?.punchIn ?? null,
      punchOut: punch?.punchOut ?? null,
      legacyStatus: legacyStatus(result, wfh),
      result,
    };
  });
}

/* -------------------------------------------------------------------------- */
/*                 Dashboard: cards + modal from the SAME rows                 */
/* -------------------------------------------------------------------------- */

const BUCKETS: DashboardBucket[] = ["present", "late", "wfh", "absent", "onLeave", "notYetIn", "holiday", "weeklyOff"];
export const isBucket = (v: string): v is DashboardBucket => (BUCKETS as string[]).includes(v);

function resolveDate(input: string | undefined, now: Date, tz: string): string {
  const today = localDateOf(now, tz);
  if (!input) return today;
  if (!isValidLocalDate(input)) throw AppError.badRequest("date must be a valid YYYY-MM-DD");
  if (input > today) throw AppError.badRequest("date cannot be in the future");
  return input;
}

export async function getTeamSummary(actor?: AttendanceActor, dateInput?: string) {
  const now = new Date();
  const date = resolveDate(dateInput, now, DEFAULT_TIMEZONE);
  const scope = await attendanceEmployeeIds(actor);
  const rows = await computeDayRows(date, scope, now);
  const counts = summarizeBuckets(rows.map((r) => r.result));
  return {
    data: {
      date,
      asOf: now.toISOString(),
      ...counts,
    },
  };
}

export interface SummaryRowsQuery {
  date?: string;
  bucket?: string;
  page?: number;
  pageSize?: number;
}

export async function getSummaryRows(actor: AttendanceActor | undefined, q: SummaryRowsQuery) {
  const targetBucket = q.bucket ?? "All";
  const now = new Date();
  const date = resolveDate(q.date, now, DEFAULT_TIMEZONE);
  const scope = await attendanceEmployeeIds(actor);
  const all = await computeDayRows(date, scope, now);
  
  const matching = targetBucket === "All" 
    ? all 
    : all.filter((r) => r.result.bucket === targetBucket);

  const pageSize = Math.min(200, Math.max(1, q.pageSize ?? 50));
  const page = Math.max(1, q.page ?? 1);
  const slice = matching.slice((page - 1) * pageSize, page * pageSize);

  return {
    data: {
      date,
      asOf: now.toISOString(),
      bucket: targetBucket,
      count: matching.length,
      page,
      pageSize,
      rows: slice.map((r) => ({
        id: `${r.employeeId}:${date}`,
        employeeId: r.employeeCode,
        employeeName: r.employeeName,
        department: r.department,
        date,
        status: r.legacyStatus,
        dayStatus: r.result.dayStatus,
        bucket: r.result.bucket,
        shift: r.shiftName,
        checkIn: formatLocalTime(r.punchIn),
        checkOut: formatLocalTime(r.punchOut),
        hoursWorked: Math.round((r.result.workedMinutes / 60) * 100) / 100,
        lateMinutes: r.result.lateMinutes,
        flags: r.result.flags,
      })),
    },
  };
}

/* -------------------------------------------------------------------------- */
/*        Materializer: persist FINAL rows for Leave / Payroll to read          */
/* -------------------------------------------------------------------------- */

export async function materializeAttendanceDay(date: string, now: Date = new Date()) {
  const period = await periodStateFor(date);
  if (period && period.status !== "OPEN") return { date, written: 0, skipped: "period-not-open" as const };

  const rows = (await computeDayRows(date, null, now)).filter((r) => r.result.isFinal);
  const dbDate = localDateToDbDate(date);

  const locked = new Set(
    (
      await prisma.attendanceDay.findMany({
        where: { date: dbDate, isLocked: true },
        select: { employeeId: true },
      })
    ).map((x) => x.employeeId)
  );

  let written = 0;
  for (const r of rows) {
    if (locked.has(r.employeeId)) continue;
    const x = r.result;
    
    // Mapped strictly to schema.prisma AttendanceDay model fields
    const data = {
  status: x.dayStatus,
  scheduledHours: Number((x.scheduledMinutes / 60).toFixed(2)),
  actualHours: Number((x.workedMinutes / 60).toFixed(2)),
  shortfallHours: Number((x.shortfallMinutes / 60).toFixed(2)),
  overtimeHours: Number(((x.approvedOvertimeMinutes || 0) / 60).toFixed(2)),

  // Payroll-relevant attendance values
  payableDayFraction: Number((x.payableDayFraction || 0).toFixed(2)),
  lopFraction: Number((x.lopFraction || 0).toFixed(2)),
  unpaidLeaveFraction: Number((x.unpaidLeaveFraction || 0).toFixed(2)),
};

    await prisma.attendanceDay.upsert({
      where: { employeeId_date: { employeeId: r.employeeId, date: dbDate } },
      update: data,
      create: { employeeId: r.employeeId, date: dbDate, ...data },
    });
    written += 1;
  }
  return { date, written, skipped: null };
}