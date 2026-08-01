/**
 * Separation Management service — Module 19
 * Mirrors leaveService/attendanceService: async functions resolving to { data }.
 */

import {
  _getSeparations,
  _initiateSeparation,
  _getClearanceItems,
  _updateClearanceItem,
  _getExitInterview,
  _recordExitInterview,
  _computeSettlement,
  _revokeAccess,
  _convertToAlumni,
  _getAlumni,
} from "../mock/separation";

const resolve = (data, ms = 350) => new Promise((res) => setTimeout(() => res({ data }), ms));

export function getSeparations() {
  return resolve(_getSeparations());
}
export function initiateSeparation(sep) {
  return resolve(_initiateSeparation(sep));
}

export function getClearanceItems(separationId) {
  return resolve(_getClearanceItems(separationId));
}
export function updateClearanceItem(id, status, notes) {
  return resolve(_updateClearanceItem(id, status, notes));
}

// HR-only by design (19.7) — callers outside an HR-role view should not wire
// this up at all, not merely hide the result in the UI.
export function getExitInterview(separationId) {
  return resolve(_getExitInterview(separationId));
}
export function recordExitInterview(separationId, responses, conductedBy) {
  return resolve(_recordExitInterview(separationId, responses, conductedBy));
}

// Hard gate (19.6): returns { error } instead of a result if clearance is
// incomplete and no override was supplied.
export function computeSettlement(separationId, breakdown, override, overrideReason) {
  return resolve(_computeSettlement(separationId, breakdown, override, overrideReason));
}

// Atomic revocation across SSO/email/VPN/HRMS — modeled as a single call,
// not a per-system toggle list.
export function revokeAccess(separationId) {
  return resolve(_revokeAccess(separationId));
}

export function convertToAlumni(separationId, tenure, role, eligibleForRehire) {
  return resolve(_convertToAlumni(separationId, tenure, role, eligibleForRehire));
}
export function getAlumni() {
  return resolve(_getAlumni());
}