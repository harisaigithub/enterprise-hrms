/**
 * Payroll Service
 * FUTURE: import api from './api';
 * export const getPayrollRuns = () => api.get('/payroll/runs');
 */

import { payrollRuns, payslips } from "../mock/payroll";

const delay = (ms = 300) => new Promise((res) => setTimeout(res, ms));

export const getPayrollRuns = async () => {
  await delay();
  return { data: payrollRuns };
};

export const getPayslips = async (employeeId = "EMP001") => {
  await delay();
  const data = payslips.filter((p) => p.employeeId === employeeId);
  return { data };
};

export const getPayslip = async (id) => {
  await delay();
  const payslip = payslips.find((p) => p.id === id);
  if (!payslip) throw { status: 404, message: "Payslip not found" };
  return { data: payslip };
};

/**
 * Run Payroll (high-impact — requires 4-eyes confirmation in the UI)
 */
export const runPayroll = async (payrollRunId) => {
  await delay(1000);
  return { data: { id: payrollRunId, status: "Processing", startedAt: new Date().toISOString() } };
};
