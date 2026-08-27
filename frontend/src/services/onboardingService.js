/**
 * Onboarding service — Module 4
 * Mirrors the shape of employeeService / attendanceService / leaveService:
 * async functions resolving { data } after a simulated network delay.
 */

import api from "./api";

/**
 * Get all onboarding records
 */
export const getOnboardingRecords = async () => {
  const res = await api.get("/onboarding");
  return res.data;
};

/**
 * Get single onboarding record
 */
export const getOnboardingRecord = async (employeeId) => {
  const res = await api.get(`/onboarding/${employeeId}`);
  return res.data;
};

/**
 * Get onboarding summary
 */
export const getOnboardingSummary = async () => {
  const res = await api.get("/onboarding/summary");
  return res.data;
};

/**
 * Update checklist item status
 */
export const updateChecklistItemStatus = async (
  employeeId,
  itemId,
  status
) => {
  const res = await api.patch(
    `/onboarding/${employeeId}/checklist/${itemId}`,
    { status }
  );

  return res.data;
};