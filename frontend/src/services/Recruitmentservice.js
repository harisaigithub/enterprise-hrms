/**
 * Recruitment (ATS) service — Module 5
 * Mirrors leaveService/attendanceService: async functions resolving to { data }.
 */

import {
  _getRequisitions,
  _addRequisition,
  _getCandidates,
  _addCandidate,
  _moveCandidateStage,
  _rateCandidate,
  _getInterviews,
  _scheduleInterview,
  _submitScorecard,
  _getOffers,
  _createOffer,
  _updateOfferStatus,
} from "../mock/recruitment";

const resolve = (data, ms = 350) => new Promise((res) => setTimeout(() => res({ data }), ms));

export function getRequisitions() {
  return resolve(_getRequisitions());
}
export function addRequisition(req) {
  return resolve(_addRequisition(req));
}

export function getCandidates() {
  return resolve(_getCandidates());
}
export function addCandidate(candidate) {
  return resolve(_addCandidate(candidate));
}
// Every stage-move must be logged with actor + timestamp  —
// callers should pass an already-timestamped candidate, or wire this to a
// real audit-log write when the backend exists.
export function moveCandidateStage(id, stage) {
  return resolve(_moveCandidateStage(id, stage));
}
export function rateCandidate(id, rating, notes) {
  return resolve(_rateCandidate(id, rating, notes));
}

export function getInterviews() {
  return resolve(_getInterviews());
}
export function scheduleInterview(interview) {
  return resolve(_scheduleInterview(interview));
}
// Feedback is only cross-visible to interviewers once everyone scheduled has
// submitted (5.5.3.5) — the UI layer decides what to reveal based on
// interview.status / scorecards.length vs interviewers.length.
export function submitScorecard(interviewId, scorecard) {
  return resolve(_submitScorecard(interviewId, scorecard));
}

export function getOffers() {
  return resolve(_getOffers());
}
export function createOffer(offer) {
  return resolve(_createOffer(offer));
}
export function updateOfferStatus(id, status, patch) {
  return resolve(_updateOfferStatus(id, status, patch));
}