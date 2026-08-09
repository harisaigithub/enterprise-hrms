/**
 * Manager Dashboard — 
 * ABAC note: in a real backend these must be scoped server-side to the
 * manager's direct/indirect reports only, never company-wide.
 */

export const teamApprovals = {
  pendingCount: 5,
  breakdown: [
    { type: "Leave", count: 3 },
    { type: "Expense", count: 2 },
  ],
};

export const teamAttendanceSummary = {
  teamSize: 8,
  presentToday: 7,
  onLeaveToday: 1,
};