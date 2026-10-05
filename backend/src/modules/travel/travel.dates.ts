export function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  if (year < 1) return null;

  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.toISOString().slice(0, 10) === value ? date : null;
}

export function validateTravelDateRange(startDate: string, endDate: string, today = new Date().toISOString().slice(0, 10)) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end) return { error: "Valid travel dates are required" } as const;
  if (startDate < today) return { error: "Travel cannot start in the past" } as const;
  if (end < start) return { error: "End date cannot be before start date" } as const;
  const durationDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  if (durationDays > 90) return { error: "A travel request cannot exceed 90 days" } as const;
  return { start, end, durationDays } as const;
}

export function isPastTripStartDate(startDate: Date, now = new Date()): boolean {
  return startDate.toISOString().slice(0, 10) < now.toISOString().slice(0, 10);
}

export function isPastTripEndDate(endDate: Date, now = new Date()): boolean {
  return endDate.toISOString().slice(0, 10) < now.toISOString().slice(0, 10);
}