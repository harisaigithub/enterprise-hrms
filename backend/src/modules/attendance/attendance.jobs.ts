import { prisma } from "../../lib/prisma";
import { addDays, DEFAULT_TIMEZONE, localDateOf } from "./attendance.time";
import { materializeAttendanceDay } from "./attendance.roster";

/**
 * Materialize the previous business date after the configured attendance close window.
 * This function is intentionally scheduler-agnostic: wire it to your existing worker/cron.
 */
export async function runAttendanceMaterializer(now = new Date()) {
  const today = localDateOf(now, DEFAULT_TIMEZONE);
  const date = addDays(today, -1);
  const result = await materializeAttendanceDay(date, now);
return { ...result, date };
}

/**
 * Creates the current and next monthly payroll periods if they do not exist.
 * Payroll should normally own this job; this helper only guarantees the attendance
 * lock guard has a period row to consult.
 */
export async function ensurePayrollPeriods(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  const name = `${year}-${String(month).padStart(2, "0")}`;
  const existing = await prisma.payrollPeriod.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.payrollPeriod.create({ data: { name, startDate: start, endDate: end, status: "OPEN" } });
}
