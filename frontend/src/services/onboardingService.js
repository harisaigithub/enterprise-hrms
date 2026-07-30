/**
 * Onboarding service — Module 4
 * Mirrors the shape of employeeService / attendanceService / leaveService:
 * async functions resolving { data } after a simulated network delay.
 */

import { getMockOnboardingRecords } from "../mock/onboarding";

const DELAY = 350;

function delay(value) {
  return new Promise((resolve) => setTimeout(() => resolve({ data: value }), DELAY));
}

// In-memory store so status changes persist for the session (swap for real API later)
let _records = null;
function store() {
  if (!_records) _records = getMockOnboardingRecords();
  return _records;
}

/** All active onboarding checklists (new joiners not yet fully complete, plus recent completions) */
export function getOnboardingRecords() {
  return delay(store());
}

/** A single employee's onboarding checklist */
export function getOnboardingRecord(employeeId) {
  const record = store().find((r) => r.employeeId === employeeId);
  return delay(record || null);
}

/** Summary counts for dashboard widgets / stat cards */
export function getOnboardingSummary() {
  const records = store();
  const allItems = records.flatMap((r) => r.items);
  const totalItems = allItems.length;
  const completeItems = allItems.filter((i) => i.status === "Complete").length;
  const overdueItems = allItems.filter((i) => i.isOverdue).length;
  const pendingProcurement = allItems.filter((i) => i.status === "Pending Procurement").length;
  return delay({
    newJoiners: records.length,
    avgCompletion: totalItems ? Math.round((completeItems / totalItems) * 100) : 0,
    overdueItems,
    pendingProcurement,
  });
}

/**
 * Update a checklist item's status.
 * Note: item.status is recomputed server-side (here: in the mock store) to respect
 * `dependsOn` blocking — callers cannot force a blocked item to "Complete".
 */
export function updateChecklistItemStatus(employeeId, itemId, status) {
  const records = store();
  const record = records.find((r) => r.employeeId === employeeId);
  if (!record) return delay(null);

  const item = record.items.find((i) => i.id === itemId);
  if (!item || item.status === "Blocked") return delay(record); // hard block enforced

  item.status = status;
  item.isOverdue = status !== "Complete" && item.dueDate < new Date().toISOString().slice(0, 10);

  // Re-resolve any items that depend on this one
  record.items.forEach((dependent) => {
    if (dependent.dependsOn === itemId) {
      const stillBlocked = item.status !== "Complete";
      dependent.status = stillBlocked ? "Blocked" : (dependent.status === "Blocked" ? "Pending" : dependent.status);
      dependent.blockedReason = stillBlocked ? `Waiting on "${item.title}"` : null;
    }
  });

  return delay(record);
}