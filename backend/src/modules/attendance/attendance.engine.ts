/**
 * Attendance calculation engine — PURE (no Prisma, no clock, no I/O).
 *
 * One function, `computeAttendanceDay`, turns raw facts (shift, punches, breaks, approved
 * leave / on-duty / holiday, approvals) into every number the dashboard, the leave module
 * and payroll need. Because the dashboard cards, the modal rows, the nightly materializer and
 * the LOP generator all call THIS function, they cannot disagree.
 *
 * Money-safety rules baked in (see tests):
 *  1. Precedence: HOLIDAY / WEEKLY_OFF  >  approved leave & on-duty  >  actual punches.
 *  2. Lateness is a FLAG (lateMinutes). It never deducts time by itself; only hours worked
 *     (net of unpaid breaks) can create a shortfall. A late-mark → half-day penalty is a
 *     monthly policy applied once, downstream, never per-day here.
 *  3. Grace is honoured in hours: arriving/leaving inside grace waives that time from the
 *     requirement, so a 09:10 arrival on a 09:15 grace shift is not "short by 10 minutes".
 *  4. Leave and shortfall never both deduct the same fraction of a day:
 *       payableDayFraction + lopFraction + unpaidLeaveFraction == 1   (working days)
 *     `lopFraction` is ONLY attendance-driven loss; unpaid leave is reported separately so
 *     payroll can sum them without double counting.
 */
import { dayOfWeek, DEFAULT_TIMEZONE, localDateOf, minutesBetween, zonedInstant } from "./attendance.time";

export const ENGINE_VERSION = "1.0.0";

export type ShiftType = "FIXED" | "FLEXIBLE" | "ROTATING" | "OVERNIGHT";

export interface ShiftSnapshot {
  id: string | null;
  name: string;
  /** ROTATING is a label only: rotation is expressed by effective-dated assignments. */
  type: ShiftType;
  /** Minutes from local midnight. endMinute <= startMinute means the shift ends the next day. */
  startMinute: number;
  endMinute: number;
  /** FLEXIBLE: length of the arrival window that begins at startMinute (late after start+grace). */
  graceMinutes: number;
  /** Unpaid meal break embedded in the shift window. */
  breakMinutes: number;
  /** FLEXIBLE only: required working minutes per day. */
  requiredMinutes?: number | null;
  /** Worked minutes after which overtime starts. Defaults to the required minutes. */
  overtimeThresholdMinutes?: number | null;
  /** 0 = Sunday … 6 = Saturday, evaluated on the day the shift STARTS. */
  weeklyOffDays: number[];
}

export interface AttendancePolicy {
  /** Minutes short of the requirement that are still treated as a full day. */
  fullDayToleranceMinutes: number;
  /** Worked >= ratio × required (but not a full day) → half day; below → absent. */
  halfDayMinRatio: number;
  /** Live dashboard only: a no-show becomes "Absent" this long after start+grace. */
  absentCutoffMinutes: number;
  /** After shiftEnd + buffer the day is closed; an open punch becomes INCOMPLETE. */
  dayCloseBufferMinutes: number;
  /** Leaving up to this early is not "early out" (and the time is waived). */
  earlyOutGraceMinutes: number;
  unpaidBreakTypes: string[];
  /** Deduct the shift's embedded break even if the employee did not log one. */
  autoDeductShiftBreak: boolean;
  /** …but only when the person was present at least this long (rest-interval style rule). */
  autoDeductMinElapsedMinutes: number;
  minOvertimeMinutes: number;
  overtimeRoundingMinutes: number;
  /** Anything longer is treated as a bad punch and routed to regularization. */
  maxPlausibleWorkedMinutes: number;
  /** Time worked on a holiday / weekly off is raw overtime (still needs approval). */
  offDayWorkIsOvertime: boolean;
}

export const DEFAULT_POLICY: AttendancePolicy = {
  fullDayToleranceMinutes: 0,
  halfDayMinRatio: 0.5,
  absentCutoffMinutes: 120,
  dayCloseBufferMinutes: 120,
  earlyOutGraceMinutes: 0,
  unpaidBreakTypes: ["Lunch Break", "Personal Break"],
  autoDeductShiftBreak: true,
  autoDeductMinElapsedMinutes: 300,
  minOvertimeMinutes: 30,
  overtimeRoundingMinutes: 15,
  maxPlausibleWorkedMinutes: 20 * 60,
  offDayWorkIsOvertime: true,
};

export interface BreakFact {
  type: string;
  start: Date;
  end: Date | null;
}

export interface DayInput {
  /** Business date ("YYYY-MM-DD"), for overnight shifts the day the shift starts. */
  date: string;
  timezone?: string;
  /** Injected clock — the engine never calls new Date(). */
  now: Date;
  shift: ShiftSnapshot;
  holiday?: { name: string } | null;
  /** Approved leave covering this date (fractions of the day, already resolved from half-day portions). */
  leave?: { paidFraction: number; unpaidFraction: number } | null;
  /** Approved on-duty (client visit etc.) fraction of the day. */
  onDutyFraction?: number;
  /** Which half is covered by leave / on-duty when the cover is 0.5 (moves the expected window). */
  coveredHalf?: "FIRST" | "SECOND" | null;
  /** Approved work-from-home (presence still needs a punch). */
  wfh?: boolean;
  punchIn: Date | null;
  punchOut: Date | null;
  breaks?: BreakFact[];
  /** true = all raw overtime approved; number = approved minutes cap; false/undefined = none. */
  overtimeApproved?: boolean | number;
  policy?: Partial<AttendancePolicy>;
}

export type DayType = "WORKING" | "HOLIDAY" | "WEEKLY_OFF";
export type DayStatus =
  | "PRESENT"
  | "HALF_DAY"
  | "ABSENT"
  | "ON_LEAVE"
  | "ON_DUTY"
  | "HOLIDAY"
  | "WEEKLY_OFF"
  | "INCOMPLETE"
  | "IN_PROGRESS"
  | "NOT_STARTED";

/** Exactly one per employee-day, so card counts always sum to the roster size. */
export type DashboardBucket = "present" | "late" | "wfh" | "absent" | "onLeave" | "notYetIn" | "holiday" | "weeklyOff";

export interface DayResult {
  date: string;
  dayType: DayType;
  dayStatus: DayStatus;
  bucket: DashboardBucket;
  /** false while the day can still change on its own (in progress, before cutoff, future). */
  isFinal: boolean;
  /** Missing / impossible punches: a human must regularize before LOP is confirmed. */
  requiresRegularization: boolean;
  flags: string[];
  isLate: boolean;
  isEarlyOut: boolean;

  scheduledMinutes: number;
  workedMinutes: number;
  leaveMinutes: number;
  onDutyMinutes: number;
  payableMinutes: number;
  shortfallMinutes: number;
  lateMinutes: number;
  earlyOutMinutes: number;
  rawOvertimeMinutes: number;
  approvedOvertimeMinutes: number;

  /** Days (0..1) paid for this date. */
  payableDayFraction: number;
  /** Days (0..1) lost because of attendance (absence / shortfall / missing punch). */
  lopFraction: number;
  /** Days (0..1) covered by UNPAID leave — reported separately from lopFraction. */
  unpaidLeaveFraction: number;

  shiftStart: Date;
  shiftEnd: Date;
  engineVersion: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const clamp01 = (n: number) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));

function overlapMinutes(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): number {
  const s = Math.max(aStart.getTime(), bStart.getTime());
  const e = Math.min(aEnd.getTime(), bEnd.getTime());
  return e > s ? Math.round((e - s) / 60_000) : 0;
}

export function computeAttendanceDay(input: DayInput): DayResult {
  const policy: AttendancePolicy = { ...DEFAULT_POLICY, ...(input.policy ?? {}) };
  const tz = input.timezone ?? DEFAULT_TIMEZONE;
  const { shift, now } = input;
  const flags: string[] = [];

  const today = localDateOf(now, tz);
  const isFuture = input.date > today;

  // ── Shift window ──────────────────────────────────────────────────────────
  const rawWindow = (shift.endMinute - shift.startMinute + 1440) % 1440;
  const windowMinutes = rawWindow === 0 ? 1440 : rawWindow;
  const shiftStart = zonedInstant(input.date, shift.startMinute, tz);
  const shiftEnd = new Date(shiftStart.getTime() + windowMinutes * 60_000);
  const scheduledFull =
    shift.type === "FLEXIBLE" && shift.requiredMinutes
      ? shift.requiredMinutes
      : Math.max(0, windowMinutes - shift.breakMinutes);

  // Closed only once the shift window (+ buffer) is over; an overnight shift's start date is "past" after midnight
  // while the shift is still running, so the calendar date alone must not close the day.
  const dayClosed = now.getTime() >= shiftEnd.getTime() + policy.dayCloseBufferMinutes * 60_000;

  // ── Day type ──────────────────────────────────────────────────────────────
  const dayType: DayType = input.holiday
    ? "HOLIDAY"
    : shift.weeklyOffDays.includes(dayOfWeek(input.date))
      ? "WEEKLY_OFF"
      : "WORKING";

  const hasIn = !!input.punchIn;
  const hasOut = !!input.punchOut;
  const badOrder = hasIn && hasOut && input.punchOut!.getTime() <= input.punchIn!.getTime();
  if (badOrder) flags.push("INVALID_PUNCH_ORDER");

  // ── Worked minutes (net of unpaid breaks) ─────────────────────────────────
  let workedMinutes = 0;
  if (hasIn && !badOrder) {
    const inAt = input.punchIn!;
    const outAt = input.punchOut ?? (now.getTime() > inAt.getTime() ? now : inAt);
    const elapsed = minutesBetween(inAt, outAt);
    let recordedUnpaid = 0;
    for (const b of input.breaks ?? []) {
      if (!policy.unpaidBreakTypes.includes(b.type)) continue;
      recordedUnpaid += overlapMinutes(b.start, b.end ?? outAt, inAt, outAt);
    }
    const auto =
      policy.autoDeductShiftBreak && elapsed >= policy.autoDeductMinElapsedMinutes ? shift.breakMinutes : 0;
    workedMinutes = Math.max(0, elapsed - Math.max(recordedUnpaid, auto));
    if (workedMinutes > policy.maxPlausibleWorkedMinutes) flags.push("IMPLAUSIBLE_DURATION");
  }
  const punchesUsable = hasIn && hasOut && !badOrder && !flags.includes("IMPLAUSIBLE_DURATION");

  const roundOt = (raw: number) => {
    if (raw < policy.minOvertimeMinutes) return 0;
    const step = Math.max(1, policy.overtimeRoundingMinutes);
    return Math.floor(raw / step) * step;
  };
  const approveOt = (raw: number) => {
    const a = input.overtimeApproved;
    if (a === true) return raw;
    if (typeof a === "number") return Math.min(raw, Math.max(0, Math.floor(a)));
    return 0;
  };

  const base = {
    date: input.date,
    dayType,
    shiftStart,
    shiftEnd,
    engineVersion: ENGINE_VERSION,
  };

  // ── Holiday / weekly off (payable regardless; leave inside them is NOT deducted) ──
  if (dayType !== "WORKING") {
    if (hasIn) flags.push("WORKED_ON_OFF_DAY");
    const raw =
      policy.offDayWorkIsOvertime && punchesUsable && workedMinutes > 0 ? roundOt(workedMinutes) : 0;
    const inProgress = hasIn && !hasOut && !dayClosed;
    if (hasIn && !hasOut && dayClosed) flags.push("MISSING_PUNCH_OUT");
    return {
      ...base,
      dayStatus: dayType,
      bucket: dayType === "HOLIDAY" ? "holiday" : "weeklyOff",
      isFinal: !inProgress,
      requiresRegularization: flags.includes("MISSING_PUNCH_OUT") || badOrder,
      flags,
      isLate: false,
      isEarlyOut: false,
      scheduledMinutes: 0,
      workedMinutes,
      leaveMinutes: 0,
      onDutyMinutes: 0,
      payableMinutes: 0,
      shortfallMinutes: 0,
      lateMinutes: 0,
      earlyOutMinutes: 0,
      rawOvertimeMinutes: raw,
      approvedOvertimeMinutes: approveOt(raw),
      payableDayFraction: 1,
      lopFraction: 0,
      unpaidLeaveFraction: 0,
    };
  }

  // ── Coverage from approved leave / on-duty (capped so they never exceed one day) ──
  const paid = clamp01(input.leave?.paidFraction ?? 0);
  const unpaid = Math.min(clamp01(input.leave?.unpaidFraction ?? 0), 1 - paid);
  const od = Math.min(clamp01(input.onDutyFraction ?? 0), 1 - paid - unpaid);
  const remaining = r2(1 - paid - unpaid - od);
  const leaveMinutes = Math.round(scheduledFull * (paid + unpaid));
  const onDutyMinutes = Math.round(scheduledFull * od);
  if (paid + unpaid > 0 && remaining > 0) flags.push("PARTIAL_LEAVE");
  if (input.wfh) flags.push("WFH");

  // Fully covered day: punches (if any) are informational only.
  if (remaining <= 0) {
    if (hasIn) flags.push("WORKED_WHILE_COVERED");
    const onLeave = paid + unpaid >= od && paid + unpaid > 0;
    return {
      ...base,
      dayStatus: onLeave ? "ON_LEAVE" : "ON_DUTY",
      bucket: onLeave ? "onLeave" : "present",
      isFinal: true,
      requiresRegularization: false,
      flags,
      isLate: false,
      isEarlyOut: false,
      scheduledMinutes: scheduledFull,
      workedMinutes,
      leaveMinutes,
      onDutyMinutes,
      payableMinutes: Math.round(scheduledFull * (paid + od)),
      shortfallMinutes: 0,
      lateMinutes: 0,
      earlyOutMinutes: 0,
      rawOvertimeMinutes: 0,
      approvedOvertimeMinutes: 0,
      payableDayFraction: r2(paid + od),
      lopFraction: 0,
      unpaidLeaveFraction: r2(unpaid),
    };
  }

  // ── Expected window (moves when one half is covered by leave/on-duty) ──────
  let expectedStart = shiftStart;
  let expectedEnd = shiftEnd;
  const partial = remaining < 1;
  if (partial && input.coveredHalf === "FIRST") {
    expectedStart = new Date(shiftStart.getTime() + (windowMinutes / 2) * 60_000);
  } else if (partial && input.coveredHalf === "SECOND") {
    expectedEnd = new Date(shiftStart.getTime() + (windowMinutes / 2) * 60_000);
  }

  const requiredMinutes = Math.round(scheduledFull * remaining);

  // ── Lateness / early-out (flags + grace waiver, never a deduction by themselves) ──
  let lateMinutes = 0;
  let earlyOutMinutes = 0;
  let waivedMinutes = 0;
  if (hasIn) {
    const arrival = minutesBetween(expectedStart, input.punchIn!);
    if (arrival > shift.graceMinutes) lateMinutes = arrival;
    else if (arrival > 0) waivedMinutes += arrival; // inside grace → forgiven in hours too
  }
  if (punchesUsable && shift.type !== "FLEXIBLE") {
    const early = minutesBetween(input.punchOut!, expectedEnd);
    if (early > policy.earlyOutGraceMinutes) earlyOutMinutes = early;
    else if (early > 0) waivedMinutes += early;
  }
  const isLate = lateMinutes > 0;
  const isEarlyOut = earlyOutMinutes > 0;
  if (isLate) flags.push("LATE");
  if (isEarlyOut) flags.push("EARLY_OUT");
  const effectiveRequired = Math.max(0, requiredMinutes - waivedMinutes);

  // ── Status ────────────────────────────────────────────────────────────────
  let dayStatus: DayStatus;
  let isFinal = true;
  let requiresRegularization = false;
  let workedFraction = 0; // share of the REMAINING (uncovered) part of the day that is paid

  if (!hasIn && !hasOut) {
    if (isFuture) {
      dayStatus = "NOT_STARTED";
      isFinal = false;
    } else if (dayClosed) {
      dayStatus = "ABSENT";
    } else if (now.getTime() >= expectedStart.getTime() + (shift.graceMinutes + policy.absentCutoffMinutes) * 60_000) {
      dayStatus = "ABSENT"; // provisional: employee may still arrive
      isFinal = false;
      flags.push("PROVISIONAL_ABSENT");
    } else {
      dayStatus = "NOT_STARTED";
      isFinal = false;
    }
  } else if (badOrder || (!hasIn && hasOut)) {
    dayStatus = "INCOMPLETE";
    requiresRegularization = true;
    if (!hasIn) flags.push("MISSING_PUNCH_IN");
  } else if (hasIn && !hasOut) {
    if (!dayClosed) {
      dayStatus = "IN_PROGRESS";
      isFinal = false;
    } else {
      dayStatus = "INCOMPLETE";
      requiresRegularization = true;
      flags.push("MISSING_PUNCH_OUT");
    }
  } else if (flags.includes("IMPLAUSIBLE_DURATION")) {
    dayStatus = "INCOMPLETE";
    requiresRegularization = true;
  } else {
    const full = effectiveRequired === 0 || workedMinutes >= effectiveRequired - policy.fullDayToleranceMinutes;
    if (full) {
      workedFraction = 1;
      dayStatus = "PRESENT";
    } else if (workedMinutes >= effectiveRequired * policy.halfDayMinRatio) {
      workedFraction = 0.5;
      dayStatus = "HALF_DAY";
    } else {
      dayStatus = "ABSENT";
    }
  }

  // ── Money-relevant numbers ────────────────────────────────────────────────
  const payableDayFraction = r2(paid + od + remaining * workedFraction);
  const lopFraction = isFinal ? r2(remaining * (1 - workedFraction)) : 0;
  const shortfallMinutes = !isFinal
    ? 0
    : dayStatus === "INCOMPLETE" || !(hasIn && hasOut)
      ? effectiveRequired
      : Math.max(0, effectiveRequired - workedMinutes);

  // ── Overtime (only on clean, closed punches) ──────────────────────────────
  let rawOvertimeMinutes = 0;
  if (punchesUsable && dayStatus !== "INCOMPLETE") {
    const threshold =
      shift.overtimeThresholdMinutes != null
        ? Math.round(shift.overtimeThresholdMinutes * remaining)
        : requiredMinutes;
    rawOvertimeMinutes = roundOt(Math.max(0, workedMinutes - threshold));
  }

  // ── Dashboard bucket: exactly one per employee-day ────────────────────────
  let bucket: DashboardBucket;
  if (dayStatus === "ABSENT") bucket = "absent";
  else if (!hasIn && dayStatus !== "INCOMPLETE") bucket = "notYetIn";
  else if (!hasIn) bucket = "absent";
  else if (input.wfh) bucket = "wfh";
  else if (isLate) bucket = "late";
  else bucket = "present";

  return {
    ...base,
    dayStatus,
    bucket,
    isFinal,
    requiresRegularization,
    flags,
    isLate,
    isEarlyOut,
    scheduledMinutes: scheduledFull,
    workedMinutes,
    leaveMinutes,
    onDutyMinutes,
    payableMinutes: Math.round(scheduledFull * payableDayFraction),
    shortfallMinutes,
    lateMinutes,
    earlyOutMinutes,
    rawOvertimeMinutes,
    approvedOvertimeMinutes: approveOt(rawOvertimeMinutes),
    payableDayFraction,
    lopFraction,
    unpaidLeaveFraction: r2(unpaid),
  };
}

/** Sum bucket counts. `total` is the rostered headcount, and always equals the sum of the buckets. */
export function summarizeBuckets(rows: { bucket: DashboardBucket }[]) {
  const out: Record<DashboardBucket, number> & { total: number } = {
    present: 0,
    late: 0,
    wfh: 0,
    absent: 0,
    onLeave: 0,
    notYetIn: 0,
    holiday: 0,
    weeklyOff: 0,
    total: rows.length,
  };
  for (const r of rows) out[r.bucket] += 1;
  return out;
}

