/**
 * Performance Service — Module 10
 * Talks to the real backend (VITE_API_URL → /api/performance).
 * Each function returns { data } matching the frontend's API contract.
 */

import api from "./api";
import { _getReviewCycle, _advanceReviewCyclePhase } from "../mock/performance";

export const getGoals = async (employeeId) => {
  const res = await api.get("/performance/goals", { params: { employeeId } });
  return res.data;
};

export const addGoal = async (goal) => {
  const res = await api.post("/performance/goals", goal);
  return res.data;
};

export const updateGoal = async (id, payload) => {
  const res = await api.put(`/performance/goals/${id}`, payload);
  return res.data;
};

export const getManagerGoals = async () => {
  const res = await api.get("/performance/manager/goals");
  return res.data;
};

export const approveManagerGoal = async (id) => {
  const res = await api.patch(`/performance/manager/goals/${id}/approve`);
  return res.data;
};




export const rejectManagerGoal = async (id) => {
  const res = await api.patch(`/performance/manager/goals/${id}/reject`);
  return res.data;
};


export const getReviewCycle = async () => {
  try {
    const res = await api.get("/performance/cycle");
    return res.data;
  } catch {
    return { data: _getReviewCycle() };
  }
};

export const getSelfAssessment = async (employeeId) => {
  const res = await api.get("/performance/reviews/self", { params: { employeeId } });
  return res.data;
};

export const submitSelfAssessment = async (responses, employeeId) => {
  const res = await api.post("/performance/reviews/self", { responses, employeeId });
  return res.data;
};

export const getManagerReview = async (employeeId) => {
  const res = await api.get(
    "/performance/reviews/manager",
    employeeId
      ? { params: { employeeId } }
      : undefined
  );

  return res.data;
};

export const submitManagerReview = async (employeeId, responses) => {
  const res = await api.post("/performance/reviews/manager", { employeeId, responses });
  return res.data;
};

export const getFeedback = async (employeeId, filter = "all") => {
  const res = await api.get("/performance/feedback", { params: { employeeId, filter } });
  return res.data;
};

export const addFeedback = async (entry) => {
  const res = await api.post("/performance/feedback", entry);
  return res.data;
};

export const getOneOnOnes = async (employeeId) => {
  const res = await api.get("/performance/one-on-ones", { params: { employeeId } });
  return res.data;
};

export const addOneOnOne = async (note) => {
  const res = await api.post("/performance/one-on-ones", note);
  return res.data;
};

export const toggleActionItem = async (oneOnOneId, actionId) => {
  const res = await api.patch(`/performance/one-on-ones/${oneOnOneId}/actions/${actionId}`);
  return res.data;
};

export const getRatingsHistory = async (employeeId) => {
  const res = await api.get("/performance/ratings-history", { params: { employeeId } });
  return res.data;
};

export const getManagerRatingsHistory = async () => {
  const res = await api.get("/performance/manager/ratings-history");
  return res.data;
};

export const getAdminRatingsHistory = async () => {
  const res = await api.get("/performance/admin/ratings-history");
  return res.data;
};

export const getCalibrationCandidates = async () => {
  const res = await api.get("/performance/admin/calibration");
  return res.data;
};

export const releaseCalibratedRating = async (payload) => {
  const res = await api.post("/performance/admin/calibration/release", payload);
  return res.data;
};

export const getAdminPerformanceOverview = async () => {
  const res = await api.get("/performance/admin/overview");
  return res.data;
};

export const getAdminEmployeesPerformance = async () => {
  const res = await api.get("/performance/admin/employees");
  return res.data;
};

export const getAdminEmployeePerformanceDetail = async (employeeId) => {
  const res = await api.get(
    `/performance/admin/employees/${employeeId}`
  );

  return res.data;
};

export const getAdminFeedback = async () => {
  const res = await api.get("/performance/admin/feedback");
  return res.data;
};

export const advanceReviewCyclePhase = async (phase) => {
  try {
    const res = await api.patch("/performance/admin/cycle/phase", { phase });
    return res.data;
  } catch {
    const updated = _advanceReviewCyclePhase(phase);
    return { data: updated };
  }
};
