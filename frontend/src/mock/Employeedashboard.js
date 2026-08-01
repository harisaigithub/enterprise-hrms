/**
 * Mock data for the Employee Dashboard — spec 3.5.1
 * One file per dashboard (matches the granularity of alerts.js/payroll.js/etc.)
 */

export const attendanceToday = {
  checkedIn: true,
  checkInTime: "09:12 AM",
  checkOutTime: null,
};

export const leaveBalanceSummary = [
  { leaveType: "Casual Leave", available: 6 },
  { leaveType: "Sick Leave", available: 4 },
  { leaveType: "Earned Leave", available: 11 },
];

export const payslipStatus = {
  month: "July 2026",
  generated: true,
  releaseDate: "2026-07-31",
};

export const upcomingHolidays = [
  { name: "Independence Day", date: "2026-08-15" },
  { name: "Raksha Bandhan", date: "2026-08-28" },
  { name: "Ganesh Chaturthi", date: "2026-09-14" },
];

export const activeAnnouncements = [
  { id: "a1", title: "Q2 town hall recording now available" },
  { id: "a2", title: "Updated WFH policy effective August 1" },
];

export const upcomingBirthdays = [
  { name: "Divya Nair", date: "2026-08-01" },
  { name: "Arjun Mehta", date: "2026-08-03" },
];

export const selfAssessment = {
  pending: true,
  cycleName: "H1 FY26 Review",
  dueDate: "2026-08-10",
};

export const complianceCourses = [
  { name: "POSH Awareness", dueDate: "2026-08-05" },
  { name: "Information Security Basics", dueDate: "2026-08-20" },
];