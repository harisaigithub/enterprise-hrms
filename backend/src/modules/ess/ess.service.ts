import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";

const EXPORT_THROTTLE_DAYS = 30;
const EXPORT_EXPIRY_HOURS = 48;

async function employeeForUser(userId: string) {
  const employee = await prisma.employee.findUnique({ where: { userId }, select: { id: true } });
  if (!employee) throw AppError.forbidden("Account is not linked to an employee record");
  return employee;
}

export async function getOverview(userId: string) {
  const employee = await employeeForUser(userId);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [balances, pendingLeave, punches, payslip, learning, complianceOverdue, assignedAssets, openTickets] = await Promise.all([
    prisma.leaveBalance.findMany({ where: { employeeId: employee.id, year: now.getUTCFullYear() } }),
    prisma.leaveRequest.count({ where: { employeeId: employee.id, status: "Pending" } }),
    prisma.attendancePunch.findMany({ where: { employeeId: employee.id, punchDate: { gte: monthStart, lt: monthEnd } }, select: { status: true } }),
    prisma.payslip.findFirst({ where: { employeeId: employee.id }, orderBy: { createdAt: "desc" }, select: { period: true, netPay: true } }),
    prisma.courseEnrollment.count({ where: { employeeId: employee.id, status: { in: ["NOT_STARTED", "IN_PROGRESS"] } } }),
    prisma.courseEnrollment.count({ where: { employeeId: employee.id, course: { isCompliance: true }, expiresAt: { lt: now }, status: { not: "PASSED" } } }),
    prisma.asset.count({ where: { currentHolderId: employee.id } }),
    prisma.helpdeskTicket.count({ where: { requesterId: employee.id, status: { notIn: ["Resolved", "Closed"] } } }),
  ]);

  const available = balances.reduce((sum, row) => sum + Number(row.totalDays) - Number(row.usedDays), 0);
  return {
    leaveBalance: { available, pending: pendingLeave },
    attendanceThisMonth: {
      present: punches.filter((row) => !["Absent", "Leave", "Holiday", "Weekly-Off"].includes(row.status)).length,
      late: punches.filter((row) => row.status === "Late").length,
      wfh: punches.filter((row) => row.status === "WFH").length,
    },
    latestPayslip: payslip ? { period: payslip.period, netPay: Number(payslip.netPay) } : null,
    learning: { inProgress: learning, complianceOverdue },
    assignedAssets,
    openTickets,
    payrollError: null,
  };
}

export async function listTaxDeclarations(userId: string) {
  const employee = await employeeForUser(userId);
  const rows = await prisma.essTaxDeclaration.findMany({ where: { employeeId: employee.id }, orderBy: { submittedAt: "desc" } });
  return rows.map((row) => ({ ...row, amount: Number(row.amount), submittedAt: row.submittedAt.toISOString().slice(0, 10) }));
}

export async function submitTaxDeclaration(userId: string, input: { financialYear: string; section: string; investmentType: string; amount: number }) {
  const employee = await employeeForUser(userId);
  const row = await prisma.essTaxDeclaration.create({ data: { employeeId: employee.id, financialYear: input.financialYear, section: input.section, investmentType: input.investmentType.trim(), amount: input.amount } });
  return { ...row, amount: Number(row.amount), submittedAt: row.submittedAt.toISOString().slice(0, 10) };
}

export async function getLastExportRequest(userId: string) {
  const employee = await employeeForUser(userId);
  return prisma.essDataExportRequest.findFirst({ where: { employeeId: employee.id }, orderBy: { requestedAt: "desc" } });
}

export async function requestDataExport(userId: string) {
  const employee = await employeeForUser(userId);
  const latest = await prisma.essDataExportRequest.findFirst({ where: { employeeId: employee.id }, orderBy: { requestedAt: "desc" } });
  const throttleAfter = new Date(Date.now() - EXPORT_THROTTLE_DAYS * 24 * 60 * 60 * 1000);
  if (latest && latest.requestedAt > throttleAfter) {
    const nextAllowedAt = new Date(latest.requestedAt.getTime() + EXPORT_THROTTLE_DAYS * 24 * 60 * 60 * 1000);
    throw AppError.conflict(`A data export was requested recently. Try again after ${nextAllowedAt.toISOString()}`);
  }
  const expiresAt = new Date(Date.now() + EXPORT_EXPIRY_HOURS * 60 * 60 * 1000);
  return prisma.essDataExportRequest.create({ data: { employeeId: employee.id, expiresAt, status: "Requested" } });
}
