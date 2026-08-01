/**
 * Mock data — Module 22: Reports & Analytics
 */

export const DEPARTMENTS = ["Engineering", "Sales", "Design", "Finance"];
export const LOCATIONS = ["Bengaluru", "Mumbai", "Remote"];
export const SMALL_CELL_THRESHOLD = 5;

// spec 22.2/22.3 — mock roles + org scope, standing in for real auth/ABAC
export const ROLES = {
  MANAGER: "Manager",
  HR: "HR",
  FINANCE: "Finance",
  MANAGEMENT: "Management",
};

// A Manager's scope is deliberately narrow — used to prove filters can't
// escape it even if a wider department is requested (spec 22.5 step 2).
export const ORG_SCOPES = {
  [ROLES.MANAGER]:    { name: "Rohan Kapoor",  departments: ["Engineering"] },
  [ROLES.HR]:          { name: "Priya Iyer",    departments: DEPARTMENTS },
  [ROLES.FINANCE]:     { name: "Arjun Mehta",   departments: DEPARTMENTS },
  [ROLES.MANAGEMENT]: { name: "Vikram Rathore", departments: DEPARTMENTS },
};

// spec 22.5 step 1 — pre-built templates over nightly-aggregated tables.
// requiresRoles gates which "Viewing as" roles can even see/select the template.
export const REPORT_TEMPLATES = [
  { id: "headcount",   name: "Headcount",             domain: "Headcount",    groupBy: "department", metricField: "active",       metricAgg: "count", metricLabel: "Active Headcount", requiresRoles: [ROLES.MANAGER, ROLES.HR, ROLES.MANAGEMENT] },
  { id: "attrition",   name: "Attrition",             domain: "Attrition",    groupBy: "department", metricField: "exited",       metricAgg: "count", metricLabel: "Exits (period)",   requiresRoles: [ROLES.HR, ROLES.MANAGEMENT] },
  { id: "diversity",   name: "Diversity",             domain: "Diversity",    groupBy: "department", metricField: "female",       metricAgg: "count", metricLabel: "Female Headcount", requiresRoles: [ROLES.HR, ROLES.MANAGEMENT] },
  { id: "payroll",     name: "Payroll Cost",          domain: "Payroll Cost", groupBy: "department", metricField: "salary",       metricAgg: "avg",   metricLabel: "Avg. Monthly Salary (₹)", requiresRoles: [ROLES.FINANCE, ROLES.HR, ROLES.MANAGEMENT] },
  { id: "leave",       name: "Leave Analysis",        domain: "Leave",        groupBy: "department", metricField: "leaveDaysTaken", metricAgg: "avg", metricLabel: "Avg. Leave Days Taken", requiresRoles: [ROLES.MANAGER, ROLES.HR, ROLES.MANAGEMENT] },
  { id: "attendance",  name: "Attendance Trends",     domain: "Attendance",   groupBy: "department", metricField: "attendanceRatePct", metricAgg: "avg", metricLabel: "Avg. Attendance %", requiresRoles: [ROLES.MANAGER, ROLES.HR, ROLES.MANAGEMENT] },
  { id: "training",    name: "Training Analytics",    domain: "Training",     groupBy: "department", metricField: "trainingCompletionPct", metricAgg: "avg", metricLabel: "Avg. Training Completion %", requiresRoles: [ROLES.HR, ROLES.MANAGEMENT] },
  { id: "performance", name: "Performance Analytics", domain: "Performance",  groupBy: "department", metricField: "performanceRating", metricAgg: "avg", metricLabel: "Avg. Performance Rating", requiresRoles: [ROLES.HR, ROLES.MANAGEMENT] },
];

// Recruitment Analytics is a single company-wide funnel, not grouped by
// department — reported separately since its shape doesn't fit the others.
export const RECRUITMENT_SNAPSHOT = { applied: 340, screening: 92, interview: 38, offer: 9, hired: 5 };

// When the nightly ETL last succeeded, per domain (spec 22.8).
// "attrition" is deliberately stale to demonstrate the refresh-pending state.
export const LAST_AGGREGATION = {
  headcount: "2026-07-31T02:00:00",
  attrition: "2026-07-10T02:00:00", // stale — job has been failing since
  diversity: "2026-07-31T02:00:00",
  payroll: "2026-07-31T02:00:00",
  leave: "2026-07-31T02:00:00",
  attendance: "2026-07-31T02:00:00",
  training: "2026-07-31T02:00:00",
  performance: "2026-07-31T02:00:00",
};

/**
 * Approved, classified field catalog for the Custom Report Builder (spec
 * 22.5 step 3, 22.6). This list IS the security boundary — the builder UI
 * only ever renders from this array, so there is no code path that can
 * surface a field not listed here. No L4 field appears below by design.
 */
export const FIELD_CATALOG = {
  dimensions: [
    { id: "department", label: "Department", classification: "L1" },
    { id: "location", label: "Location", classification: "L1" },
    { id: "gender", label: "Gender", classification: "L2" },
    { id: "employmentType", label: "Employment Type", classification: "L1" },
  ],
  metrics: [
    { id: "headcount", label: "Headcount", classification: "L1", agg: "count", field: "active" },
    { id: "avgSalary", label: "Avg. Monthly Salary (₹)", classification: "L3", agg: "avg", field: "salary" },
    { id: "avgLeaveDays", label: "Avg. Leave Days Taken", classification: "L2", agg: "avg", field: "leaveDaysTaken" },
    { id: "avgAttendance", label: "Avg. Attendance %", classification: "L1", agg: "avg", field: "attendanceRatePct" },
    { id: "avgTraining", label: "Avg. Training Completion %", classification: "L2", agg: "avg", field: "trainingCompletionPct" },
    { id: "avgPerformance", label: "Avg. Performance Rating", classification: "L3", agg: "avg", field: "performanceRating" },
  ],
};

// Roster deliberately keeps Design (3) and Finance (4) below the small-cell
// threshold of 5 so suppression has something real to trigger on.
export const EMPLOYEE_RECORDS = [
  // Engineering (8)
  { id: "E1", department: "Engineering", location: "Bengaluru", gender: "Male",   employmentType: "Full-time", status: "Active", exitDate: null,         salary: 145000, leaveDaysTaken: 6,  attendanceRatePct: 96, trainingCompletionPct: 90, performanceRating: 4.2 },
  { id: "E2", department: "Engineering", location: "Bengaluru", gender: "Female", employmentType: "Full-time", status: "Active", exitDate: null,         salary: 138000, leaveDaysTaken: 8,  attendanceRatePct: 94, trainingCompletionPct: 85, performanceRating: 4.0 },
  { id: "E3", department: "Engineering", location: "Remote",    gender: "Male",   employmentType: "Full-time", status: "Active", exitDate: null,         salary: 132000, leaveDaysTaken: 5,  attendanceRatePct: 98, trainingCompletionPct: 92, performanceRating: 4.4 },
  { id: "E4", department: "Engineering", location: "Bengaluru", gender: "Female", employmentType: "Full-time", status: "Active", exitDate: null,         salary: 128000, leaveDaysTaken: 10, attendanceRatePct: 91, trainingCompletionPct: 78, performanceRating: 3.7 },
  { id: "E5", department: "Engineering", location: "Mumbai",    gender: "Male",   employmentType: "Contract",  status: "Active", exitDate: null,         salary: 120000, leaveDaysTaken: 4,  attendanceRatePct: 97, trainingCompletionPct: 88, performanceRating: 4.1 },
  { id: "E6", department: "Engineering", location: "Remote",    gender: "Male",   employmentType: "Full-time", status: "Active", exitDate: null,         salary: 150000, leaveDaysTaken: 7,  attendanceRatePct: 95, trainingCompletionPct: 95, performanceRating: 4.5 },
  { id: "E7", department: "Engineering", location: "Bengaluru", gender: "Female", employmentType: "Full-time", status: "Exited", exitDate: "2026-07-18", salary: 118000, leaveDaysTaken: 9,  attendanceRatePct: 89, trainingCompletionPct: 70, performanceRating: 3.5 },
  { id: "E8", department: "Engineering", location: "Bengaluru", gender: "Male",   employmentType: "Full-time", status: "Active", exitDate: null,         salary: 141000, leaveDaysTaken: 6,  attendanceRatePct: 96, trainingCompletionPct: 91, performanceRating: 4.3 },

  // Sales (6)
  { id: "S1", department: "Sales", location: "Mumbai", gender: "Male",   employmentType: "Full-time", status: "Active", exitDate: null,         salary: 95000,  leaveDaysTaken: 5,  attendanceRatePct: 93, trainingCompletionPct: 80, performanceRating: 3.9 },
  { id: "S2", department: "Sales", location: "Mumbai", gender: "Female", employmentType: "Full-time", status: "Active", exitDate: null,         salary: 98000,  leaveDaysTaken: 7,  attendanceRatePct: 92, trainingCompletionPct: 75, performanceRating: 3.8 },
  { id: "S3", department: "Sales", location: "Bengaluru", gender: "Male", employmentType: "Full-time", status: "Active", exitDate: null,        salary: 102000, leaveDaysTaken: 6,  attendanceRatePct: 90, trainingCompletionPct: 82, performanceRating: 4.0 },
  { id: "S4", department: "Sales", location: "Remote",  gender: "Female", employmentType: "Full-time", status: "Exited", exitDate: "2026-06-25", salary: 88000,  leaveDaysTaken: 12, attendanceRatePct: 85, trainingCompletionPct: 60, performanceRating: 3.1 },
  { id: "S5", department: "Sales", location: "Mumbai", gender: "Male",   employmentType: "Full-time", status: "Active", exitDate: null,         salary: 105000, leaveDaysTaken: 4,  attendanceRatePct: 95, trainingCompletionPct: 88, performanceRating: 4.2 },
  { id: "S6", department: "Sales", location: "Bengaluru", gender: "Female", employmentType: "Contract", status: "Active", exitDate: null,       salary: 91000,  leaveDaysTaken: 5,  attendanceRatePct: 94, trainingCompletionPct: 79, performanceRating: 3.9 },

  // Design (3) — below the small-cell threshold
  { id: "D1", department: "Design", location: "Bengaluru", gender: "Female", employmentType: "Full-time", status: "Active", exitDate: null, salary: 110000, leaveDaysTaken: 6, attendanceRatePct: 95, trainingCompletionPct: 90, performanceRating: 4.3 },
  { id: "D2", department: "Design", location: "Remote",    gender: "Male",   employmentType: "Full-time", status: "Active", exitDate: null, salary: 108000, leaveDaysTaken: 5, attendanceRatePct: 96, trainingCompletionPct: 87, performanceRating: 4.1 },
  { id: "D3", department: "Design", location: "Bengaluru", gender: "Female", employmentType: "Full-time", status: "Active", exitDate: null, salary: 112000, leaveDaysTaken: 8, attendanceRatePct: 93, trainingCompletionPct: 85, performanceRating: 4.0 },

  // Finance (4) — below the small-cell threshold
  { id: "F1", department: "Finance", location: "Mumbai", gender: "Male",   employmentType: "Full-time", status: "Active", exitDate: null, salary: 115000, leaveDaysTaken: 5, attendanceRatePct: 97, trainingCompletionPct: 93, performanceRating: 4.2 },
  { id: "F2", department: "Finance", location: "Mumbai", gender: "Female", employmentType: "Full-time", status: "Active", exitDate: null, salary: 118000, leaveDaysTaken: 6, attendanceRatePct: 95, trainingCompletionPct: 90, performanceRating: 4.1 },
  { id: "F3", department: "Finance", location: "Bengaluru", gender: "Male", employmentType: "Full-time", status: "Active", exitDate: null, salary: 121000, leaveDaysTaken: 4, attendanceRatePct: 98, trainingCompletionPct: 91, performanceRating: 4.4 },
  { id: "F4", department: "Finance", location: "Remote",  gender: "Female", employmentType: "Full-time", status: "Active", exitDate: null, salary: 117000, leaveDaysTaken: 7, attendanceRatePct: 94, trainingCompletionPct: 88, performanceRating: 3.9 },
];