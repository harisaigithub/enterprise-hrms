/**
 * Employee Service
 * Talks to the real backend (VITE_API_URL → /api).
 */

import api from "./api";

export const getEmployees = async ({ search = "", department = "", status = "" } = {}) => {
  const res = await api.get("/employees", {
    params: { search, department, status, limit: 100 },
  });
  return res.data; // { data, total }
};

export const getEmployee = async (id) => {
  const res = await api.get(`/employees/${id}`);
  return res.data;
};

export const createEmployee = async (payload) => {
  const res = await api.post("/employees", payload);
  return res.data;
};

export const updateEmployee = async (id, payload) => {
  const res = await api.put(`/employees/${id}`, payload);
  return res.data;
};

export const deleteEmployee = async (id) => {
  const res = await api.delete(`/employees/${id}`);
  return res.data;
};
