/**
 * Mock data — Asset Management (Module 12)
 */

export const ASSET_CATEGORIES = ["Laptop", "Mobile", "SIM", "Access Card", "Software License", "Accessories"];

// Standard workflow pattern (Section 2.2): these categories are above the
// value/approval threshold and require Manager sign-off before fulfillment.
export const CATEGORIES_REQUIRING_APPROVAL = ["Laptop", "Mobile", "Software License"];

// Assets that can hold sensitive data — must pass the wipe/reimage checklist
// before they can go back to "Returned — In Stock".
export const DATA_BEARING_CATEGORIES = ["Laptop", "Mobile"];

export const assetStatusMeta = {
  "In Stock": { color: "#16a34a", bg: "#f0fdf4" },
  Assigned: { color: "#0284c7", bg: "#f0f9ff" },
  "Returned — In Stock": { color: "#16a34a", bg: "#f0fdf4" },
  "Returned — Damaged/Write-off": { color: "#dc2626", bg: "#fef2f2" },
};

export const requestStatusMeta = {
  "Pending Approval": { color: "#d97706", bg: "#fffbeb" },
  "Pending Procurement": { color: "#dc2626", bg: "#fef2f2" },
  Approved: { color: "#0284c7", bg: "#f0f9ff" },
  Fulfilled: { color: "#16a34a", bg: "#f0fdf4" },
  Rejected: { color: "#64748b", bg: "#f1f5f9" },
};

const ME_ID = "EMP001";
const LICENSE_EXPIRY_ALERT_DAYS = 30;
const LICENSE_SEAT_ALERT_RATIO = 0.9;

let inventory = [
  { id: "as1", serial: "LAP-2201", category: "Laptop", make: "Dell", model: "Latitude 5440", status: "Assigned", currentHolderId: ME_ID, currentHolderName: "Matsya Singh", acknowledged: true, wipeCompleted: null },
  { id: "as2", serial: "LAP-2202", category: "Laptop", make: "Dell", model: "Latitude 5440", status: "In Stock", currentHolderId: null, currentHolderName: null, acknowledged: null, wipeCompleted: null },
  { id: "as3", serial: "MOB-1090", category: "Mobile", make: "Samsung", model: "Galaxy A54", status: "In Stock", currentHolderId: null, currentHolderName: null, acknowledged: null, wipeCompleted: null },
  { id: "as4", serial: "SIM-5521", category: "SIM", make: "Airtel", model: "Corporate SIM", status: "In Stock", currentHolderId: null, currentHolderName: null, acknowledged: null, wipeCompleted: null },
  { id: "as5", serial: "AC-3301", category: "Access Card", make: "HID", model: "Prox Card", status: "Assigned", currentHolderId: "EMP004", currentHolderName: "Gary Chen", acknowledged: true, wipeCompleted: null },
  {
    id: "as6", serial: "LIC-FIGMA-01", category: "Software License", make: "Figma", model: "Org Plan",
    status: "In Stock", currentHolderId: null, currentHolderName: null, acknowledged: null, wipeCompleted: null,
    seats: 20, seatsUsed: 18, licenseExpiry: "2026-08-20",
  },
];

let requests = [
  { id: "req1", employeeId: ME_ID, employeeName: "Matsya Singh", category: "Mobile", justification: "Existing device out of warranty.", status: "Pending Approval", assetId: null, raisedAt: "2026-07-28" },
  { id: "req2", employeeId: "EMP006", employeeName: "James Sullivan", category: "Accessories", justification: "Wireless mouse for new desk setup.", status: "Approved", assetId: null, raisedAt: "2026-07-27" },
];

let history = [
  { id: "h1", assetId: "as1", action: "Assigned", employeeId: ME_ID, employeeName: "Matsya Singh", date: "2026-03-01", conditionNotes: "New, no visible wear." },
  { id: "h2", assetId: "as1", action: "Acknowledged", employeeId: ME_ID, employeeName: "Matsya Singh", date: "2026-03-01", conditionNotes: "Confirmed serial + condition." },
  { id: "h3", assetId: "as5", action: "Assigned", employeeId: "EMP004", employeeName: "Gary Chen", date: "2026-02-15", conditionNotes: "Standard issue." },
];

/* ---------------- Inventory ---------------- */

export function _getInventory() {
  return inventory;
}

export function _addInventoryItem(item) {
  inventory = [{ ...item, status: "In Stock", currentHolderId: null, currentHolderName: null, acknowledged: null, wipeCompleted: null }, ...inventory];
  return inventory[0];
}

export function _getAssetHistory(assetId) {
  return history.filter((h) => h.assetId === assetId);
}

// 12.9: alert IT/Admin ahead of license expiry or when seat allocation nears cap.
export function _getLicenseAlerts() {
  const today = new Date();
  return inventory
    .filter((i) => i.category === "Software License")
    .map((i) => {
      const alerts = [];
      if (i.licenseExpiry) {
        const daysToExpiry = Math.ceil((new Date(i.licenseExpiry) - today) / (1000 * 60 * 60 * 24));
        if (daysToExpiry <= LICENSE_EXPIRY_ALERT_DAYS) alerts.push(`Expires in ${daysToExpiry} day(s)`);
      }
      if (i.seats && i.seatsUsed / i.seats >= LICENSE_SEAT_ALERT_RATIO) {
        alerts.push(`Seats ${i.seatsUsed}/${i.seats} — nearing cap`);
      }
      return { asset: i, alerts };
    })
    .filter((a) => a.alerts.length > 0);
}

/* ---------------- Requests ---------------- */

export function _getRequests(employeeId) {
  return employeeId ? requests.filter((r) => r.employeeId === employeeId) : requests;
}

export function _raiseRequest({ employeeId, employeeName, category, justification }) {
  const requiresApproval = CATEGORIES_REQUIRING_APPROVAL.includes(category);
  const request = {
    id: `req-${Date.now()}`,
    employeeId,
    employeeName,
    category,
    justification,
    status: requiresApproval ? "Pending Approval" : "Approved",
    assetId: null,
    raisedAt: new Date().toISOString().slice(0, 10),
  };
  requests = [request, ...requests];
  return request;
}

export function _approveRequest(id, approverName) {
  const req = requests.find((r) => r.id === id);
  if (!req || req.status !== "Pending Approval") return null;
  requests = requests.map((r) => (r.id === id ? { ...r, status: "Approved", approvedBy: approverName } : r));
  return requests.find((r) => r.id === id);
}

export function _rejectRequest(id) {
  requests = requests.map((r) => (r.id === id ? { ...r, status: "Rejected" } : r));
  return requests.find((r) => r.id === id);
}

// 12.5 step 4 + 12.8: IT Support picks a specific in-stock unit. If nothing's
// in stock for the category, the request is held as Pending Procurement
// (visible, not silently stalled) instead of failing.
export function _fulfillRequest(requestId, assetId) {
  const req = requests.find((r) => r.id === requestId);
  if (!req || req.status !== "Approved") return null;

  if (!assetId) {
    requests = requests.map((r) => (r.id === requestId ? { ...r, status: "Pending Procurement" } : r));
    return { request: requests.find((r) => r.id === requestId), procurementNeeded: true };
  }

  const item = inventory.find((i) => i.id === assetId);
  if (!item || item.status !== "In Stock") {
    return { error: "Selected unit is no longer in stock." };
  }

  const today = new Date().toISOString().slice(0, 10);
  // Unique current-holder constraint: only ever set on an In Stock item, so
  // no asset can carry two simultaneous active holders.
  inventory = inventory.map((i) =>
    i.id === assetId
      ? { ...i, status: "Assigned", currentHolderId: req.employeeId, currentHolderName: req.employeeName, acknowledged: false }
      : i
  );
  history = [{ id: `h-${Date.now()}`, assetId, action: "Assigned", employeeId: req.employeeId, employeeName: req.employeeName, date: today, conditionNotes: "Issued from stock." }, ...history];
  requests = requests.map((r) => (r.id === requestId ? { ...r, status: "Fulfilled", assetId } : r));

  return { request: requests.find((r) => r.id === requestId), asset: inventory.find((i) => i.id === assetId) };
}

/* ---------------- Acknowledgement & Return ---------------- */

// 12.5 step 5: closes the assignment loop — the accountability record if the
// asset is later lost/damaged.
export function _acknowledgeReceipt(assetId, employeeId) {
  const today = new Date().toISOString().slice(0, 10);
  const item = inventory.find((i) => i.id === assetId);
  if (!item) return null;
  inventory = inventory.map((i) => (i.id === assetId ? { ...i, acknowledged: true } : i));
  history = [{ id: `h-${Date.now()}`, assetId, action: "Acknowledged", employeeId, employeeName: item.currentHolderName, date: today, conditionNotes: "Confirmed serial + condition on receipt." }, ...history];
  return inventory.find((i) => i.id === assetId);
}

// 12.7: data-bearing assets must pass the wipe/reimage checklist before they
// can go back to "Returned — In Stock". 12.6: return must be logged before
// Separation Clearance (Module 17) can complete.
export function _returnAsset(assetId, condition, wipeCompleted) {
  const item = inventory.find((i) => i.id === assetId);
  if (!item) return { error: "Asset not found." };

  const isDataBearing = DATA_BEARING_CATEGORIES.includes(item.category);
  if (condition === "Good" && isDataBearing && !wipeCompleted) {
    return { error: "Disk wipe/reimage checklist must be completed before this asset can be marked Returned — In Stock." };
  }

  const today = new Date().toISOString().slice(0, 10);
  const newStatus = condition === "Good" ? "Returned — In Stock" : "Returned — Damaged/Write-off";
  const returningEmployeeId = item.currentHolderId;
  const returningEmployeeName = item.currentHolderName;

  inventory = inventory.map((i) =>
    i.id === assetId
      ? { ...i, status: newStatus, currentHolderId: null, currentHolderName: null, acknowledged: null, wipeCompleted: isDataBearing ? !!wipeCompleted : null }
      : i
  );
  history = [{ id: `h-${Date.now()}`, assetId, action: "Returned", employeeId: returningEmployeeId, employeeName: returningEmployeeName, date: today, conditionNotes: condition === "Good" ? "Returned in good condition." : "Returned damaged — written off." }, ...history];

  return { asset: inventory.find((i) => i.id === assetId) };
}

// 12.6: cross-referenced by Module 17 (Separation) to gate clearance until
// every asset this employee holds has been returned and acknowledged.
export function _getPendingReturnsForEmployee(employeeId) {
  return inventory.filter((i) => i.currentHolderId === employeeId && i.status === "Assigned");
}