/**
 * Global Search Index
 * Each entry has a consistent shape so the SearchResults component renders
 * uniformly. Backend will eventually provide a /api/search?q= endpoint that
 * returns the same shape.
 */

import { employees } from "./employees";
import { leaveRequests } from "./leave";
import { payrollRuns } from "./payroll";

/**
 * Builds the global search corpus at startup.
 * Replace the imports above with API calls when the backend is ready.
 */
export function buildSearchIndex() {
  const entries = [];

  // Employees
  employees.forEach((emp) => {
    entries.push({
      id: emp.id,
      type: "Employee",
      title: `${emp.firstName} ${emp.lastName}`,
      subtitle: `${emp.designation} · ${emp.department}`,
      meta: emp.email,
      avatar: emp.avatar,
      href: `/employees/${emp.id}`,
      keywords: [
        emp.firstName.toLowerCase(),
        emp.lastName.toLowerCase(),
        emp.email.toLowerCase(),
        emp.designation.toLowerCase(),
        emp.department.toLowerCase(),
        emp.id.toLowerCase(),
      ],
    });
  });

  // Leave Requests
  leaveRequests.forEach((req) => {
    entries.push({
      id: req.id,
      type: "Leave Request",
      title: `${req.employeeName} — ${req.leaveTypeName}`,
      subtitle: `${req.startDate} to ${req.endDate}`,
      meta: req.status,
      avatar: null,
      href: `/leave`,
      keywords: [
        req.employeeName.toLowerCase(),
        req.leaveTypeName.toLowerCase(),
        req.status.toLowerCase(),
        req.id.toLowerCase(),
      ],
    });
  });

  // Payroll Runs
  payrollRuns.forEach((run) => {
    entries.push({
      id: run.id,
      type: "Payroll Run",
      title: run.period,
      subtitle: `${run.totalEmployees} employees · Net ₹${(run.netPayroll / 100000).toFixed(1)}L`,
      meta: run.status,
      avatar: null,
      href: `/payroll`,
      keywords: [
        run.period.toLowerCase(),
        run.status.toLowerCase(),
        run.id.toLowerCase(),
        String(run.year),
      ],
    });
  });

  return entries;
}

/**
 * Fuzzy-ish search: returns entries where any keyword starts with or contains
 * the query. Sorted by relevance (starts-with > contains).
 */
export function searchIndex(index, query) {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim().toLowerCase();

  const startsWith = [];
  const contains = [];

  index.forEach((entry) => {
    const isStartsWith = entry.keywords.some((k) => k.startsWith(q));
    const isContains = !isStartsWith && entry.keywords.some((k) => k.includes(q));
    if (isStartsWith) startsWith.push(entry);
    else if (isContains) contains.push(entry);
  });

  return [...startsWith, ...contains].slice(0, 20);
}
