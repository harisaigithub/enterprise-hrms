export function calculateTravelSettlement(actualCost: number, advanceGiven: number) {
  const difference = actualCost - advanceGiven;
  return {
    actualCost,
    advanceGiven,
    balance: Math.abs(difference),
    balanceType: difference > 0 ? "Due to Employee" : difference < 0 ? "Due from Employee" : null,
  };
}

export function maxTravelAdvance(estimatedCost: number, percent = 70) {
  return Math.floor(estimatedCost * percent / 100);
}

export function travelAdvanceValidationError(amount: number, estimatedCost: number, percent = 70) {
  const max = maxTravelAdvance(estimatedCost, percent);
  if (!Number.isFinite(amount) || amount <= 0) return "Advance must be greater than zero";
  if (amount > max) return `Advance cannot exceed ${percent}% of estimated cost (₹${max.toLocaleString("en-IN")})`;
  return null;
}

export function createTravelAdvanceRecoverySettlement(amount: number, notes: string, submittedAt = new Date().toISOString()) {
  return {
    actualCost: 0,
    advanceGiven: amount,
    balance: amount,
    balanceType: amount > 0 ? "Due from Employee" : null,
    submittedAt,
    notes,
    itemization: [],
    resolution: null,
    cancelledBeforeTravel: true,
  };
}

export function assertPassportOnFile(isInternational: boolean, passportNumber: string | null | undefined) {
  if (isInternational && !passportNumber?.trim()) {
    throw new Error("A valid passport must be on file before an international trip can be booked.");
  }
}

export function assertNotOwnTravelAction(requestEmployeeId: string, actorEmployeeId: string, action: string) {
  if (requestEmployeeId === actorEmployeeId) {
    throw new Error(`You cannot ${action} your own travel request.`);
  }
}