/**
 * Employee Self Service — Module 16
 * Mirrors leaveService/attendanceService: async functions resolving to { data }.
 *
 * IMPORTANT: none of these functions take an arbitrary employeeId from the
 * caller for read/write of "my" data — they're wired to the session user
 * (ME.id in SelfService.jsx) exactly like Leave.jsx/Attendance.jsx hardcode
 * EMP001. In a real backend, employeeId must be derived server-side from the
 * authenticated session, never trusted from a client parameter (16.6).
 */

import {
  _getOverview,
  _getTaxDeclarations,
  _submitTaxDeclaration,
  _getLastExportRequest,
  _requestDataExport,
} from "../mock/ess";

const resolve = (data, ms = 350) => new Promise((res) => setTimeout(() => res({ data }), ms));

// Aggregates across modules; a single module being down degrades gracefully
// (see payrollError on the returned object) instead of failing the whole call.
export function getOverview(simulatePayrollDown = false) {
  return resolve(_getOverview(simulatePayrollDown));
}

export function getTaxDeclarations(employeeId) {
  return resolve(_getTaxDeclarations(employeeId));
}
export function submitTaxDeclaration(entry) {
  return resolve(_submitTaxDeclaration(entry));
}

export function getLastExportRequest(employeeId) {
  return resolve(_getLastExportRequest(employeeId));
}
// Throttled server-side (16.5.9) — returns { error } instead of a link if the
// employee already requested an export within the throttle window.
export function requestDataExport(employeeId) {
  return resolve(_requestDataExport(employeeId));
}