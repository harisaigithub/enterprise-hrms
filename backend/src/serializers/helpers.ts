/** Shared serialization helpers. */

export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "object" && "toNumber" in (value as object) ? (value as { toNumber(): number }).toNumber() : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function formatTime(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toTimeString().slice(0, 5);
}

/** Deterministic hash → integer in [min, max] (used for stable avatar images). */
export function hashStringToRange(input: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return min + (Math.abs(hash) % (max - min + 1));
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Compute the number of working days between two dates (inclusive). */
export function countWeekdays(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}
