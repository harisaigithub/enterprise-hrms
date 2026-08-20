/**
 * Payroll Service
 * Talks to the real backend (VITE_API_URL → /api).
 */

import api from "./api";

export const getPayrollRuns = async () => {
  const res = await api.get("/payroll/runs");
  return res.data;
};

export const getPayslips = async (employeeId = "EMP001") => {
  const res = await api.get("/payroll/payslips", { params: { employeeId } });
  return res.data;
};

export const getPayslip = async (id) => {
  const res = await api.get(`/payroll/payslips/${id}`);
  return res.data;
};

/**
 * Run Payroll (high-impact — requires 4-eyes confirmation in the UI)
 */
export const runPayroll = async (payrollRunId) => {
  const res = await api.post(`/payroll/runs/${payrollRunId}/process`);
  return res.data;
};
