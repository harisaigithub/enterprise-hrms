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

export const printPayslip = async (id) => {
  const res = await api.post(`/payroll/payslips/${id}/print`, {}, {
    responseType: "blob",
  });

  const blob = new Blob([res.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);

  const printWindow = window.open(url, "_blank");

  if (!printWindow) {
    window.URL.revokeObjectURL(url);
    throw new Error("Please allow pop-ups to print the payslip.");
  }

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };

  return url;
};

export const printAnnualStatement = async () => {
  const res = await api.post(
    "/payroll/annual-statement/print",
    {},
    {
      responseType: "blob",
    }
  );

  const blob = new Blob([res.data], {
    type: "application/pdf",
  });

  const url = window.URL.createObjectURL(blob);

  const printWindow = window.open(url, "_blank");

  if (!printWindow) {
    window.URL.revokeObjectURL(url);
    throw new Error("Please allow pop-ups to print the annual statement.");
  }

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };

  return url;
};

export const printForm16 = async () => {
  const res = await api.post(
    "/payroll/form16/print",
    {},
    {
      responseType: "blob",
    }
  );

  const blob = new Blob([res.data], {
    type: "application/pdf",
  });

  const url = window.URL.createObjectURL(blob);

  const printWindow = window.open(url, "_blank");

  if (!printWindow) {
    window.URL.revokeObjectURL(url);
    throw new Error("Please allow pop-ups to print Form-16.");
  }

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };

  return url;
};