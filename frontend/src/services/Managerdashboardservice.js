/**
 * Manager Dashboard service —
 * Live backend integration scoped strictly to the authenticated manager's direct reports.
 */
import api from "./api";

let managerDashboardRequest = null;

export function clearManagerDashboardCache() {
  managerDashboardRequest = null;
}

export function loadManagerDashboard() {
  if (!managerDashboardRequest) {
    managerDashboardRequest = api.get("/dashboard/manager")
      .then((response) => response.data.data)
      .catch((error) => {
        managerDashboardRequest = null;
        throw error;
      });
  }
  return managerDashboardRequest;
}

export const getManagerDashboardSummary = () => loadManagerDashboard().then((data) => ({ data }));

export const getTeamApprovalsCount = () =>
  loadManagerDashboard().then((dashboard) => ({
    data: {
      pendingCount: dashboard?.pendingApprovals?.pendingCount ?? 0,
      breakdown: dashboard?.pendingApprovals?.breakdown ?? [
        { type: "Leave", count: 0 },
        { type: "Expense", count: 0 },
      ],
      recentRequests: dashboard?.pendingApprovals?.recentRequests ?? [],
    },
  }));

export const getTeamAttendanceSummary = () =>
  loadManagerDashboard().then((dashboard) => ({
    data: {
      teamSize: dashboard?.teamSize ?? 0,
      presentToday: dashboard?.presentToday ?? 0,
      onLeaveToday: dashboard?.onLeaveToday ?? 0,
      notCheckedInToday: dashboard?.notCheckedInToday ?? 0,
      attendanceRate: dashboard?.attendanceRate ?? 0,
      directReports: dashboard?.directReports ?? [],
    },
  }));

export const getDirectReportsList = () =>
  loadManagerDashboard().then((dashboard) => ({
    data: dashboard?.directReports ?? [],
  }));