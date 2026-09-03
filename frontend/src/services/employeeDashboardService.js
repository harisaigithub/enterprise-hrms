import api from "./api";

let dashboardRequest = null;

function loadDashboard() {
  if (!dashboardRequest) {
    dashboardRequest = api.get("/dashboard/employee")
      .then((response) => response.data.data)
      .catch((error) => {
        dashboardRequest = null;
        throw error;
      });
  }
  return dashboardRequest;
}

function section(key) {
  return () => loadDashboard().then((dashboard) => ({ data: dashboard[key] }));
}

export function clearEmployeeDashboardCache() {
  dashboardRequest = null;
}

export const getTodayAttendance = section("attendance");
export const getLeaveBalanceSummary = section("leaveBalances");
export const getPayslipStatus = section("payslip");
export const getUpcomingBirthdays = section("birthdays");
export const getPendingSelfAssessment = section("selfAssessment");
export const getUpcomingComplianceCourses = section("complianceCourses");
export const getPendingPolicies = section("pendingPolicies");
export const getRecentNotifications = section("notifications");

// These widgets are still used by the Manager dashboard. The project has no
// holiday or announcement API yet, so return an honest empty state instead of
// reintroducing the old hard-coded demo records.
export async function getUpcomingHolidays() {
  return { data: [] };
}

export async function getActiveAnnouncements() {
  return { data: [] };
}
