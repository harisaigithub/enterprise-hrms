/**
 * Asset service — Module 12
 * Mirrors lmsService/leaveService: async functions resolving to { data }.
 */

import {
  _getInventory,
  _addInventoryItem,
  _getAssetHistory,
  _getLicenseAlerts,
  _getRequests,
  _raiseRequest,
  _approveRequest,
  _rejectRequest,
  _fulfillRequest,
  _acknowledgeReceipt,
  _returnAsset,
  _getPendingReturnsForEmployee,
} from "../mock/assets";

const resolve = (data, ms = 350) => new Promise((res) => setTimeout(() => res({ data }), ms));

export function getInventory() {
  return resolve(_getInventory());
}
export function addInventoryItem(item) {
  return resolve(_addInventoryItem(item));
}
export function getAssetHistory(assetId) {
  return resolve(_getAssetHistory(assetId));
}
export function getLicenseAlerts() {
  return resolve(_getLicenseAlerts());
}

export function getRequests(employeeId) {
  return resolve(_getRequests(employeeId));
}
export function getAllRequests() {
  return resolve(_getRequests(null));
}
export function raiseRequest(request) {
  return resolve(_raiseRequest(request));
}
export function approveRequest(id, approverName) {
  return resolve(_approveRequest(id, approverName));
}
export function rejectRequest(id) {
  return resolve(_rejectRequest(id));
}
// Returns { procurementNeeded } if nothing was in stock, { error } if the
// chosen unit was invalid, or { request, asset } on success.
export function fulfillRequest(requestId, assetId) {
  return resolve(_fulfillRequest(requestId, assetId));
}

export function acknowledgeReceipt(assetId, employeeId) {
  return resolve(_acknowledgeReceipt(assetId, employeeId));
}
// Validation rule 12.7: returns { error } instead of throwing so the UI can
// show the wipe-checklist requirement inline.
export function returnAsset(assetId, condition, wipeCompleted) {
  return resolve(_returnAsset(assetId, condition, wipeCompleted));
}

export function getPendingReturnsForEmployee(employeeId) {
  return resolve(_getPendingReturnsForEmployee(employeeId));
}