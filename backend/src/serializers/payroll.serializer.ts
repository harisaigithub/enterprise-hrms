import type { PayrollRun, Payslip, SalaryStructure } from "@prisma/client";
import { formatDate, toNumber } from "./helpers";

export function runPublicId(run: { year: number; month: number }): string {
  return `PR-${run.year}-${String(run.month).padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function periodLabel(run: { year: number; month: number }): string {
  return `${MONTH_NAMES[run.month - 1]} ${run.year}`;
}

type RunWithRelations = PayrollRun & {
  approvedByEmployee?: { employeeCode: string } | null;
};

/** Payroll run DTO — matches mock/payroll.js (`id` is PR-YYYY-MM). */
export function serializePayrollRun(run: RunWithRelations) {
  return {
    id: runPublicId(run),
    period: periodLabel(run),
    month: run.month,
    year: run.year,
    status: run.status,
    processedOn: formatDate(run.processedOn),
    approvedBy: run.approvedByEmployee?.employeeCode ?? null,
    totalEmployees: run.totalEmployees,
    grossPayroll: toNumber(run.grossPayroll),
    totalDeductions: toNumber(run.totalDeductions),
    netPayroll: toNumber(run.netPayroll),
  };
}

export function serializePayrollRunList(runs: RunWithRelations[]) {
  return runs.map(serializePayrollRun);
}

type SlipWithRelations = Payslip & {
  employee?: { employeeCode: string; firstName: string; lastName: string } | null;
  payrollRun?: PayrollRun | null;
};

/** Payslip DTO — matches mock/payroll.js (`id` is PS-YYYY-MM-EMPCODE). */
export function serializePayslip(slip: SlipWithRelations) {
  const earnings = (slip.earnings ?? {}) as Record<string, unknown>;
  const deductions = (slip.deductions ?? {}) as Record<string, unknown>;

  return {
    id: `PS-${slip.payrollRun?.year ?? 0}-${String(slip.payrollRun?.month ?? 0).padStart(2, "0")}-${slip.employee?.employeeCode ?? ""}`,
    payrollRunId: slip.payrollRun ? runPublicId(slip.payrollRun) : "",
    employeeId: slip.employee?.employeeCode ?? "",
    employeeName: slip.employee ? `${slip.employee.firstName} ${slip.employee.lastName}` : "",
    period: slip.payrollRun ? periodLabel(slip.payrollRun) : slip.period,
    earnings: {
      basicSalary: toNumber(earnings.basicSalary),
      hra: toNumber(earnings.hra),
      conveyanceAllowance: toNumber(earnings.conveyanceAllowance),
      medicalAllowance: toNumber(earnings.medicalAllowance),
      performanceBonus: toNumber(earnings.performanceBonus),
      otherAllowances: toNumber(earnings.otherAllowances),
      total: toNumber(earnings.total),
    },
    deductions: {
      providentFund: toNumber(deductions.providentFund),
      professionalTax: toNumber(deductions.professionalTax),
      incomeTax: toNumber(deductions.incomeTax),
      healthInsurance: toNumber(deductions.healthInsurance),
      total: toNumber(deductions.total),
    },
    netPay: toNumber(slip.netPay),
    status: slip.status,
    paidOn: formatDate(slip.paidOn),
    paymentMode: slip.paymentMode,
  };
}

export function serializePayslipList(slips: SlipWithRelations[]) {
  return slips.map(serializePayslip);
}

/** Build the earnings/deductions JSON stored on a payslip from a salary structure. */
export function buildPayslipAmounts(structure: SalaryStructure) {
  const basic = toNumber(structure.basicSalary);
  const hra = toNumber(structure.hra);
  const conveyance = toNumber(structure.conveyanceAllowance);
  const medical = toNumber(structure.medicalAllowance);
  const bonus = toNumber(structure.performanceBonus);
  const other = toNumber(structure.otherAllowances);
  const totalEarnings = basic + hra + conveyance + medical + bonus + other;

  const pf = toNumber(structure.providentFund);
  const pt = toNumber(structure.professionalTax);
  const it = toNumber(structure.incomeTax);
  const hi = toNumber(structure.healthInsurance);
  const totalDeductions = pf + pt + it + hi;

  return {
    earnings: {
      basicSalary: basic,
      hra,
      conveyanceAllowance: conveyance,
      medicalAllowance: medical,
      performanceBonus: bonus,
      otherAllowances: other,
      total: totalEarnings,
    },
    deductions: {
      providentFund: pf,
      professionalTax: pt,
      incomeTax: it,
      healthInsurance: hi,
      total: totalDeductions,
    },
    netPay: totalEarnings - totalDeductions,
  };
}
