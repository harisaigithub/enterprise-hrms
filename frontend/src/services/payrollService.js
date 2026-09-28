/**
 * Payroll Service
 * Talks to the real backend (VITE_API_URL → /api).
 */

import api from "./api";

export const getPayrollRuns = async () => {
  const res = await api.get("/payroll/runs");
  return res.data;
};

export const getPayslips = async (employeeId) => {
  if (!employeeId) {
    throw new Error("Employee ID is required.");
  }

  const res = await api.get("/payroll/payslips", {
    params: { employeeId },
  });

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

export const processPayrollRun = async (payrollRunId) => {
  const res = await api.post(`/payroll/runs/${payrollRunId}/process`);
  return res.data;
};

export const approvePayrollRun = async (payrollRunId) => {
  const res = await api.post(`/payroll/runs/${payrollRunId}/approve`);
  return res.data;
};

export const rejectPayrollRun = async (payrollRunId, reason) => {
  const res = await api.post(`/payroll/runs/${payrollRunId}/reject`, { reason });
  return res.data;
};

export const releasePayrollRun = async (payrollRunId) => {
  const res = await api.post(`/payroll/runs/${payrollRunId}/release`);
  return res.data;
};

export const lockPayrollRun = async (payrollRunId) => {
  const res = await api.post(`/payroll/runs/${payrollRunId}/lock`);
  return res.data;
};

export const printPayslip = async (id) => {
  const res = await api.post(`/payroll/payslips/${id}/print`, {}, {
    responseType: "blob",
  });

  const pdfBlob = res instanceof Blob ? res : res?.data;

  if (
    !(pdfBlob instanceof Blob) ||
    (await pdfBlob.slice(0, 5).text()) !== "%PDF-"
  ) {
    throw new Error("Server returned an invalid payslip PDF.");
  }

  const url = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(url, "_blank");

  if (!printWindow) {
    URL.revokeObjectURL(url);
    throw new Error("Please allow pop-ups to print the payslip.");
  }

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };

  return url;
};

export const printAnnualStatement = async (payload = {}) => {
  const res = await api.post("/payroll/annual-statement/print", payload, {
    responseType: "blob",
  });

  // api wrapper Blob directly return kar sakta hai,
  // ya Axios response { data: Blob } return kar sakta hai.
  const pdfBlob = res instanceof Blob ? res : res?.data;

  if (!(pdfBlob instanceof Blob)) {
    throw new Error("Annual statement PDF was not returned by the API.");
  }

  const header = await pdfBlob.slice(0, 5).text();
  if (header !== "%PDF-") {
    throw new Error("Server returned an invalid annual statement PDF.");
  }

  const url = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(url, "_blank");

  if (!printWindow) {
    URL.revokeObjectURL(url);
    throw new Error("Please allow pop-ups to print the annual statement.");
  }

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };

  return url;
};

export const printForm16 = async () => {
  const res = await api.post("/payroll/form16/print", {}, {
    responseType: "blob",
  });

  const pdfBlob = res instanceof Blob ? res : res?.data;

  if (!(pdfBlob instanceof Blob) || (await pdfBlob.slice(0, 5).text()) !== "%PDF-") {
    throw new Error("Server returned an invalid Form-16 PDF.");
  }

  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "Form-16-Summary.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};