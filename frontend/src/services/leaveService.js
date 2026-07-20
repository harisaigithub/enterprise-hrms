/**
 * Leave Service
 * FUTURE: import api from './api';
 * export const getLeaveRequests = (params) => api.get('/leave/requests', { params });
 */

import { leaveBalances, leaveRequests, leaveTypes } from "../mock/leave";

const delay = (ms = 300) => new Promise((res) => setTimeout(res, ms));

export const getLeaveTypes = async () => {
  await delay(200);
  return { data: leaveTypes };
};

export const getMyLeaveBalance = async (employeeId = "EMP001") => {
  await delay();
  void employeeId; // will be used in real API
  return { data: leaveBalances };
};

export const getLeaveRequests = async ({ employeeId, status } = {}) => {
  await delay();
  let data = [...leaveRequests];
  if (employeeId) data = data.filter((r) => r.employeeId === employeeId);
  if (status) data = data.filter((r) => r.status === status);
  return { data, total: data.length };
};

export const applyLeave = async (payload) => {
  await delay(600);
  return {
    data: {
      id: `LR${Date.now()}`,
      ...payload,
      status: "Pending",
      appliedOn: new Date().toISOString().split("T")[0],
    },
  };
};

export const approveLeave = async (requestId, comments = "") => {
  await delay(500);
  return { data: { id: requestId, status: "Approved", comments } };
};

export const rejectLeave = async (requestId, comments = "") => {
  await delay(500);
  return { data: { id: requestId, status: "Rejected", comments } };
};
