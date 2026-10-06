import type { SalaryStructure } from "@prisma/client";

type NumMap = Record<string, number>;

export type SalarySegment = {
  structure: SalaryStructure;
  from: Date;
  to: Date;
  days: number;
};

const EARNING_KEYS = ["basicSalary", "hra", "conveyanceAllowance", "medicalAllowance", "performanceBonus", "otherAllowances"] as const;
const DEDUCTION_KEYS = ["providentFund", "professionalTax", "incomeTax", "healthInsurance"] as const;
const n = (v: unknown) => Number(v ?? 0);
const utcDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const addDays = (d: Date, days: number) => new Date(utcDay(d) + days * 86400000);
const minDate = (a: Date, b: Date) => (a <= b ? a : b);
const maxDate = (a: Date, b: Date) => (a >= b ? a : b);
const inclusiveDays = (a: Date, b: Date) => Math.max(0, Math.floor((utcDay(b) - utcDay(a)) / 86400000) + 1);

/** Effective-dated salary segmentation. A mid-month revision therefore produces two segments. */
export function salarySegments(structures: SalaryStructure[], periodStart: Date, periodEnd: Date): SalarySegment[] {
  const ordered = [...structures]
    .filter((s) => s.effectiveFrom <= periodEnd)
    .sort((a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime());
  const out: SalarySegment[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const current = ordered[i];
    const next = ordered[i + 1];
    const from = maxDate(periodStart, current.effectiveFrom);
    const to = minDate(periodEnd, next ? addDays(next.effectiveFrom, -1) : periodEnd);
    const days = inclusiveDays(from, to);
    if (days > 0) out.push({ structure: current, from, to, days });
  }
  return out;
}

export function structureForDate(segments: SalarySegment[], date: Date): SalaryStructure | null {
  const t = utcDay(date);
  return segments.find((s) => t >= utcDay(s.from) && t <= utcDay(s.to))?.structure ?? null;
}

/** Calendar-day proration. Each monthly component is divided by days in the payroll month. */
export function prorateSalary(
  segments: SalarySegment[],
  daysInMonth: number,
): {
  earnings: NumMap & { total: number };
  deductions: NumMap & { total: number };
} {
  const earnings: NumMap = Object.fromEntries(EARNING_KEYS.map((k) => [k, 0]));
  const deductions: NumMap = Object.fromEntries(DEDUCTION_KEYS.map((k) => [k, 0]));
  for (const seg of segments) {
    const ratio = seg.days / daysInMonth;
    for (const key of EARNING_KEYS) earnings[key] += n(seg.structure[key]) * ratio;
    for (const key of DEDUCTION_KEYS) deductions[key] += n(seg.structure[key]) * ratio;
  }
  for (const k of Object.keys(earnings)) earnings[k] = round2(earnings[k]);
  for (const k of Object.keys(deductions)) deductions[k] = round2(deductions[k]);
  return {
    earnings: { ...earnings, total: round2(Object.values(earnings).reduce((a, b) => a + b, 0)) },
    deductions: { ...deductions, total: round2(Object.values(deductions).reduce((a, b) => a + b, 0)) },
  };
}

export function grossForStructure(s: SalaryStructure) {
  return EARNING_KEYS.reduce((sum, key) => sum + n(s[key]), 0);
}

/** LOP uses the salary effective on each unpaid date, rather than one salary for the whole month. */
export function effectiveDatedLopDeduction(
  rows: Array<{ date: Date; lopFraction: number; unpaidLeaveFraction: number }>,
  segments: SalarySegment[],
  daysInMonth: number,
) {
  let total = 0;
  for (const row of rows) {
    const fraction = n(row.lopFraction) + n(row.unpaidLeaveFraction);
    if (fraction <= 0) continue;
    const structure = structureForDate(segments, row.date);
    if (structure) total += (grossForStructure(structure) / daysInMonth) * fraction;
  }
  return round2(total);
}

export function overtimeEarning(
  rows: Array<{ date: Date; status?: string; overtimeHours: number }>,
  segments: SalarySegment[],
  daysInMonth: number,
  standardHoursPerDay: number,
  multiplier: number,
  holidayMultiplier = multiplier,
) {
  let total = 0;
  for (const row of rows) {
    const hours = Math.max(0, n(row.overtimeHours));
    if (!hours) continue;
    const structure = structureForDate(segments, row.date);
    if (!structure) continue;
    const hourly = grossForStructure(structure) / daysInMonth / Math.max(1, standardHoursPerDay);
    const applicableMultiplier = row.status === "Holiday" || row.status === "WeeklyOff" ? holidayMultiplier : multiplier;
    total += hourly * hours * applicableMultiplier;
  }
  return round2(total);
}

export function round2(v: number) { return Math.round((v + Number.EPSILON) * 100) / 100; }

export function fixedStatutoryAmount(config: unknown, monthlyGross: number): number | null {
  if (!config || typeof config !== "object") return null;
  const c = config as Record<string, unknown>;
  const amount = Number(c.amount);
  if (!Number.isFinite(amount)) return null;
  const min = c.minMonthlyGross == null ? -Infinity : Number(c.minMonthlyGross);
  const max = c.maxMonthlyGross == null ? Infinity : Number(c.maxMonthlyGross);
  if (monthlyGross < min || monthlyGross > max) return 0;
  return round2(amount);
}

export function gratuitySnapshot(
  dateOfJoining: Date,
  asOf: Date,
  monthlyBasic: number,
  minimumServiceYears: number,
  gratuityDays: number,
  divisor: number,
) {
  let completedYears = asOf.getUTCFullYear() - dateOfJoining.getUTCFullYear();
  const anniversary = new Date(Date.UTC(asOf.getUTCFullYear(), dateOfJoining.getUTCMonth(), dateOfJoining.getUTCDate()));
  if (asOf < anniversary) completedYears -= 1;
  completedYears = Math.max(0, completedYears);
  const eligible = completedYears >= minimumServiceYears;
  return {
    eligible,
    completedServiceYears: completedYears,
    estimatedAmount: eligible ? round2((monthlyBasic * gratuityDays * completedYears) / Math.max(1, divisor)) : 0,
  };
}
