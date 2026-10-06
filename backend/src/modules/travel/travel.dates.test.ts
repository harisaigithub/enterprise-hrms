import assert from "node:assert/strict";
import test from "node:test";
import { isPastTripEndDate, isPastTripStartDate, parseDateOnly, validateTravelDateRange } from "./travel.dates";

test("parseDateOnly accepts valid calendar dates", () => {
  assert.equal(parseDateOnly("2024-02-29")?.toISOString(), "2024-02-29T00:00:00.000Z");
  assert.equal(parseDateOnly("2026-10-01")?.toISOString(), "2026-10-01T00:00:00.000Z");
});

test("parseDateOnly rejects malformed and rollover dates", () => {
  assert.equal(parseDateOnly("2025-02-29"), null);
  assert.equal(parseDateOnly("2026-04-31"), null);
  assert.equal(parseDateOnly("2026-2-01"), null);
  assert.equal(parseDateOnly("0000-01-01"), null);
});

test("past trip detection compares calendar dates and allows a trip ending today", () => {
  const today = parseDateOnly("2026-10-02")!;
  assert.equal(isPastTripStartDate(parseDateOnly("2026-10-01")!, today), true);
  assert.equal(isPastTripStartDate(today, today), false);
  assert.equal(isPastTripStartDate(parseDateOnly("2026-10-03")!, today), false);
  assert.equal(isPastTripEndDate(parseDateOnly("2026-10-01")!, today), true);
  assert.equal(isPastTripEndDate(today, today), false);
  assert.equal(isPastTripEndDate(parseDateOnly("2026-10-03")!, today), false);
});

test("travel date validation rejects past starts and reversed ranges at the API rule boundary", () => {
  assert.deepEqual(validateTravelDateRange("2026-10-01", "2026-10-02", "2026-10-02"), {
    error: "Travel cannot start in the past",
  });
  assert.deepEqual(validateTravelDateRange("2026-10-03", "2026-10-02", "2026-10-02"), {
    error: "End date cannot be before start date",
  });
  assert.deepEqual(validateTravelDateRange("2026-10-02", "2026-10-02", "2026-10-02"), {
    start: parseDateOnly("2026-10-02"),
    end: parseDateOnly("2026-10-02"),
    durationDays: 1,
  });
});