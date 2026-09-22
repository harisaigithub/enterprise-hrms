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