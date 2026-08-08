/**
 * Attendance Service
 * Talks to the real backend (VITE_API_URL → /api).
 */

import api from "./api";

export const getMyAttendance = async ({ employeeId, month, year } = {}) => {
  const res = await api.get("/attendance", { params: { employeeId, month, year, limit: 100 } });
  return res.data; // { data, total }
};

export const getTeamSummary = async () => {
  const res = await api.get("/attendance/summary");
  return res.data; // { data }
};

export const checkIn = async (employeeId, method = "Web") => {
  const res = await api.post("/attendance/check-in", { employeeId, method });
  return res.data;
};

export const checkOut = async (employeeId) => {
  const res = await api.post("/attendance/check-out", { employeeId });
  return res.data;
};
