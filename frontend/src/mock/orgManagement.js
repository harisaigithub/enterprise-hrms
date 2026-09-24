/**
 * Mock data — Organization Management 
 */

export const statusMeta = {
  Active: { color: "#16a34a", bg: "#f0fdf4" },
  Inactive: { color: "#64748b", bg: "#f1f5f9" },
};

let company = { id: "co1", name: "Acme Technologies Pvt Ltd", registrationNumber: "U72900DL2015PTC123456", country: "India", currency: "INR" };

let businessUnits = [
  { id: "bu1", name: "Technology", companyId: "co1", status: "Active" },
  { id: "bu2", name: "Corporate", companyId: "co1", status: "Active" },
];

let departments = [
  { id: "d1", name: "Engineering", businessUnitId: "bu1", status: "Active" },
  { id: "d2", name: "Product", businessUnitId: "bu1", status: "Active" },
  { id: "d3", name: "Design", businessUnitId: "bu1", status: "Active" },
  { id: "d4", name: "Analytics", businessUnitId: "bu1", status: "Active" },
  { id: "d5", name: "Human Resources", businessUnitId: "bu2", status: "Active" },
];

let locations = [
  { id: "l1", name: "New York HQ", city: "New York", country: "USA", status: "Active", employeeCount: 22 },
  { id: "l2", name: "Delhi Office", city: "Delhi", country: "India", status: "Active", employeeCount: 18 },
  { id: "l3", name: "Austin Office", city: "Austin", country: "USA", status: "Active", employeeCount: 9 },
  { id: "l4", name: "Seattle Office", city: "Seattle", country: "USA", status: "Active", employeeCount: 0 },
  { id: "l5", name: "Chicago Satellite (closed 2025)", city: "Chicago", country: "USA", status: "Inactive", employeeCount: 0 },
];

let costCenters = [
  { id: "cc1", code: "CC-ENG-01", name: "Engineering — Platform", departmentIds: ["d1"], status: "Active" },
  { id: "cc2", code: "CC-ENG-02", name: "Engineering — Payments", departmentIds: ["d1"], status: "Active" },
  { id: "cc3", code: "CC-PROD-01", name: "Product", departmentIds: ["d2"], status: "Active" },
  { id: "cc4", code: "CC-HR-01", name: "People & Culture", departmentIds: ["d5"], status: "Active" },
];

let designations = [
  { id: "ds1", title: "Software Engineer", status: "Active" },
  { id: "ds2", title: "Senior Software Engineer", status: "Active" },
  { id: "ds3", title: "Engineering Manager", status: "Active" },
  { id: "ds4", title: "Product Manager", status: "Active" },
  { id: "ds5", title: "HR Specialist", status: "Active" },
];

let grades = [
  { id: "g1", code: "L1", name: "Associate", order: 1, status: "Active" },
  { id: "g2", code: "L2", name: "Professional", order: 2, status: "Active" },
  { id: "g3", code: "L3", name: "Senior", order: 3, status: "Active" },
  { id: "g4", code: "L4", name: "Lead", order: 4, status: "Active" },
  { id: "g5", code: "L5", name: "Principal", order: 5, status: "Active" },
];

// Reporting roster — reads like Employee Management's reporting_manager_id
// field; this module only visualizes/manages it, it doesn't own it.
let roster = [
  { id: "EMP001", name: "Matsya Singh", title: "Senior Software Engineer", departmentId: "d1", managerId: "EMP005" },
  { id: "EMP002", name: "vijay mudgal", title: "Product Manager", departmentId: "d2", managerId: null },
  { id: "EMP003", name: "Vikas Agarwal", title: "UX Designer", departmentId: "d3", managerId: "EMP002" },
  { id: "EMP004", name: "Gary Chen", title: "DevOps Engineer", departmentId: "d1", managerId: "EMP005" },
  { id: "EMP005", name: "Alice Quinn", title: "Engineering Manager", departmentId: "d1", managerId: null },
  { id: "EMP006", name: "James Sullivan", title: "Data Analyst", departmentId: "d4", managerId: "EMP005" },
];

let auditLog = [];

export function _getCompany() { return company; }
export function _updateCompany(patch) { company = { ...company, ...patch }; return company; }

export function _getBusinessUnits() { return businessUnits; }
export function _addBusinessUnit(bu) { businessUnits = [...businessUnits, bu]; return bu; }

export function _getDepartments() { return departments; }
export function _addDepartment(dept) { departments = [...departments, dept]; return dept; }

export function _getLocations() { return locations; }
export function _addLocation(loc) { locations = [...locations, loc]; return loc; }
export function _deactivateLocation(id) {
  const loc = locations.find((l) => l.id === id);
  if (!loc) return { error: "Location not found" };
  if (loc.employeeCount > 0) {
    return { error: `Cannot deactivate — ${loc.employeeCount} active employee(s) still assigned here. Reassign them first.` };
  }
  locations = locations.map((l) => (l.id === id ? { ...l, status: "Inactive" } : l));
  return { location: locations.find((l) => l.id === id) };
}

export function _getCostCenters() { return costCenters; }
export function _addCostCenter(cc) { costCenters = [...costCenters, cc]; return cc; }

export function _getDesignations() { return designations; }
export function _addDesignation(d) { designations = [...designations, d]; return d; }

export function _getGrades() { return grades; }
export function _addGrade(g) { grades = [...grades, g]; return g; }

export function _getRoster() { return roster; }

function wouldCreateCycle(employeeId, proposedManagerId) {
  let current = proposedManagerId;
  const seen = new Set();
  while (current) {
    if (current === employeeId) return true;
    if (seen.has(current)) return false; // already-broken chain elsewhere; not this change's problem
    seen.add(current);
    const mgr = roster.find((r) => r.id === current);
    current = mgr ? mgr.managerId : null;
  }
  return false;
}

export function _updateReportingManager(employeeId, newManagerId, actor) {
  if (newManagerId === employeeId) {
    return { error: "An employee cannot report to themselves." };
  }
  if (newManagerId && wouldCreateCycle(employeeId, newManagerId)) {
    return { error: `Blocked — this would create a circular reporting relationship (${employeeId} would eventually report to themselves through ${newManagerId}).` };
  }
  const emp = roster.find((r) => r.id === employeeId);
  const oldManagerId = emp.managerId;
  roster = roster.map((r) => (r.id === employeeId ? { ...r, managerId: newManagerId || null } : r));
  auditLog = [
    { id: `au-${Date.now()}`, entityType: "Employee", entityId: employeeId, field: "managerId", oldValue: oldManagerId, newValue: newManagerId, actor, timestamp: new Date().toISOString() },
    ...auditLog,
  ];
  return { employee: roster.find((r) => r.id === employeeId) };
}

// High-blast-radius action: requires an explicit confirmation from the caller
// (enforced in the UI) and writes one audit-log row per affected record —
// never a single "bulk action occurred" summary line.
export function _bulkReassignDepartment(employeeIds, newDepartmentId, actor) {
  const changed = [];
  employeeIds.forEach((id) => {
    const emp = roster.find((r) => r.id === id);
    if (!emp) return;
    const oldDepartmentId = emp.departmentId;
    roster = roster.map((r) => (r.id === id ? { ...r, departmentId: newDepartmentId } : r));
    auditLog = [
      { id: `au-${Date.now()}-${id}`, entityType: "Employee", entityId: id, field: "departmentId", oldValue: oldDepartmentId, newValue: newDepartmentId, actor, timestamp: new Date().toISOString() },
      ...auditLog,
    ];
    changed.push(id);
  });
  return { changedCount: changed.length, roster };
}

export function _getAuditLog() { return auditLog; }