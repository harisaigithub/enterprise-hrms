import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";

/**
 * One guard for every attendance/leave write path. Call it BEFORE mutating anything dated `localDate`:
 *   - regularization request        (reject early, don't waste the manager's time)
 *   - regularization HR approval    (period may have frozen while it waited)
 *   - leave approve / cancel
 *   - attendance day materializer / manual punch edits / bulk import
 *
 * Fail-open when no PayrollPeriod row covers the date; create the period rows ahead of time
 * (a monthly job) so that "no row" never happens in production.
 */
export async function assertPeriodOpen(localDate: string, opts: { allowFrozen?: boolean } = {}) {
  const d = new Date(`${localDate}T00:00:00.000Z`);
  const period = await prisma.payrollPeriod.findFirst({
    where: { startDate: { lte: d }, endDate: { gte: d } },
    select: { status: true, startDate: true, endDate: true, name: true },
  });
  if (!period) return;
  const label = period.name;
  if (period.status === "LOCKED") {
    throw AppError.conflict(`Payroll for ${label} is locked. Raise a payroll adjustment instead of editing attendance.`);
  }
  if (period.status === "ATTENDANCE_FROZEN" && !opts.allowFrozen) {
    throw AppError.conflict(`Attendance for ${label} is frozen for payroll processing.`);
  }
}

/** For batch jobs: returns the period status for a date without throwing. */
export async function periodStateFor(localDate: string) {
  const d = new Date(`${localDate}T00:00:00.000Z`);
  return prisma.payrollPeriod.findFirst({
    where: { startDate: { lte: d }, endDate: { gte: d } },
    select: { id: true, status: true },
  });
}
