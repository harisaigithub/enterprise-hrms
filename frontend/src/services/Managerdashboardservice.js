/**
 * Manager Dashboard service — spec 3.2, 3.6
 * ABAC note: real implementation must scope these server-side to the
 * manager's direct/indirect reports only (never company-wide).
 */
import { teamApprovals, teamAttendanceSummary } from "../mock/ManagerDashboard";

function delay(value, ms = 400) {
  return new Promise((resolve) => setTimeout(() => resolve({ data: value }), ms));
}

export const getTeamApprovalsCount = () => delay(teamApprovals);
export const getTeamAttendanceSummary = () => delay(teamAttendanceSummary);