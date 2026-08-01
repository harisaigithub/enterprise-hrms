/**
 * Mock data — Travel Management (Module 15)
 */

export const TRAVEL_MODES = ["Air", "Rail", "Road"];

export const requestStatusMeta = {
  "Pending Manager Approval": { color: "#d97706", bg: "#fffbeb" },
  "Pending Finance Approval": { color: "#d97706", bg: "#fffbeb" },
  Rejected: { color: "#dc2626", bg: "#fef2f2" },
  Approved: { color: "#0284c7", bg: "#f0f9ff" },
  "Booking In Progress": { color: "#dc2626", bg: "#fef2f2" },
  Booked: { color: "#7c3aed", bg: "#f5f3ff" },
  "Settlement Submitted": { color: "#0284c7", bg: "#f0f9ff" },
  Closed: { color: "#16a34a", bg: "#f0fdf4" },
};

// 15.3: Travel Policy — class of travel by grade, per-diem, advance limits,
// and the cost threshold above which Finance approval is also required.
export const travelPolicy = {
  advanceMaxPercent: 70,
  financeApprovalThreshold: 100000,
  classByGrade: { L2: "Economy", L3: "Economy", L4: "Business", L5: "Business" },
  perDiemByGrade: { L2: 1500, L3: 1800, L4: 2500, L5: 3000 },
};

// Stand-in for the org directory (grade drives policy class/per-diem lookups).
export const employeeGradeDirectory = [
  { id: "EMP001", name: "Matsya Singh", grade: "L4" },
  { id: "EMP002", name: "Alice Quinn", grade: "L4" },
  { id: "EMP003", name: "Viki Vance", grade: "L3" },
  { id: "EMP004", name: "Gary Chen", grade: "L3" },
  { id: "EMP006", name: "James Sullivan", grade: "L2" },
];

const ME_ID = "EMP001";

// 15.7/15.10: stand-in for Module 2's single encrypted employee-identity
// store. This module is the ONLY place a passport number ever exists in
// plaintext. It is not exported — nothing outside this file can read it
// directly, and Travel Request/Booking records only ever store the masked
// reference returned by _getMaskedPassportRef, or, transiently, whatever
// _decryptPassportForBooking hands back (which is never persisted).
const _module2IdentityStore = {
  EMP001: { passportNumber: "P1234567", passportExpiry: "2029-04-01" },
  EMP002: { passportNumber: "P7654321", passportExpiry: "2027-11-12" },
  EMP003: { passportNumber: null, passportExpiry: null },
  EMP004: { passportNumber: null, passportExpiry: null },
  EMP006: { passportNumber: "P5551234", passportExpiry: "2026-09-30" },
};

function _mask(passportNumber) {
  if (!passportNumber) return null;
  return `•••••${passportNumber.slice(-2)}`;
}

// Safe to expose: masked display only, for showing "on file" status in the UI.
export function _getMaskedPassportRef(employeeId) {
  return _mask(_module2IdentityStore[employeeId]?.passportNumber || null);
}

// 15.5 step 3: transient decrypt for the booking API call only. The caller
// (the booking function below) uses this value in-memory to make the
// booking call and then discards it — it is never written onto the request.
function _decryptPassportForBooking(employeeId) {
  return _module2IdentityStore[employeeId]?.passportNumber || null;
}

let travelRequests = [
  {
    id: "tr1",
    employeeId: ME_ID, employeeName: "Matsya Singh", grade: "L4",
    destination: "Singapore", startDate: "2026-08-20", endDate: "2026-08-24",
    purpose: "APAC partner summit", mode: "Air", estimatedCost: 145000,
    isInternational: true,
    status: "Pending Finance Approval",
    managerApproval: { approved: true, by: "Alice Quinn", date: "2026-07-29" },
    financeApproval: null,
    advance: null, booking: null, settlement: null,
    createdAt: "2026-07-28",
  },
  {
    id: "tr2",
    employeeId: "EMP004", employeeName: "Gary Chen", grade: "L3",
    destination: "Bengaluru", startDate: "2026-08-05", endDate: "2026-08-07",
    purpose: "Client on-site review", mode: "Air", estimatedCost: 42000,
    isInternational: false,
    status: "Booking In Progress",
    managerApproval: { approved: true, by: "Alice Quinn", date: "2026-07-26" },
    financeApproval: null,
    advance: { amount: 20000, disbursedAt: "2026-07-27", disbursedBy: "Finance Desk" },
    booking: { mode: "api", confirmedAt: null, reference: null, passportRefUsed: null, bookingFailed: true, failureNote: "Booking API timed out — falling back to manual booking." },
    settlement: null,
    createdAt: "2026-07-24",
  },
  {
    id: "tr3",
    employeeId: ME_ID, employeeName: "Matsya Singh", grade: "L4",
    destination: "Mumbai", startDate: "2026-07-15", endDate: "2026-07-17",
    purpose: "Vendor contract negotiation", mode: "Air", estimatedCost: 38000,
    isInternational: false,
    status: "Booked",
    managerApproval: { approved: true, by: "Alice Quinn", date: "2026-07-10" },
    financeApproval: null,
    advance: { amount: 25000, disbursedAt: "2026-07-11", disbursedBy: "Finance Desk" },
    booking: { mode: "api", confirmedAt: "2026-07-11", reference: "TKT-88213", passportRefUsed: null, bookingFailed: false, failureNote: null },
    settlement: null,
    createdAt: "2026-07-08",
  },
  {
    id: "tr4",
    employeeId: "EMP006", employeeName: "James Sullivan", grade: "L2",
    destination: "Dubai", startDate: "2026-06-10", endDate: "2026-06-13",
    purpose: "Regional sales kickoff", mode: "Air", estimatedCost: 90000,
    isInternational: true,
    status: "Settlement Submitted",
    managerApproval: { approved: true, by: "Alice Quinn", date: "2026-06-01" },
    financeApproval: { approved: true, by: "Finance Desk", date: "2026-06-02" },
    advance: { amount: 60000, disbursedAt: "2026-06-03", disbursedBy: "Finance Desk" },
    booking: { mode: "api", confirmedAt: "2026-06-03", reference: "TKT-77410", passportRefUsed: "•••••34", bookingFailed: false, failureNote: null },
    settlement: {
      actualCost: 68500, advanceGiven: 60000, balance: 8500, balanceType: "Due to Employee",
      submittedAt: "2026-06-15", notes: "Extra night due to flight delay.", resolution: null,
    },
    createdAt: "2026-05-28",
  },
  {
    id: "tr5",
    employeeId: "EMP003", employeeName: "Viki Vance", grade: "L3",
    destination: "Pune", startDate: "2026-05-05", endDate: "2026-05-06",
    purpose: "Design workshop", mode: "Road", estimatedCost: 12000,
    isInternational: false,
    status: "Closed",
    managerApproval: { approved: true, by: "Alice Quinn", date: "2026-05-01" },
    financeApproval: null,
    advance: { amount: 8000, disbursedAt: "2026-05-02", disbursedBy: "Finance Desk" },
    booking: { mode: "manual", confirmedAt: "2026-05-02", reference: "CAB-4471", passportRefUsed: null, bookingFailed: false, failureNote: null },
    settlement: {
      actualCost: 8000, advanceGiven: 8000, balance: 0, balanceType: null,
      submittedAt: "2026-05-08", notes: "", resolution: { method: "N/A — zero balance", approvedBy: "Finance Desk", note: "No balance to resolve.", resolvedAt: "2026-05-08" },
    },
    createdAt: "2026-04-29",
  },
];

/* ---------------- Requests & Approvals ---------------- */

export function _getRequests(employeeId) {
  return employeeId ? travelRequests.filter((r) => r.employeeId === employeeId) : travelRequests;
}

export function _raiseRequest({ employeeId, employeeName, grade, destination, startDate, endDate, purpose, mode, estimatedCost, isInternational }) {
  const request = {
    id: `tr-${Date.now()}`,
    employeeId, employeeName, grade,
    destination, startDate, endDate, purpose, mode,
    estimatedCost: Number(estimatedCost),
    isInternational: !!isInternational,
    status: "Pending Manager Approval",
    managerApproval: null, financeApproval: null,
    advance: null, booking: null, settlement: null,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  travelRequests = [request, ...travelRequests];
  return request;
}

// 15.5 step 2: Manager approval, escalating to Finance if the estimated cost
// is above the policy-configured threshold (Section 2.2 standard pattern).
export function _managerDecision(id, approved, by) {
  const req = travelRequests.find((r) => r.id === id);
  if (!req || req.status !== "Pending Manager Approval") return { error: "Request is not awaiting manager approval." };

  const today = new Date().toISOString().slice(0, 10);
  const needsFinance = req.estimatedCost > travelPolicy.financeApprovalThreshold;
  const newStatus = !approved ? "Rejected" : needsFinance ? "Pending Finance Approval" : "Approved";

  travelRequests = travelRequests.map((r) =>
    r.id === id ? { ...r, status: newStatus, managerApproval: { approved, by, date: today } } : r
  );
  return { request: travelRequests.find((r) => r.id === id) };
}

export function _financeDecision(id, approved, by) {
  const req = travelRequests.find((r) => r.id === id);
  if (!req || req.status !== "Pending Finance Approval") return { error: "Request is not awaiting Finance approval." };

  const today = new Date().toISOString().slice(0, 10);
  travelRequests = travelRequests.map((r) =>
    r.id === id ? { ...r, status: approved ? "Approved" : "Rejected", financeApproval: { approved, by, date: today } } : r
  );
  return { request: travelRequests.find((r) => r.id === id) };
}

/* ---------------- Booking ---------------- */

// 15.5 step 3 + 15.8: attempts booking via the (simulated) travel-booking
// API integration. On failure, falls back to manual booking and the request
// stays visibly in "Booking In Progress" rather than stalling silently.
// For international travel, the passport number is decrypted transiently
// from the Module 2 store purely to make this call — only a masked
// reference is ever written back onto the travel record.
export function _attemptApiBooking(id, { simulateFailure = false } = {}) {
  const req = travelRequests.find((r) => r.id === id);
  if (!req) return { error: "Request not found." };
  if (req.status !== "Approved" && req.status !== "Booking In Progress") {
    return { error: "Request must be Approved before booking." };
  }

  if (simulateFailure) {
    travelRequests = travelRequests.map((r) =>
      r.id === id
        ? { ...r, status: "Booking In Progress", booking: { mode: "api", confirmedAt: null, reference: null, passportRefUsed: null, bookingFailed: true, failureNote: "Booking API integration failed — falling back to manual booking." } }
        : r
    );
    return { request: travelRequests.find((r) => r.id === id), apiFailed: true };
  }

  let passportRefUsed = null;
  if (req.isInternational) {
    // Transient use only — this local variable is never stored.
    const fullPassportNumber = _decryptPassportForBooking(req.employeeId);
    passportRefUsed = _mask(fullPassportNumber);
  }

  const today = new Date().toISOString().slice(0, 10);
  travelRequests = travelRequests.map((r) =>
    r.id === id
      ? { ...r, status: "Booked", booking: { mode: "api", confirmedAt: today, reference: `TKT-${Math.floor(10000 + Math.random() * 89999)}`, passportRefUsed, bookingFailed: false, failureNote: null } }
      : r
  );
  return { request: travelRequests.find((r) => r.id === id), apiFailed: false };
}

// Manual fallback confirmation once Travel Desk has booked outside the API.
export function _confirmManualBooking(id, reference) {
  const req = travelRequests.find((r) => r.id === id);
  if (!req || req.status !== "Booking In Progress") return { error: "Request is not in Booking In Progress." };

  let passportRefUsed = null;
  if (req.isInternational) {
    const fullPassportNumber = _decryptPassportForBooking(req.employeeId);
    passportRefUsed = _mask(fullPassportNumber);
  }

  const today = new Date().toISOString().slice(0, 10);
  travelRequests = travelRequests.map((r) =>
    r.id === id
      ? { ...r, status: "Booked", booking: { mode: "manual", confirmedAt: today, reference, passportRefUsed, bookingFailed: false, failureNote: null } }
      : r
  );
  return { request: travelRequests.find((r) => r.id === id) };
}

/* ---------------- Advance ---------------- */

// 15.6: advance cannot exceed the policy-configured percentage of estimated
// trip cost.
export function _disburseAdvance(id, amount, disbursedBy) {
  const req = travelRequests.find((r) => r.id === id);
  if (!req) return { error: "Request not found." };
  if (!["Approved", "Booking In Progress", "Booked"].includes(req.status)) {
    return { error: "Request must be Approved (or further along) before an advance can be disbursed." };
  }
  const maxAdvance = Math.round(req.estimatedCost * (travelPolicy.advanceMaxPercent / 100));
  if (Number(amount) > maxAdvance) {
    return { error: `Advance cannot exceed ${travelPolicy.advanceMaxPercent}% of estimated cost (₹${maxAdvance.toLocaleString("en-IN")}).` };
  }

  const today = new Date().toISOString().slice(0, 10);
  travelRequests = travelRequests.map((r) =>
    r.id === id ? { ...r, advance: { amount: Number(amount), disbursedAt: today, disbursedBy } } : r
  );
  return { request: travelRequests.find((r) => r.id === id) };
}

/* ---------------- Settlement ---------------- */

export function _submitSettlement(id, actualCost, notes) {
  const req = travelRequests.find((r) => r.id === id);
  if (!req) return { error: "Request not found." };
  if (req.status !== "Booked") return { error: "Settlement can only be submitted once travel has been booked." };

  const advanceGiven = req.advance?.amount || 0;
  const balance = Number(actualCost) - advanceGiven;
  const balanceType = balance > 0 ? "Due to Employee" : balance < 0 ? "Due from Employee" : null;

  const today = new Date().toISOString().slice(0, 10);
  travelRequests = travelRequests.map((r) =>
    r.id === id
      ? {
          ...r,
          status: "Settlement Submitted",
          settlement: { actualCost: Number(actualCost), advanceGiven, balance: Math.abs(balance), balanceType, submittedAt: today, notes: notes || "", resolution: null },
        }
      : r
  );
  return { request: travelRequests.find((r) => r.id === id) };
}

// 15.6: settlement cannot be marked complete while a non-zero balance
// remains unresolved — resolution method must be explicitly recorded.
export function _resolveSettlementBalance(id, method, note, approvedBy) {
  const req = travelRequests.find((r) => r.id === id);
  if (!req || !req.settlement) return { error: "No settlement to resolve." };
  if (req.settlement.balance > 0 && !method) {
    return { error: "A resolution method (Refunded / Payroll Deduction / Written Off) is required before this settlement can be closed." };
  }

  const today = new Date().toISOString().slice(0, 10);
  travelRequests = travelRequests.map((r) =>
    r.id === id
      ? { ...r, status: "Closed", settlement: { ...r.settlement, resolution: { method, note: note || "", approvedBy, resolvedAt: today } } }
      : r
  );
  return { request: travelRequests.find((r) => r.id === id) };
}

// Zero-balance settlements can close directly without a resolution method.
export function _closeZeroBalanceSettlement(id, by) {
  const req = travelRequests.find((r) => r.id === id);
  if (!req || !req.settlement) return { error: "No settlement to close." };
  if (req.settlement.balance !== 0) {
    return { error: "Non-zero balance — use the resolution flow instead of a direct close." };
  }
  const today = new Date().toISOString().slice(0, 10);
  travelRequests = travelRequests.map((r) =>
    r.id === id
      ? { ...r, status: "Closed", settlement: { ...r.settlement, resolution: { method: "N/A — zero balance", note: "No balance to resolve.", approvedBy: by, resolvedAt: today } } }
      : r
  );
  return { request: travelRequests.find((r) => r.id === id) };
}