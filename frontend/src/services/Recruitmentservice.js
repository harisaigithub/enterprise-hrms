// /**
//  * Recruitment (ATS) service — Module 5
//  * Mirrors leaveService/attendanceService: async functions resolving to { data }.
//  */

// import {
//   _getRequisitions,
//   _addRequisition,
//   _getCandidates,
//   _addCandidate,
//   _moveCandidateStage,
//   _rateCandidate,
//   _getInterviews,
//   _scheduleInterview,
//   _submitScorecard,
//   _getOffers,
//   _createOffer,
//   _updateOfferStatus,
// } from "../mock/recruitment";

// const resolve = (data, ms = 350) => new Promise((res) => setTimeout(() => res({ data }), ms));

// export function getRequisitions() {
//   return resolve(_getRequisitions());
// }
// export function addRequisition(req) {
//   return resolve(_addRequisition(req));
// }

// export function getCandidates() {
//   return resolve(_getCandidates());
// }
// export function addCandidate(candidate) {
//   return resolve(_addCandidate(candidate));
// }
// // Every stage-move must be logged with actor + timestamp  —
// // callers should pass an already-timestamped candidate, or wire this to a
// // real audit-log write when the backend exists.
// export function moveCandidateStage(id, stage) {
//   return resolve(_moveCandidateStage(id, stage));
// }
// export function rateCandidate(id, rating, notes) {
//   return resolve(_rateCandidate(id, rating, notes));
// }

// export function getInterviews() {
//   return resolve(_getInterviews());
// }
// export function scheduleInterview(interview) {
//   return resolve(_scheduleInterview(interview));
// }
// // Feedback is only cross-visible to interviewers once everyone scheduled has
// // submitted (5.5.3.5) — the UI layer decides what to reveal based on
// // interview.status / scorecards.length vs interviewers.length.
// export function submitScorecard(interviewId, scorecard) {
//   return resolve(_submitScorecard(interviewId, scorecard));
// }

// export function getOffers() {
//   return resolve(_getOffers());
// }
// export function createOffer(offer) {
//   return resolve(_createOffer(offer));
// }
// export function updateOfferStatus(id, status, patch) {
//   return resolve(_updateOfferStatus(id, status, patch));
// }


/**
 * Recruitment Service
 * Talks to the real backend.
 *
 * Backend base:
 *   VITE_API_URL -> /api
 *
 * Backend routes:
 *   /recruitment/requisitions
 *   /recruitment/candidates
 *   /recruitment/interviews
 *   /recruitment/offers
 */

import api from "./api";

/* ========================================================================= */
/* REQUISITIONS                                                             */
/* ========================================================================= */

/**
 * GET /api/recruitment/requisitions
 */
export const getRequisitions = async ({
  search = "",
  departmentId = "",
  status = "",
  page = 1,
  limit = 100,
} = {}) => {
  const params = {
    page,
    limit,
  };

  if (search.trim()) {
    params.search = search.trim();
  }

  if (departmentId) {
    params.departmentId = departmentId;
  }

  if (status) {
    params.status = status;
  }

  const res = await api.get("/recruitment/requisitions", {
    params,
  });

  return res.data;
};

/**
 * GET /api/recruitment/requisitions/:id
 */
export const getRequisition = async (id) => {
  const res = await api.get(`/recruitment/requisitions/${id}`);

  return res.data;
};

/**
 * POST /api/recruitment/requisitions
 */
export const addRequisition = async (payload) => {
  const res = await api.post(
    "/recruitment/requisitions",
    payload
  );

  return res.data;
};

/**
 * PUT /api/recruitment/requisitions/:id
 */
export const updateRequisition = async (id, payload) => {
  const res = await api.put(
    `/recruitment/requisitions/${id}`,
    payload
  );

  return res.data;
};


/* ========================================================================= */
/* CANDIDATES                                                               */
/* ========================================================================= */

/**
 * GET /api/recruitment/candidates
 */
export const getCandidates = async ({
  search = "",
  stage = "",
  requisitionId = "",
  page = 1,
  limit = 100,
} = {}) => {
  const params = {
    page,
    limit,
  };

  if (search.trim()) {
    params.search = search.trim();
  }

  if (stage) {
    params.stage = stage;
  }

  if (requisitionId) {
    params.requisitionId = requisitionId;
  }

  const res = await api.get("/recruitment/candidates", {
    params,
  });

  return res.data;
};

/**
 * POST /api/recruitment/candidates
 */
export const addCandidate = async (payload) => {
  const res = await api.post(
    "/recruitment/candidates",
    payload
  );

  return res.data;
};

/**
 * PATCH /api/recruitment/candidates/:id/stage
 */
export const moveCandidateStage = async (id, stage) => {
  const res = await api.patch(
    `/recruitment/candidates/${id}/stage`,
    {
      stage,
    }
  );

  return res.data;
};

/**
 * PATCH /api/recruitment/candidates/:id/rating
 */
export const rateCandidate = async (id, rating, notes) => {
  const res = await api.patch(
    `/recruitment/candidates/${id}/rating`,
    {
      rating,
      notes,
    }
  );

  return res.data;
};


/* ========================================================================= */
/* INTERVIEWS                                                               */
/* ========================================================================= */

/**
 * GET /api/recruitment/interviews
 */
export const getInterviews = async ({
  status = "",
  page = 1,
  limit = 100,
} = {}) => {
  const res = await api.get(
    "/recruitment/interviews",
    {
      params: {
        status,
        page,
        limit,
      },
    }
  );

  return res.data;
};

/**
 * POST /api/recruitment/interviews
 */
export const scheduleInterview = async (payload) => {
  const res = await api.post(
    "/recruitment/interviews",
    payload
  );

  return res.data;
};

/**
 * POST /api/recruitment/interviews/:id/scorecard
 */
export const submitScorecard = async (
  interviewId,
  payload
) => {
  const res = await api.post(
    `/recruitment/interviews/${interviewId}/scorecard`,
    payload
  );

  return res.data;
};


/* ========================================================================= */
/* OFFERS                                                                   */
/* ========================================================================= */

/**
 * GET /api/recruitment/offers
 */
export const getOffers = async () => {
  const res = await api.get(
    "/recruitment/offers"
  );

  return res.data;
};

/**
 * POST /api/recruitment/offers
 */
export const createOffer = async (payload) => {
  const res = await api.post(
    "/recruitment/offers",
    payload
  );

  return res.data;
};

/**
 * PATCH /api/recruitment/offers/:id/status
 */
export const updateOfferStatus = async (
  id,
  status,
  patch = {}
) => {
  const res = await api.patch(
    `/recruitment/offers/${id}/status`,
    {
      status,
      ...patch,
    }
  );

  return res.data;
};