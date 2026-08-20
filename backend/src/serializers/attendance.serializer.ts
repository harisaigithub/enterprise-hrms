import type { AttendancePunch, Employee } from "@prisma/client";
import { formatDate, formatTime, toNumber } from "./helpers";

type PunchWithEmployee = AttendancePunch & {
  employee?: { employeeCode: string } | null;
};

/**
 * Maps a DB attendance punch to the frontend contract (see mock/attendance.js).
 * checkIn/checkOut are "HH:MM" strings; hoursWorked is computed.
 */
export function serializeAttendance(punch: PunchWithEmployee) {
  const hoursWorked =
    punch.punchIn && punch.punchOut
      ? Math.round(((punch.punchOut.getTime() - punch.punchIn.getTime()) / 3_600_000) * 100) / 100
      : 0;

  return {
    id: punch.id,
    employeeId: punch.employee?.employeeCode ?? "",
    date: formatDate(punch.punchDate),
    checkIn: formatTime(punch.punchIn),
    checkOut: formatTime(punch.punchOut),
    status: punch.status,
    hoursWorked,
  };
}

export function serializeAttendanceList(punches: PunchWithEmployee[]) {
  return punches.map(serializeAttendance);
}

export interface TeamSummary {
  date: string;
  present: number;
  late: number;
  absent: number;
  onLeave: number;
  wfh: number;
  total: number;
}

export function serializeTeamSummary(
  input: { date: string; present: number; late: number; absent: number; onLeave: number; wfh: number; total: number }
): TeamSummary {
  return input;
}

export function serializeEmployeeCode(emp: Employee | { employeeCode: string } | null): string | null {
  if (!emp) return null;
  return emp.employeeCode;
}

export { toNumber };
