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

export const getEmployeeSalary = async (id) => {
  const res = await api.get(`/employees/${id}/salary`);
  return res.data;
};

export const upsertEmployeeSalary = async (id, payload) => {
  const res = await api.put(`/employees/${id}/salary`, payload);
  return res.data;
};

export const bulkImportEmployees = async (employees) => {
  const res = await api.post("/employees/bulk", { employees });
  return res.data;
};

export const uploadEmployeeAvatar = async (id, file) => {
  const formData = new FormData();
  formData.append("avatar", file);
  const res = await api.post(`/employees/${id}/avatar`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const removeEmployeeAvatar = async (id) => {
  const res = await api.delete(`/employees/${id}/avatar`);
  return res.data;
};

export const getEmployeeDocuments = async (id) => {
  const res = await api.get(`/employees/${id}/documents`);
  return res.data;
};

export const uploadEmployeeDocument = async (id, { file, documentType, documentNumber }) => {
  const formData = new FormData();
  formData.append("file", file);
  if (documentType) formData.append("documentType", documentType);
  if (documentNumber) formData.append("documentNumber", documentNumber);
  const res = await api.post(`/employees/${id}/documents`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const deleteEmployeeDocument = async (id, docId) => {
  const res = await api.delete(`/employees/${id}/documents/${docId}`);
  return res.data;
};

export const verifyEmployeeDocument = async (id, docId, { status, rejectionReason }) => {
  const res = await api.patch(`/employees/${id}/documents/${docId}/verify`, { status, rejectionReason });
  return res.data;
};

export const getSalaryHistory = async (id) => {
  const res = await api.get(`/employees/${id}/salary/history`);
  return res.data;
};

export const getEmergencyContacts = async (id) => {
  const res = await api.get(`/employees/${id}/emergency-contacts`);
  return res.data;
};

export const addEmergencyContact = async (id, payload) => {
  const res = await api.post(`/employees/${id}/emergency-contacts`, payload);
  return res.data;
};

export const deleteEmergencyContact = async (id, contactId) => {
  const res = await api.delete(`/employees/${id}/emergency-contacts/${contactId}`);
  return res.data;
};

export const getEmployeeMovements = async (id) => {
  const res = await api.get(`/employees/${id}/movements`);
  return res.data;
};

export const transferEmployee = async (id, payload) => {
  const res = await api.post(`/employees/${id}/transfer`, payload);
  return res.data;
};

export const promoteEmployee = async (id, payload) => {
  const res = await api.post(`/employees/${id}/promote`, payload);
  return res.data;
};

// Requests API
export const getEmployeeRequests = async (params = {}) => {
  const res = await api.get("/requests", { params });
  return res.data;
};

export const createEmployeeRequest = async (payload) => {
  const res = await api.post("/requests", payload);
  return res.data;
};

export const decideEmployeeRequest = async (requestId, payload) => {
  const res = await api.patch(`/requests/${requestId}/decide`, payload);
  return res.data;
};

// Org Chart & Holidays
export const getOrgChart = async () => {
  const res = await api.get("/organization/chart");
  return res.data;
};

export const getHolidays = async (year) => {
  const res = await api.get("/organization/holidays", { params: { year } });
  return res.data;
};

export const createHoliday = async (payload) => {
  const res = await api.post("/organization/holidays", payload);
  return res.data;
};

export const deleteHoliday = async (id) => {
  const res = await api.delete(`/organization/holidays/${id}`);
  return res.data;
};

// Attendance Shifts & Regularization
export const getAttendanceShifts = async () => {
  const res = await api.get("/attendance/shifts");
  return res.data;
};

export const createAttendanceShift = async (payload) => {
  const res = await api.post("/attendance/shifts", payload);
  return res.data;
};

export const requestRegularization = async (payload) => {
  const res = await api.post("/attendance/regularize", payload);
  return res.data;
};

export const getRegularizations = async () => {
  const res = await api.get("/attendance/regularizations");
  return res.data;
};

export const decideRegularization = async (id, payload) => {
  const res = await api.patch(`/attendance/regularizations/${id}/decide`, payload);
  return res.data;
};

// Payroll Lock
export const lockPayrollRun = async (runId) => {
  const res = await api.post(`/payroll/runs/${runId}/lock`);
  return res.data;
};


