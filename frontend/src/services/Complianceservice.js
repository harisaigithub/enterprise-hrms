/**
 * Compliance service — Module 24
 * Mirrors securityService/travelService: async functions resolving to { data }.
 */

import {
  _getObligations,
  _addObligation,
  _markObligationFiled,
  _getCaseSummaries,
  _getCaseDetail,
  _applyCaseLegalHold,
  _clearCaseLegalHold,
  _runCaseAccessSelfTest,
  _getRetentionRecords,
  _applyRecordLegalHold,
  _clearRecordLegalHold,
  _runRetentionJob,
  _queryAuditFeed,
  _getComplianceAuditLog,
  _getDashboardSummary,
} from "../mock/compliance";

const resolve = (data, ms = 350) => new Promise((res) => setTimeout(() => res({ data }), ms));

/* Calendar / Filings */
export function getObligations() {
  return resolve(_getObligations());
}
export function addObligation(obligation, by) {
  return resolve(_addObligation(obligation, by));
}
export function markObligationFiled(id, by) {
  return resolve(_markObligationFiled(id, by));
}

/* Compliance Cases (POSH) */
export function getCaseSummaries() {
  return resolve(_getCaseSummaries());
}
// 24.6/24.10: returns { error } if the actor is not on the case's named
// investigator list — enforced here, not just in the UI.
export function getCaseDetail(caseId, actorId) {
  return resolve(_getCaseDetail(caseId, actorId));
}
export function applyCaseLegalHold(caseId, reason, actorId) {
  return resolve(_applyCaseLegalHold(caseId, reason, actorId));
}
export function clearCaseLegalHold(caseId, actorId) {
  return resolve(_clearCaseLegalHold(caseId, actorId));
}
export function runCaseAccessSelfTest() {
  return resolve(_runCaseAccessSelfTest());
}

/* Retention & Legal Hold */
export function getRetentionRecords() {
  return resolve(_getRetentionRecords());
}
export function applyRecordLegalHold(recordId, reason, by) {
  return resolve(_applyRecordLegalHold(recordId, reason, by));
}
export function clearRecordLegalHold(recordId, by) {
  return resolve(_clearRecordLegalHold(recordId, by));
}
// 24.6/24.8: legal hold always blocks purge; unclassified fields are always
// skipped and flagged rather than acted on unsafely.
export function runRetentionJob(by) {
  return resolve(_runRetentionJob(by));
}

/* Audit feed */
export function queryAuditFeed(filters) {
  return resolve(_queryAuditFeed(filters));
}
export function getComplianceAuditLog() {
  return resolve(_getComplianceAuditLog());
}

/* Dashboard */
export function getDashboardSummary() {
  return resolve(_getDashboardSummary());
}