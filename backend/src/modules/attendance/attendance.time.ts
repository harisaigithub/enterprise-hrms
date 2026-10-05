/**
 * Timezone-safe date helpers for attendance. No dependencies (Intl only).
 *
 * Conventions used across the attendance module:
 *  - A "local date" is a "YYYY-MM-DD" string in the attendance timezone. It is the
 *    business day (for overnight shifts: the day the shift STARTS).
 *  - Prisma `@db.Date` columns are read/written as UTC-midnight Dates. Use
 *    `localDateToDbDate` / `dbDateToLocalDate` at the boundary; never `startOfDay(new Date())`
 *    for "today" (that is the UTC day and is wrong for 00:00-05:30 IST).
 *  - Instants (punch in/out, breaks) are real `Date`s; never read `getHours()` on them.
 */

export const DEFAULT_TIMEZONE = process.env.ATTENDANCE_TIMEZONE || "Asia/Kolkata";

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function dtf(timeZone: string): Intl.DateTimeFormat {
  let f = fmtCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    fmtCache.set(timeZone, f);
  }
  return f;
}

function partsOf(instant: Date, timeZone: string) {
  const out: Record<string, number> = {};
  for (const p of dtf(timeZone).formatToParts(instant)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return out as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** Local business date ("YYYY-MM-DD") of an instant in `timeZone`. */
export function localDateOf(instant: Date, timeZone = DEFAULT_TIMEZONE): string {
  const p = partsOf(instant, timeZone);
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
}

/** "HH:mm" wall-clock time of an instant in `timeZone` (replaces helpers.formatTime for punches). */
export function formatLocalTime(instant: Date | null | undefined, timeZone = DEFAULT_TIMEZONE): string | null {
  if (!instant) return null;
  const p = partsOf(instant, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** Offset (ms) of `timeZone` from UTC at `instant`. */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const p = partsOf(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Instant for a wall-clock `localDate` + `minuteOfDay` in `timeZone` (DST-safe, two-pass). */
export function zonedInstant(localDate: string, minuteOfDay: number, timeZone = DEFAULT_TIMEZONE): Date {
  const [y, m, d] = localDate.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d, 0, 0, 0) + minuteOfDay * 60_000;
  let guess = wall - tzOffsetMs(new Date(wall), timeZone);
  guess = wall - tzOffsetMs(new Date(guess), timeZone);
  return new Date(guess);
}

export function addDays(localDate: string, days: number): string {
  const [y, m, d] = localDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${pad(dt.getUTCFullYear(), 4)}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** 0 = Sunday … 6 = Saturday, for a local date (timezone-independent). */
export function dayOfWeek(localDate: string): number {
  const [y, m, d] = localDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isValidLocalDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Local date → UTC-midnight Date for Prisma `@db.Date` columns. */
export function localDateToDbDate(localDate: string): Date {
  return new Date(`${localDate}T00:00:00.000Z`);
}

/** Prisma `@db.Date` value → local date string. */
export function dbDateToLocalDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Prisma `@db.Time(0)` value → minutes from midnight (Prisma returns it as 1970-01-01T HH:mm:ssZ). */
export function timeColumnToMinutes(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60_000);
}
