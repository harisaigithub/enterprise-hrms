/**
 * Attendance Service
 * FUTURE: import api from './api';
 * export const getAttendance = (params) => api.get('/attendance', { params });
 */

import { attendanceRecords, teamAttendanceSummary } from "../mock/attendance";

const delay = (ms = 300) => new Promise((res) => setTimeout(res, ms));

export const getMyAttendance = async ({ employeeId = "EMP001", month, year } = {}) => {
  await delay();
  let data = attendanceRecords.filter((r) => r.employeeId === employeeId);
  if (month && year) {
    data = data.filter((r) => {
      const d = new Date(r.date);
      return d.getMonth() + 1 === Number(month) && d.getFullYear() === Number(year);
    });
  }
  return { data };
};

export const getTeamSummary = async () => {
  await delay(200);
  return { data: teamAttendanceSummary };
};

export const checkIn = async (employeeId) => {
  await delay(500);
  const now = new Date();
  return {
    data: {
      employeeId,
      date: now.toISOString().split("T")[0],
      checkIn: now.toTimeString().slice(0, 5),
      status: "Present",
    },
  };
};

export const checkOut = async (employeeId) => {
  await delay(500);
  const now = new Date();
  return {
    data: { employeeId, checkOut: now.toTimeString().slice(0, 5) },
  };
};
