/**
 * Asset service — Module 12
 * Connected to real Asset Management backend APIs.
 */

import api from "./api";

/* =========================================================
   INVENTORY
========================================================= */

export function getInventory() {
  return api.get("/assets/inventory");
}

export function addInventoryItem(item) {
  return api.post("/assets/inventory", item);
}

export function updateInventoryItem(assetId, changes) {
  return api.patch(`/assets/inventory/${assetId}`, changes);
}

export function assignInventoryItem(assetId, employeeId) {
  return api.post(`/assets/inventory/${assetId}/assign`, { employeeId });
}

export function retireInventoryItem(assetId, reason) {
  return api.patch(`/assets/inventory/${assetId}/retire`, { reason });
}

export function sendInventoryItemForRepair(assetId, reason) {
  return api.patch(`/assets/inventory/${assetId}/maintenance`, { reason });
}

/* =========================================================
   ASSET HISTORY
========================================================= */

export function getAssetHistory(assetId) {
  return api.get(`/assets/inventory/${assetId}/history`);
}

/* =========================================================
   LICENSE ALERTS
========================================================= */

export function getLicenseAlerts() {
  return api.get("/assets/license-alerts");
}

/* =========================================================
   REQUESTS
========================================================= */

export function getRequests(employeeId) {
  return api.get("/assets/requests", {
    params: {
      employeeId,
    },
  });
}

export function getAllRequests() {
  return api.get("/assets/requests");
}

/* =========================================================
   RAISE REQUEST
========================================================= */

export function raiseRequest(request) {
  return api.post("/assets/requests", request);
}

/* =========================================================
   APPROVE REQUEST
========================================================= */

export function approveRequest(id, approverName) {
  return api.patch(`/assets/requests/${id}/approve`, {
    approverName,
  });
}

/* =========================================================
   REJECT REQUEST
========================================================= */

export function rejectRequest(id, reason) {
  return api.patch(`/assets/requests/${id}/reject`, { reason });
}

/* =========================================================
   FULFILL REQUEST
========================================================= */

export function fulfillRequest(requestId, assetId) {
  return api.patch(
    `/assets/requests/${requestId}/fulfill`,
    {
      assetId: assetId || null,
    }
  );
}

export function getMyAssets() {
  return api.get("/assets/my-assets");
}

/* =========================================================
   ACKNOWLEDGE RECEIPT
========================================================= */

export function acknowledgeReceipt(assetId) {
  return api.patch(
    `/assets/${assetId}/acknowledge`
  );
}

/* =========================================================
   RETURN ASSET
========================================================= */

export function returnAsset(
  assetId,
  condition,
  wipeCompleted
) {
  return api.patch(
    `/assets/${assetId}/return`,
    {
      condition,
      wipeCompleted,
    }
  );
}

/* =========================================================
   PENDING RETURNS
========================================================= */

export function getPendingReturnsForEmployee() {
  return api.get("/assets/pending-returns");
}