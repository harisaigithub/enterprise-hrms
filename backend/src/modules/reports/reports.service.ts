import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAuditLog } from "../../services/audit.service";
import type { AccessTokenPayload } from "../../lib/jwt";

const SMALL_CELL_THRESHOLD = 3;
const SUPPRESSED = "Group too small to display";

const templates = [
  { id: "headcount", name: "Total Headcount", metricLabel: "Employees", roles: ["ADMIN", "HR", "MANAGER"] },
  { id: "active_headcount", name: "Active Employees", metricLabel: "Active employees", roles: ["ADMIN", "HR", "MANAGER"] },
  { id: "approved_leave", name: "Approved Leave Requests", metricLabel: "Approved requests", roles: ["ADMIN", "HR", "MANAGER"] },
  { id: "attendance_present", name: "Attendance - Present Days", metricLabel: "Present days", roles: ["ADMIN", "HR", "MANAGER"] },
  { id: "performance_goals", name: "Performance Goals", metricLabel: "Goals", roles: ["ADMIN", "HR", "MANAGER"] },
  { id: "net_payroll", name: "Net Payroll", metricLabel: "Net payroll", roles: ["ADMIN", "HR"] },
];

const catalog = {
  dimensions: [
    { id: "department", label: "Department", classification: "L2" },
    { id: "location", label: "Location", classification: "L2" },
    { id: "employmentType", label: "Employment Type", classification: "L2" },
    { id: "gender", label: "Gender", classification: "L3" },
  ],
  metrics: [
    { id: "headcount", label: "Headcount", classification: "L2" },
    { id: "active", label: "Active employees", classification: "L2" },
    { id: "approvedLeave", label: "Approved leave requests", classification: "L2" },
    { id: "presentDays", label: "Present attendance days", classification: "L2" },
    { id: "goals", label: "Performance goals", classification: "L2" },
  ],
};

async function hierarchyIds(managerId: string) {
  const result = new Set<string>();
  let level = [managerId];
  while (level.length) {
    const rows = await prisma.employee.findMany({ where: { reportingManagerId: { in: level } }, select: { id: true } });
    const next = rows.map((row) => row.id).filter((id) => !result.has(id));
    next.forEach((id) => result.add(id));
    level = next;
  }
  return [...result];
}

async function employeeWhere(actor?: AccessTokenPayload) {
  if (!actor) throw AppError.unauthorized("Authentication required");
  if (["ADMIN", "HR"].includes(actor.role)) return {};
  if (actor.role === "MANAGER" && actor.employeeId) return { id: { in: await hierarchyIds(actor.employeeId) } };
  throw AppError.forbidden("Reports are available only to HR, Admin, and Managers");
}

async function records(actor?: AccessTokenPayload) {
  const where = await employeeWhere(actor);
  const rows = await prisma.employee.findMany({
    where,
    include: {
      department: { select: { name: true } }, location: { select: { name: true } },
      leaveRequests: { select: { status: true, startDate: true, endDate: true } },
      attendancePunches: { select: { status: true, punchDate: true } },
      performanceGoals: { select: { id: true } }, payslips: { select: { netPay: true, createdAt: true } },
    },
  });
  return rows.map((row) => ({
    department: row.department?.name || "Unassigned", location: row.location?.name || "Unassigned",
    employmentType: row.employmentType, gender: row.gender || "Not specified", status: row.status,
    approvedLeave: row.leaveRequests.filter((x) => x.status === "Approved").length,
    presentDays: row.attendancePunches.filter((x) => ["Present", "WFH", "Late"].includes(x.status)).length,
    goals: row.performanceGoals.length, netPayroll: row.payslips.reduce((sum, x) => sum + Number(x.netPay), 0),
  }));
}

async function scope(actor?: AccessTokenPayload) {
  const rows = await records(actor);
  const departments = [...new Set(rows.map((x) => x.department))].sort();
  const locations = [...new Set(rows.map((x) => x.location))].sort();
  return { name: actor?.role === "MANAGER" ? "Reporting hierarchy" : "Organization", departments, locations };
}

function filterRows(rows: any[], filters: any) {
  const requested = Array.isArray(filters?.departments) ? filters.departments : [];
  return rows.filter((row) => (!requested.length || requested.includes(row.department)) && (!filters?.location || row.location === filters.location));
}

function metric(record: any, id: string) {
  if (id === "headcount") return 1;
  if (id === "active") return record.status === "Active" ? 1 : 0;
  if (id === "approvedLeave") return record.approvedLeave;
  if (id === "presentDays") return record.presentDays;
  if (id === "goals") return record.goals;
  if (id === "netPayroll") return record.netPayroll;
  throw AppError.badRequest("Unsupported report metric");
}

function standardMetric(templateId: string) {
  return ({ headcount: "headcount", active_headcount: "active", approved_leave: "approvedLeave", attendance_present: "presentDays", performance_goals: "goals", net_payroll: "netPayroll" } as Record<string, string>)[templateId];
}

function aggregate(rows: any[], dimension: string, metricIds: string[]) {
  const groups = [...new Set(rows.map((row) => row[dimension] || "Unassigned"))].sort();
  return groups.map((group) => {
    const members = rows.filter((row) => (row[dimension] || "Unassigned") === group);
    const suppressed = members.length < SMALL_CELL_THRESHOLD;
    const metrics: Record<string, number | null> = {};
    metricIds.forEach((id) => { metrics[id] = suppressed ? null : members.reduce((sum, row) => sum + metric(row, id), 0); });
    return { group, department: dimension === "department" ? group : undefined, n: members.length, value: metricIds.length === 1 ? metrics[metricIds[0]] : undefined, metrics, suppressed, suppressionMessage: suppressed ? SUPPRESSED : null };
  });
}

export function getTemplates(actor?: AccessTokenPayload) {
  return templates.filter((item) => item.roles.includes(actor?.role || "")).map(({ roles: _roles, ...item }) => item);
}

export const getScope = scope;
export function getCatalog(actor?: AccessTokenPayload) {
  const allowed = actor?.role === "MANAGER" ? catalog.metrics : [...catalog.metrics, { id: "netPayroll", label: "Net payroll", classification: "L3" }];
  return { ...catalog, metrics: allowed };
}

export async function standard(templateId: string, filters: any, actor?: AccessTokenPayload) {
  const template = templates.find((item) => item.id === templateId && item.roles.includes(actor?.role || ""));
  if (!template) throw AppError.forbidden("Report template is unavailable for this role");
  const allRows = await records(actor);
  const safeScope = await scope(actor);
  const requestedDepartments = Array.isArray(filters.departments) ? filters.departments.filter((x: string) => safeScope.departments.includes(x)) : [];
  const filtered = filterRows(allRows, { departments: requestedDepartments, location: safeScope.locations.includes(filters.location) ? filters.location : "" });
  return { template, rows: aggregate(filtered, "department", [standardMetric(templateId)]), metricLabel: template.metricLabel, dataAsOf: new Date().toISOString(), stale: false, scopedDepartments: safeScope.departments };
}

export async function custom(input: any, actor?: AccessTokenPayload) {
  const allowedDimensions = catalog.dimensions.map((x) => x.id);
  const allowedMetrics = getCatalog(actor).metrics.map((x) => x.id);
  if (!allowedDimensions.includes(input.dimensionId) || !input.metricIds.length || input.metricIds.some((x: string) => !allowedMetrics.includes(x))) throw AppError.badRequest("Requested fields are outside the approved reporting catalog");
  const allRows = await records(actor); const safeScope = await scope(actor);
  const requestedDepartments = (input.filters?.departments || []).filter((x: string) => safeScope.departments.includes(x));
  const filtered = filterRows(allRows, { departments: requestedDepartments, location: input.filters?.location || "" });
  return { dimensionId: input.dimensionId, metricIds: input.metricIds, rows: aggregate(filtered, input.dimensionId, input.metricIds), dataAsOf: new Date().toISOString(), stale: false };
}

function csvEscape(value: unknown) { const text = String(value ?? ""); return `"${text.replace(/"/g, '""')}"`; }
export async function exportCsv(input: any, actor?: AccessTokenPayload) {
  const output = await standard(input.templateId, input.filters || {}, actor);
  const lines = [`# ${output.template.name} | CONFIDENTIAL | ${new Date().toISOString()}`, "Group,Count,Value"];
  output.rows.forEach((row) => lines.push([row.group, row.n, row.suppressed ? "Suppressed (small group)" : row.value].map(csvEscape).join(",")));
  void writeAuditLog({ actorUserId: actor?.sub, action: "UPDATE", entityType: "ReportExport", newValue: { event: "CSV_EXPORT", templateId: input.templateId, format: "CSV" } });
  return { csv: lines.join("\n"), filename: `${input.templateId}-report.csv` };
}
