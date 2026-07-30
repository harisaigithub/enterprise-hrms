/**
 * Performance service — Module 10
 * Mirrors the shape of leaveService / attendanceService: async functions
 * resolving to { data }. Swap the mock/performance.js calls for real API
 * calls once the backend endpoints exist.
 */

import {
  _getGoals,
  _addGoal,
  _getReviewCycle,
  _getSelfAssessment,
  _submitSelfAssessment,
  _getManagerReview,
  _getFeedback,
  _addFeedback,
  _getOneOnOnes,
  _addOneOnOne,
  _getRatingsHistory,
} from "../mock/Performance";

const resolve = (data, ms = 350) => new Promise((res) => setTimeout(() => res({ data }), ms));

export function getGoals(employeeId) {
  return resolve(_getGoals(employeeId));
}

export function addGoal(goal) {
  return resolve(_addGoal(goal));
}

export function getReviewCycle() {
  return resolve(_getReviewCycle());
}

export function getSelfAssessment() {
  return resolve(_getSelfAssessment());
}

// Validation rule (10.6): manager review cannot be submitted before this exists.
export function submitSelfAssessment(responses) {
  return resolve(_submitSelfAssessment(responses));
}

export function getManagerReview() {
  return resolve(_getManagerReview());
}

export function getFeedback(employeeId) {
  return resolve(_getFeedback(employeeId));
}

export function addFeedback(entry) {
  return resolve(_addFeedback(entry));
}

export function getOneOnOnes(employeeId) {
  return resolve(_getOneOnOnes(employeeId));
}

export function addOneOnOne(note) {
  return resolve(_addOneOnOne(note));
}

export function getRatingsHistory(employeeId) {
  return resolve(_getRatingsHistory(employeeId));
}