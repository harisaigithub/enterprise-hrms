/**
 * Policy Management service — Module 18
 * Mirrors leaveService/attendanceService: async functions resolving to { data }.
 */

import {
  _getPolicies,
  _createPolicy,
  _addVersion,
  _publishPolicy,
  _getAcknowledgements,
  _acknowledgePolicy,
} from "../mock/policies";

const resolve = (data, ms = 350) => new Promise((res) => setTimeout(() => res({ data }), ms));

export function getPolicies() {
  return resolve(_getPolicies());
}
export function createPolicy(policy) {
  return resolve(_createPolicy(policy));
}
// Every save is a new, immutable version entry — never edits a prior version.
export function addVersion(policyId, version) {
  return resolve(_addVersion(policyId, version));
}
// Validation rule 18.6: needs an effective date, and if mandatory, an
// acknowledgement deadline, before it can go from Draft to Published.
export function publishPolicy(id) {
  return resolve(_publishPolicy(id));
}

export function getAcknowledgements(employeeId) {
  return resolve(_getAcknowledgements(employeeId));
}
export function getAllAcknowledgements() {
  return resolve(_getAcknowledgements(null));
}
// A timestamped, authenticated acceptance click — recorded against the
// specific version, so acknowledging v1 never satisfies a v2 requirement.
export function acknowledgePolicy(policyId, versionId, employeeId, employeeName) {
  return resolve(_acknowledgePolicy(policyId, versionId, employeeId, employeeName));
}