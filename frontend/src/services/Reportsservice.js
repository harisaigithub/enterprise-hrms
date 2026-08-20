/**
 * Reports service — Module 22
 * Mirrors the async-delay + { data } shape of the other services.
 *
 * The security properties the spec cares about live HERE, not in the UI:
 *   - scope filtering happens before aggregation (22.7) — a caller literally
 *     cannot construct a query that touches rows outside their scope
 *   - small-cell suppression is applied to every aggregate unconditionally
 *     (22.6) — the UI has no way to opt out of it
 *   - custom reports validate every requested field against the approved
 *     catalog and reject anything else (22.5 step 3, 22.6)
 */

import {
  DEPARTMENTS, SMALL_CELL_THRESHOLD, ORG_SCOPES,
  REPORT_TEMPLATES, RECRUITMENT_SNAPSHOT, LAST_AGGREGATION,
  FIELD_CATALOG, EMPLOYEE_RECORDS,
} from "../mock/reports";

const DELAY = 400;

function delay(value) {
  return new Promise((resolve) => setTimeout(() => resolve({ data: value }), DELAY));
}

const SUPPRESSED = "Group too small to display — refine your filter";

/**
 * Clamps requested departments to the caller's actual scope. Even if a
 * caller passes departments outside their scope (e.g. a tampered request),
 * the intersection is all that's ever used downstream — there is no code
 * path where an out-of-scope department reaches the aggregation step.
 */
function resolveScopedDepartments(role, requestedDepartments) {
  const allowed = ORG_SCOPES[role]?.departments || [];
  if (!requestedDepartments || requestedDepartments.length === 0) return allowed;
  return requestedDepartments.filter((d) => allowed.includes(d));
}

function applyFilters(records, { departments, location }) {
  return records.filter((r) =>
    departments.includes(r.department) &&
    (!location || r.location === location)
  );
}

function aggregate(records, metricField, metricAgg) {
  if (records.length === 0) return null;
  if (metricAgg === "count") {
    if (metricField === "active") return records.filter((r) => r.status === "Active").length;
    if (metricField === "exited") return records.filter((r) => r.status === "Exited").length;
    if (metricField === "female") return records.filter((r) => r.gender === "Female").length;
    return records.length;
  }
  if (metricAgg === "avg") {
    const sum = records.reduce((s, r) => s + (r[metricField] || 0), 0);
    return Math.round((sum / records.length) * 10) / 10;
  }
  if (metricAgg === "sum") {
    return records.reduce((s, r) => s + (r[metricField] || 0), 0);
  }
  return null;
}

/**
 * Groups by department and applies small-cell suppression per group
 * .
 */
function groupByDepartmentWithSuppression(scopedDepartments, filteredRecords, metricField, metricAgg) {
  return scopedDepartments.map((dept) => {
    const deptRecords = filteredRecords.filter((r) => r.department === dept);
    const n = deptRecords.length;
    const suppressed = n > 0 && n < SMALL_CELL_THRESHOLD;
    return {
      department: dept,
      n,
      value: suppressed ? null : aggregate(deptRecords, metricField, metricAgg),
      suppressed,
      suppressionMessage: suppressed ? SUPPRESSED : null,
    };
  }).filter((row) => row.n > 0); // don't show departments with zero matching records at all
}

export function getReportTemplates(role) {
  return delay(REPORT_TEMPLATES.filter((t) => t.requiresRoles.includes(role)));
}

export function getOrgScope(role) {
  return delay(ORG_SCOPES[role]);
}

/**
 * Runs a standard report template. `filters.departments` is whatever the
 * caller asked for — it gets clamped to their real scope before a single
 * row is touched.
 */
export function runStandardReport(templateId, filters, role) {
  const template = REPORT_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return delay(null);

  const scopedDepartments = resolveScopedDepartments(role, filters.departments);
  const filtered = applyFilters(EMPLOYEE_RECORDS, { departments: scopedDepartments, location: filters.location });
  const rows = groupByDepartmentWithSuppression(scopedDepartments, filtered, template.metricField, template.metricAgg);

  return delay({
    template,
    rows,
    metricLabel: template.metricLabel,
    dataAsOf: LAST_AGGREGATION[templateId],
    stale: isStale(LAST_AGGREGATION[templateId]),
    scopedDepartments,
  });
}

/** Recruitment Analytics is a single company-wide funnel, not grouped by department. */
export function getRecruitmentSnapshot() {
  return delay({ ...RECRUITMENT_SNAPSHOT, dataAsOf: LAST_AGGREGATION.headcount, stale: false });
}

function isStale(isoDate) {
  const ageHours = (Date.now() - new Date(isoDate).getTime()) / 3600000;
  return ageHours > 48; // nightly job — anything older than ~2 days means it's been failing
}

export function getFieldCatalog() {
  return delay(FIELD_CATALOG);
}

/**
 * Runs a custom report. Every dimension/metric id is checked against the
 * approved catalog before use — this is real validation, not just "the UI
 * only shows approved fields," so even a hand-crafted request can't smuggle
 * an unapproved field through.
 */
export function runCustomReport({ dimensionId, metricIds, filters }, role) {
  const validDimension = FIELD_CATALOG.dimensions.some((d) => d.id === dimensionId);
  const validMetrics = metricIds.every((id) => FIELD_CATALOG.metrics.some((m) => m.id === id));
  if (!validDimension || !validMetrics || metricIds.length === 0) {
    return Promise.reject(new Error("One or more requested fields are not in the approved reporting catalog."));
  }

  const scopedDepartments = resolveScopedDepartments(role, filters.departments);
  const filtered = applyFilters(EMPLOYEE_RECORDS, { departments: scopedDepartments, location: filters.location });

  // Only "department" is supported as a grouping dimension in this mock;
  // other approved dimensions (location, gender, employmentType) would
  // group similarly in a real implementation.
  const groupField = dimensionId === "department" ? "department" : dimensionId;
  const groupValues = [...new Set(filtered.map((r) => r[groupField]).filter(Boolean))];

  const rows = groupValues.map((groupValue) => {
    const groupRecords = filtered.filter((r) => r[groupField] === groupValue);
    const n = groupRecords.length;
    const suppressed = n > 0 && n < SMALL_CELL_THRESHOLD;
    const metrics = {};
    metricIds.forEach((metricId) => {
      const metricDef = FIELD_CATALOG.metrics.find((m) => m.id === metricId);
      metrics[metricId] = suppressed ? null : aggregate(groupRecords, metricDef.field, metricDef.agg);
    });
    return { group: groupValue, n, suppressed, suppressionMessage: suppressed ? SUPPRESSED : null, metrics };
  });

  return delay({ dimensionId, metricIds, rows, dataAsOf: new Date().toISOString(), stale: false });
}

/**
 * CSV export. Operates ONLY on already-aggregated, already-suppressed report
 * output — never on raw records — so an export can't leak anything the
 * on-screen report itself didn't already show. Watermarked and logged per
 * 
 */
const _exportLog = [];
export function exportReportCsv(reportOutput, reportName, exportedBy) {
  const lines = [];
  lines.push(`# ${reportName} — Exported by ${exportedBy} on ${new Date().toLocaleString("en-IN")} — CONFIDENTIAL`);
  lines.push("Group,Count,Value");
  reportOutput.rows.forEach((row) => {
    const label = row.department || row.group;
    const value = row.suppressed ? "Suppressed (small group)" : row.value;
    lines.push(`${label},${row.n},${value}`);
  });
  const csv = lines.join("\n");

  _exportLog.push({ reportName, exportedBy, exportedOn: new Date().toISOString(), format: "CSV" });

  return delay(csv);
}

export function getExportLog() {
  return delay([..._exportLog]);
}