/**
 * Mock Payroll Data
 * Shape matches what the backend Payroll API returns.
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
  {
    id: "PR-2026-04",
    period: "April 2026",
    month: 4,
    year: 2026,
    status: "Paid",
    processedOn: "2026-04-30",
    approvedBy: "EMP011",
    totalEmployees: 60,
    grossPayroll: 4100000,
    totalDeductions: 656000,
    netPayroll: 3444000,
  },
];

export const payrollStatusMeta = {
  Draft: { label: "Draft", color: "#64748b", bg: "#f8fafc" },
  Processing: { label: "Processing", color: "#d97706", bg: "#fffbeb" },
  Approved: { label: "Approved", color: "#0284c7", bg: "#f0f9ff" },
  Paid: { label: "Paid", color: "#16a34a", bg: "#f0fdf4" },
  Failed: { label: "Failed", color: "#dc2626", bg: "#fef2f2" },
};

/**
 * Returns role-appropriate and user-specific payslip records for the logged-in user.
 */
export function getUserPayslips(user) {
  const role = (user?.role || "EMPLOYEE").toUpperCase();
  const firstName = user?.firstName || (role === "MANAGER" ? "Anjali" : role === "HR" ? "Sunita" : role === "ADMIN" ? "Robert" : "Matsya");
  const lastName = user?.lastName || (role === "MANAGER" ? "Desai" : role === "HR" ? "Reddy" : role === "ADMIN" ? "King" : "Singh");
  const fullName = `${firstName} ${lastName}`;
  const empCode = user?.employeeCode || user?.id || (role === "MANAGER" ? "EMP005" : role === "HR" ? "EMP003" : role === "ADMIN" ? "EMP001" : "EMP002");

  let designation = "Senior Software Engineer";
  let department = "Engineering";
  let basic = 65000;
  let hra = 26000;
  let conveyance = 4000;
  let medical = 2500;
  let special = 12500;
  let pf = 7800;
  let tax = 11500;
  let insurance = 1500;
  let uan = "100987654321";
  let pan = "ABCPM1234D";
  let pfAcc = `MH/BAN/0123456/000/${empCode}`;
  let bankAcc = "XXXX XXXX 4821";

  if (role === "MANAGER") {
    designation = "Engineering Manager";
    department = "Engineering";
    basic = 115000;
    hra = 46000;
    conveyance = 6000;
    medical = 3500;
    special = 34500;
    pf = 13800;
    tax = 26000;
    insurance = 2500;
    uan = "100987654555";
    pan = "ABCPD5678M";
    bankAcc = "XXXX XXXX 9123";
  } else if (role === "HR") {
    designation = "Head of People & Culture";
    department = "Human Resources";
    basic = 95000;
    hra = 38000;
    conveyance = 5000;
    medical = 3000;
    special = 29000;
    pf = 11400;
    tax = 18500;
    insurance = 2000;
    uan = "100987654333";
    pan = "ABCPS3333R";
    bankAcc = "XXXX XXXX 3333";
  } else if (role === "ADMIN") {
    designation = "Chief Executive Officer";
    department = "Executive";
    basic = 210000;
    hra = 84000;
    conveyance = 10000;
    medical = 5000;
    special = 66000;
    pf = 25200;
    tax = 62000;
    insurance = 3500;
    uan = "100987654100";
    pan = "ABCPK9999A";
    bankAcc = "XXXX XXXX 1111";
  }

  const months = [
    { period: "July 2026",  month: 7, year: 2026, date: "2026-07-31", bonus: role === "MANAGER" ? 15000 : 5000 },
    { period: "June 2026",  month: 6, year: 2026, date: "2026-06-28", bonus: role === "MANAGER" ? 20000 : 7500 },
    { period: "May 2026",   month: 5, year: 2026, date: "2026-05-30", bonus: 0 },
    { period: "April 2026", month: 4, year: 2026, date: "2026-04-30", bonus: role === "MANAGER" ? 10000 : 2500 },
  ];

  return months.map((m) => {
    const gross = basic + hra + conveyance + medical + special + m.bonus;
    const totalDeductions = pf + 200 + tax + insurance;
    const net = gross - totalDeductions;

    return {
      id: `PS-${m.year}-0${m.month}-${empCode}`,
      payrollRunId: `PR-${m.year}-0${m.month}`,
      employeeId: empCode,
      employeeName: fullName,
      designation,
      department,
      period: m.period,
      month: m.month,
      year: m.year,
      uan,
      pan,
      pfAccount: pfAcc,
      bankAccount: bankAcc,
      ifsc: "HDFC0001234",
      bank: "HDFC Bank",
      earnings: {
        basicSalary: basic,
        hra,
        conveyanceAllowance: conveyance,
        medicalAllowance: medical,
        performanceBonus: m.bonus,
        specialAllowance: special,
        total: gross,
      },
      deductions: {
        providentFund: pf,
        professionalTax: 200,
        incomeTax: tax,
        healthInsurance: insurance,
        total: totalDeductions,
      },
      netPay: net,
      status: "Paid",
      paidOn: m.date,
      paymentMode: "Bank Transfer (NEFT)",
    };
  });
}

export const payslips = getUserPayslips({ role: "EMPLOYEE" });
