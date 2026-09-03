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

/**
 * Break tracking — stub implementation.
 * The backend endpoint (POST /attendance/break-start & /break-end) is TBD.
 * Until wired, break sessions are tracked client-side in Attendance.jsx state.
 */
export const startBreak = async (employeeId, breakType = "Short Break") => {
  // TODO: wire to POST /attendance/break-start when backend is ready
  return { data: { employeeId, breakType, startTime: new Date().toISOString() } };
};

export const endBreak = async (employeeId) => {
  // TODO: wire to POST /attendance/break-end when backend is ready
  return { data: { employeeId, endTime: new Date().toISOString() } };
};

