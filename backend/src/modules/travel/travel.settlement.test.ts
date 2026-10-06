import assert from "node:assert/strict";
import test from "node:test";
import { assertNotOwnTravelAction, assertPassportOnFile, calculateTravelSettlement, createTravelAdvanceRecoverySettlement, maxTravelAdvance, travelAdvanceValidationError } from "./travel.settlement";

test("travel settlement direction reflects who owes the balance", () => {
  assert.deepEqual(calculateTravelSettlement(550, 500), {
    actualCost: 550,
    advanceGiven: 500,
    balance: 50,
    balanceType: "Due to Employee",
  });
  assert.deepEqual(calculateTravelSettlement(450, 500), {
    actualCost: 450,
    advanceGiven: 500,
    balance: 50,
    balanceType: "Due from Employee",
  });
  assert.deepEqual(calculateTravelSettlement(500, 500), {
    actualCost: 500,
    advanceGiven: 500,
    balance: 0,
    balanceType: null,
  });
});

test("advance validation rounds the 70% cap down and rejects amounts above it", () => {
  assert.equal(maxTravelAdvance(10_001), 7_000);
  assert.equal(maxTravelAdvance(10_000), 7_000);
  assert.equal(maxTravelAdvance(9_999), 6_999);
  assert.equal(travelAdvanceValidationError(7_000, 10_001), null);
  assert.match(travelAdvanceValidationError(7_001, 10_001) || "", /70%/);
  assert.match(travelAdvanceValidationError(0, 10_001) || "", /greater than zero/);
  assert.match(travelAdvanceValidationError(-1, 10_001) || "", /greater than zero/);
  assert.match(travelAdvanceValidationError(Number.NaN, 10_001) || "", /greater than zero/);
});

test("cancelling after an advance creates a full employee-recovery balance", () => {
  assert.deepEqual(createTravelAdvanceRecoverySettlement(7_000, "Cancelled", "2026-10-05T00:00:00.000Z"), {
    actualCost: 0,
    advanceGiven: 7_000,
    balance: 7_000,
    balanceType: "Due from Employee",
    submittedAt: "2026-10-05T00:00:00.000Z",
    notes: "Cancelled",
    itemization: [],
    resolution: null,
    cancelledBeforeTravel: true,
  });
});

test("passport is mandatory only for international bookings", () => {
  assert.doesNotThrow(() => assertPassportOnFile(false, null));
  assert.doesNotThrow(() => assertPassportOnFile(true, "P123456"));
  assert.throws(() => assertPassportOnFile(true, null), /passport must be on file/);
});

test("financial travel actions reject self-service by the request owner", () => {
  assert.throws(() => assertNotOwnTravelAction("employee-1", "employee-1", "disburse an advance for"), /own travel request/);
  assert.doesNotThrow(() => assertNotOwnTravelAction("employee-1", "finance-1", "disburse an advance for"));
});