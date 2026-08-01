/**
 * Employee Dashboard service — spec 3.5.1
 * Each export is an independent, parallel-fetchable query (the backend "fires
 * parallel read-only queries, not sequential, to keep load time low"). Every
 * function resolves { data } after a simulated delay, matching onboardingService.js.
 */
import {
  attendanceToday, leaveBalanceSummary, payslipStatus, upcomingHolidays,
  activeAnnouncements, upcomingBirthdays, selfAssessment, complianceCourses,
} from "../data/employeeDashboard";

function delay(value, ms = 400) {
  return new Promise((resolve) => setTimeout(() => resolve({ data: value }), ms));
}

// Simulates a service that times out on first load, to exercise the
// "Unable to load — tap to retry" partial-failure path (spec 3.5.1 step 3).
// Succeeds on retry so the demo isn't permanently broken.
let _learningAttempts = 0;
function unreliableDelay(value) {
  _learningAttempts += 1;
  if (_learningAttempts === 1) {
    return new Promise((_, reject) => setTimeout(() => reject(new Error("Learning Service timeout")), 2200));
  }
  return delay(value, 500);
}

export const getTodayAttendance = () => delay(attendanceToday);
export const getLeaveBalanceSummary = () => delay(leaveBalanceSummary);
export const getPayslipStatus = () => delay(payslipStatus);
export const getUpcomingHolidays = () => delay(upcomingHolidays);
export const getActiveAnnouncements = () => delay(activeAnnouncements);
export const getUpcomingBirthdays = () => delay(upcomingBirthdays);
export const getPendingSelfAssessment = () => delay(selfAssessment);
export const getUpcomingComplianceCourses = () => unreliableDelay(complianceCourses);