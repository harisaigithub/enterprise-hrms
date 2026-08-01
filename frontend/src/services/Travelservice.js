/**
 * Travel service — Module 15
 * Mirrors taskService/assetService/lmsService: async functions resolving to { data }.
 */

import {
  _getRequests,
  _raiseRequest,
  _managerDecision,
  _financeDecision,
  _attemptApiBooking,
  _confirmManualBooking,
  _disburseAdvance,
  _submitSettlement,
  _resolveSettlementBalance,
  _closeZeroBalanceSettlement,
  _getMaskedPassportRef,
} from "../mock/travel";

const resolve = (data, ms = 350) => new Promise((res) => setTimeout(() => res({ data }), ms));

export function getRequests(employeeId) {
  return resolve(_getRequests(employeeId));
}
export function getAllRequests() {
  return resolve(_getRequests(null));
}
export function raiseRequest(request) {
  return resolve(_raiseRequest(request));
}

// Returns { request } on success or { error } if the request wasn't in the
// expected approval state.
export function managerDecision(id, approved, by) {
  return resolve(_managerDecision(id, approved, by));
}
export function financeDecision(id, approved, by) {
  return resolve(_financeDecision(id, approved, by));
}

// 15.8: returns { request, apiFailed: true } if the (simulated) integration
// failed — the caller should surface "Booking In Progress" rather than
// treat this as a hard error.
export function attemptApiBooking(id, options) {
  return resolve(_attemptApiBooking(id, options));
}
export function confirmManualBooking(id, reference) {
  return resolve(_confirmManualBooking(id, reference));
}

// 15.6: returns { error } inline if the requested amount exceeds the
// policy-configured advance cap.
export function disburseAdvance(id, amount, disbursedBy) {
  return resolve(_disburseAdvance(id, amount, disbursedBy));
}

export function submitSettlement(id, actualCost, notes) {
  return resolve(_submitSettlement(id, actualCost, notes));
}
// 15.6: returns { error } if attempting to close a non-zero balance without
// a resolution method.
export function resolveSettlementBalance(id, method, note, approvedBy) {
  return resolve(_resolveSettlementBalance(id, method, note, approvedBy));
}
export function closeZeroBalanceSettlement(id, by) {
  return resolve(_closeZeroBalanceSettlement(id, by));
}

// 15.7/15.10: masked-only passport reference for display — never the full
// number. Exposed here purely so the UI can show "Passport on file" status.
export function getMaskedPassportRef(employeeId) {
  return resolve(_getMaskedPassportRef(employeeId));
}