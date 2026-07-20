/**
 * Employee Service
 * FUTURE: Swap the mock import for real API calls (one line change).
 * import api from './api';
 * export const getEmployees = (params) => api.get('/employees', { params });
 */

import { employees } from "../mock/employees";

const delay = (ms = 300) => new Promise((res) => setTimeout(res, ms));

export const getEmployees = async ({ search = "", department = "", status = "" } = {}) => {
  await delay();
  let data = [...employees];
  if (search) {
    const q = search.toLowerCase();
    data = data.filter(
      (e) =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q)
    );
  }
  if (department) data = data.filter((e) => e.department === department);
  if (status) data = data.filter((e) => e.status === status);
  return { data, total: data.length };
};

export const getEmployee = async (id) => {
  await delay();
  const emp = employees.find((e) => e.id === id);
  if (!emp) throw { status: 404, message: "Employee not found" };
  return { data: emp };
};

export const createEmployee = async (payload) => {
  await delay(500);
  // Mock: returns the payload with a generated id
  const newEmp = { ...payload, id: `EMP${String(Date.now()).slice(-4)}` };
  return { data: newEmp };
};

export const updateEmployee = async (id, payload) => {
  await delay(400);
  return { data: { id, ...payload } };
};

export const deleteEmployee = async (id) => {
  await delay(400);
  return { data: { id, deleted: true } };
};
