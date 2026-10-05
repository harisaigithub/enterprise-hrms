import type { AttendanceDay, AttendancePunch, Employee } from "@prisma/client";
import { formatDate, toNumber } from "./helpers";
import {
  DEFAULT_TIMEZONE,
  formatLocalTime,
} from "../modules/attendance/attendance.time";

type EmployeeSummary = {
  employeeCode: string;
  firstName: string;
  lastName: string;
};

type PunchWithEmployee = AttendancePunch & {
  employee?: EmployeeSummary | null;
};

type DayWithEmployee = AttendanceDay & {
  employee?: EmployeeSummary | null;
};

function statusForUi(status: string): string {
  const normalized = String(status || "").trim().toUpperCase().replace(/[ -]+/g, "_");
  const labels: Record<string, string> = {
    PRESENT: "Present",
    ABSENT: "Absent",
    LATE: "Late",
    WFH: "WFH",
    WORK_FROM_HOME: "WFH",
    ON_LEAVE: "On Leave",
    LEAVE: "On Leave",
    HALF_DAY: "Half Day",
    HALFDAY: "Half Day",
    WEEKLY_OFF: "Weekly Off",
    WEEKLYOFF: "Weekly Off",
    HOLIDAY: "Holiday",
  };
  return labels[normalized] ?? status;
}

function employeeFields(employee?: EmployeeSummary | null) {
  return {
    employeeId: employee?.employeeCode ?? "",
    employeeName: employee
      ? `${employee.firstName} ${employee.lastName}`.trim()
      : "",
  };
}

/** Maps a raw punch to the existing frontend contract. */
export function serializeAttendance(punch: PunchWithEmployee) {
  const hoursWorked =
    punch.punchIn && punch.punchOut
      ? Math.round(((punch.punchOut.getTime() - punch.punchIn.getTime()) / 3_600_000) * 100) / 100
      : 0;

  return {
    id: punch.id,
    ...employeeFields(punch.employee),
    date: formatDate(punch.punchDate),
    checkIn: formatLocalTime(punch.punchIn, DEFAULT_TIMEZONE),
    checkOut: formatLocalTime(punch.punchOut, DEFAULT_TIMEZONE),
    status: statusForUi(punch.status),
    hoursWorked,
    scheduledHours: punch.scheduledHours != null ? toNumber(punch.scheduledHours) : 8.0,
    overtimeHours: punch.overtimeHours != null ? toNumber(punch.overtimeHours) : 0,
    isOvertimeApproved: punch.isOvertimeApproved ?? false,
    isLocked: false,
    payableDayFraction: 0,
lopFraction: 0,
unpaidLeaveFraction: 0,
  };
}

/**
 * Serializes finalized AttendanceDay rows and enriches them with punch times
 * when a punch exists for the same employee/date. AttendanceDay remains the
 * source of truth for status, hours and payroll lock/fractions.
 */
function serializeAttendanceDay(day: DayWithEmployee, punch?: PunchWithEmployee) {
  return {
    id: day.id,
    ...employeeFields(day.employee ?? punch?.employee),
    date: formatDate(day.date),
    checkIn: formatLocalTime(punch?.punchIn ?? null, DEFAULT_TIMEZONE),
    checkOut: formatLocalTime(punch?.punchOut ?? null, DEFAULT_TIMEZONE),
    status: statusForUi(day.status),
    hoursWorked: Number(day.actualHours ?? 0),
    scheduledHours: Number(day.scheduledHours ?? 0),
    overtimeHours: Number(day.overtimeHours ?? 0),
    isOvertimeApproved: punch?.isOvertimeApproved ?? false,
    isLocked: day.isLocked,
    payableDayFraction: Number(day.payableDayFraction ?? 0),
    lopFraction: Number(day.lopFraction ?? 0),
    unpaidLeaveFraction: Number(day.unpaidLeaveFraction ?? 0),
  };
}

/** Merge finalized days with optional raw punches without duplicating a date. */
export function serializeAttendanceList(
  punches: PunchWithEmployee[],
  days: DayWithEmployee[] = []
) {
  const key = (employeeId: string, date: Date) =>
    `${employeeId}:${date.toISOString().slice(0, 10)}`;

  const punchByDay = new Map(
    punches.map((punch) => [key(punch.employeeId, punch.punchDate), punch] as const)
  );
  const finalizedKeys = new Set(days.map((day) => key(day.employeeId, day.date)));

  const merged = days.map((day) =>
    serializeAttendanceDay(day, punchByDay.get(key(day.employeeId, day.date)))
  );

  // Preserve live/raw punch rows that have not yet been materialized as a
  // finalized AttendanceDay (for example today's in-progress shift).
  for (const punch of punches) {
    if (!finalizedKeys.has(key(punch.employeeId, punch.punchDate))) {
      merged.push(serializeAttendance(punch));
    }
  }

return merged.sort((a, b) =>
  String(b.date ?? "").localeCompare(String(a.date ?? ""))
);}

export interface TeamSummary {
  date: string;
  present: number;
  late: number;
  absent: number;
  onLeave: number;
  wfh: number;
  total: number;
}

/**
 * Serializes attendance team summary.
 */
export function serializeTeamSummary(
  input: {
    date: string;
    present: number;
    late: number;
    absent: number;
    onLeave: number;
    wfh: number;
    total: number;
  }
): TeamSummary {
  return input;
}

/**
 * Returns employee code from an Employee object.
 */
export function serializeEmployeeCode(
  emp: Employee | { employeeCode: string } | null
): string | null {
  if (!emp) return null;

  return emp.employeeCode;
}

export { toNumber };