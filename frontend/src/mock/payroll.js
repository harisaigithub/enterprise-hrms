/**
 * Mock Payroll Data
 * Shape matches what the backend Payroll API will return.
 */

export const payrollRuns = [
  {
    id: "PR-2026-07",
    period: "July 2026",
    month: 7,
    year: 2026,
    status: "Draft",
    processedOn: null,
    approvedBy: null,
    totalEmployees: 62,
    grossPayroll: 4250000,
    totalDeductions: 680000,
    netPayroll: 3570000,
  },
  {
    id: "PR-2026-06",
    period: "June 2026",
    month: 6,
    year: 2026,
    status: "Paid",
    processedOn: "2026-06-28",
    approvedBy: "EMP011",
    totalEmployees: 61,
    grossPayroll: 4190000,
    totalDeductions: 670400,
    netPayroll: 3519600,
  },
  {
    id: "PR-2026-05",
    period: "May 2026",
    month: 5,
    year: 2026,
    status: "Paid",
    processedOn: "2026-05-30",
    approvedBy: "EMP011",
    totalEmployees: 60,
    grossPayroll: 4120000,
    totalDeductions: 659200,
    netPayroll: 3460800,
  },
];

// Payslip for one employee for one month
export const payslips = [
  {
    id: "PS-2026-06-EMP001",
    payrollRunId: "PR-2026-06",
    employeeId: "EMP001",
    employeeName: "Matsya Singh",
    period: "June 2026",
    earnings: {
      basicSalary: 5750,
      hra: 2300,
      conveyanceAllowance: 400,
      medicalAllowance: 250,
      performanceBonus: 500,
      otherAllowances: 200,
      total: 9400,
    },
    deductions: {
      providentFund: 690,
      professionalTax: 200,
      incomeTax: 1200,
      healthInsurance: 180,
      total: 2270,
    },
    netPay: 7130,
    status: "Paid",
    paidOn: "2026-06-28",
    paymentMode: "Bank Transfer",
  },
  {
    id: "PS-2026-05-EMP001",
    payrollRunId: "PR-2026-05",
    employeeId: "EMP001",
    employeeName: "Matsya Singh",
    period: "May 2026",
    earnings: {
      basicSalary: 5750,
      hra: 2300,
      conveyanceAllowance: 400,
      medicalAllowance: 250,
      performanceBonus: 0,
      otherAllowances: 200,
      total: 8900,
    },
    deductions: {
      providentFund: 690,
      professionalTax: 200,
      incomeTax: 1100,
      healthInsurance: 180,
      total: 2170,
    },
    netPay: 6730,
    status: "Paid",
    paidOn: "2026-05-30",
    paymentMode: "Bank Transfer",
  },
];

export const payrollStatusMeta = {
  Draft: { label: "Draft", color: "#64748b", bg: "#f8fafc" },
  Processing: { label: "Processing", color: "#d97706", bg: "#fffbeb" },
  Approved: { label: "Approved", color: "#0284c7", bg: "#f0f9ff" },
  Paid: { label: "Paid", color: "#16a34a", bg: "#f0fdf4" },
  Failed: { label: "Failed", color: "#dc2626", bg: "#fef2f2" },
};
