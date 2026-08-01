/**
 * LMS service — Module 11
 * Mirrors leaveService/attendanceService: async functions resolving to { data }.
 */

import {
  _getCourses,
  _addCourse,
  _publishCourse,
  _getEnrollments,
  _assignCourse,
  _submitQuiz,
} from "../mock/lms";

const resolve = (data, ms = 350) => new Promise((res) => setTimeout(() => res({ data }), ms));

export function getCourses() {
  return resolve(_getCourses());
}
export function addCourse(course) {
  return resolve(_addCourse(course));
}
// Validation rule 11.6: cannot publish without title + content, and compliance
// courses need an expiry/renewal rule. Returns { error } instead of throwing
// so the UI can show it inline.
export function publishCourse(id) {
  return resolve(_publishCourse(id));
}

export function getEnrollments(employeeId) {
  return resolve(_getEnrollments(employeeId));
}
export function getAllEnrollments() {
  return resolve(_getEnrollments(null));
}
export function assignCourse(courseId, employeeId, employeeName) {
  return resolve(_assignCourse(courseId, employeeId, employeeName));
}
// Pass/fail is computed here (server-side, in a real backend), never by the client.
export function submitQuiz(enrollmentId, correctCount, totalQuestions) {
  return resolve(_submitQuiz(enrollmentId, correctCount, totalQuestions));
}