import api from "./api";

/**
 * Dashboard layout preferences — thin client for /api/dashboard/preferences.
 * The server validates widget ids against its catalog and the caller's real
 * role/permissions; unauthorized widgets are dropped and reported back.
 */

export async function getDashboardPreferences() {
  const response = await api.get("/dashboard/preferences");
  return response.data.data;
}

export async function saveDashboardPreferences(widgets) {
  const response = await api.put("/dashboard/preferences", { widgets });
  return response.data.data;
}

export async function resetDashboardPreferences() {
  const response = await api.delete("/dashboard/preferences");
  return response.data.data;
}
