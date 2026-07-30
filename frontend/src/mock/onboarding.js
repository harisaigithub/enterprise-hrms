/**
 * Mock data — Module 4: Onboarding
 * Follows the same convention as mock/attendance.js and mock/leave.js
 */

export const checklistItemStatusMeta = {
  Pending:              { label: "Pending",              color: "#64748b", bg: "#f8fafc" },
  "In Progress":        { label: "In Progress",          color: "#0284c7", bg: "#f0f9ff" },
  Complete:             { label: "Complete",              color: "#16a34a", bg: "#f0fdf4" },
  Blocked:              { label: "Blocked",               color: "#dc2626", bg: "#fef2f2" },
  "Pending Procurement": { label: "Pending Procurement",  color: "#d97706", bg: "#fffbeb" },
};

export const checklistOwnerMeta = {
  HR:       { label: "HR",       color: "#7c3aed", bg: "#f5f3ff" },
  IT:       { label: "IT",       color: "#0284c7", bg: "#f0f9ff" },
  Employee: { label: "Employee", color: "#16a34a", bg: "#f0fdf4" },
  Manager:  { label: "Manager",  color: "#d97706", bg: "#fffbeb" },
};

// Category order controls how the checklist renders
export const CHECKLIST_CATEGORIES = ["Documents & Policy", "IT & Assets", "Induction & Buddy", "Probation"];

/**
 * A checklist item may declare `dependsOn`, referencing another item's id within
 * the same checklist. Items with an incomplete dependency are always rendered
 * as "Blocked" regardless of their stored status (spec 6.5 step 4 — hard dependency,
 * not just a suggested order).
 */
function buildTemplateItems({ joinDate }) {
  const d = (offsetDays) => {
    const dt = new Date(joinDate + "T00:00:00");
    dt.setDate(dt.getDate() + offsetDays);
    return dt.toISOString().slice(0, 10);
  };

  return [
    { id: "doc-upload",     category: "Documents & Policy", title: "Upload ID & address proof",              owner: "Employee", dueDate: d(-3) },
    { id: "doc-edu",        category: "Documents & Policy", title: "Upload education certificates",           owner: "Employee", dueDate: d(-3) },
    { id: "identity-verify", category: "Documents & Policy", title: "Verify identity documents",              owner: "HR",       dueDate: d(-2) },
    { id: "policy-accept",  category: "Documents & Policy", title: "Accept Code of Conduct & IT Policy",      owner: "Employee", dueDate: d(-1) },
    { id: "personal-details", category: "Documents & Policy", title: "Complete remaining personal details",  owner: "Employee", dueDate: d(-1) },

    { id: "it-account",     category: "IT & Assets", title: "Create corporate email & core accounts", owner: "IT", dueDate: d(-1), dependsOn: "identity-verify" },
    { id: "asset-laptop",   category: "IT & Assets", title: "Allocate laptop",                          owner: "IT", dueDate: d(0) },
    { id: "asset-accesscard", category: "IT & Assets", title: "Allocate access card",                   owner: "IT", dueDate: d(0) },
    { id: "laptop-handover", category: "IT & Assets", title: "Confirm laptop handover (condition ack.)", owner: "Employee", dueDate: d(0), dependsOn: "asset-laptop" },

    { id: "induction",      category: "Induction & Buddy", title: "Attend induction session",     owner: "HR",      dueDate: d(1) },
    { id: "buddy-assign",   category: "Induction & Buddy", title: "Assign onboarding buddy",       owner: "Manager", dueDate: d(-1) },

    { id: "probation-review", category: "Probation", title: "Schedule probation review", owner: "Manager", dueDate: d(90) },
  ];
}

const RAW_JOINERS = [
  {
    employeeId: "EMP014",
    employeeName: "Ananya Verma",
    avatar: "https://i.pravatar.cc/80?img=47",
    department: "Engineering",
    designation: "Frontend Developer",
    joinDate: "2026-07-28",
    buddy: "Rohan Kapoor",
    probationMonths: 3,
    statuses: {
      "doc-upload": "Complete", "doc-edu": "Complete", "identity-verify": "Complete",
      "policy-accept": "Complete", "personal-details": "Complete",
      "it-account": "Complete", "asset-laptop": "Complete", "asset-accesscard": "In Progress",
      "laptop-handover": "Complete",
      "induction": "In Progress", "buddy-assign": "Complete",
      "probation-review": "Pending",
    },
  },
  {
    employeeId: "EMP015",
    employeeName: "Kabir Malhotra",
    avatar: "https://i.pravatar.cc/80?img=12",
    department: "Sales",
    designation: "Account Executive",
    joinDate: "2026-08-03",
    buddy: "Divya Nair",
    probationMonths: 6,
    statuses: {
      "doc-upload": "Complete", "doc-edu": "Pending", "identity-verify": "Pending",
      "policy-accept": "Pending", "personal-details": "Pending",
      "it-account": "Pending", "asset-laptop": "Pending Procurement", "asset-accesscard": "Pending",
      "laptop-handover": "Pending",
      "induction": "Pending", "buddy-assign": "Complete",
      "probation-review": "Pending",
    },
  },
  {
    employeeId: "EMP016",
    employeeName: "Ishita Sharma",
    avatar: "https://i.pravatar.cc/80?img=32",
    department: "Design",
    designation: "Product Designer",
    joinDate: "2026-07-20",
    buddy: "Arjun Mehta",
    probationMonths: 3,
    statuses: {
      "doc-upload": "Complete", "doc-edu": "Complete", "identity-verify": "Complete",
      "policy-accept": "Complete", "personal-details": "Complete",
      "it-account": "Complete", "asset-laptop": "Complete", "asset-accesscard": "Complete",
      "laptop-handover": "Complete",
      "induction": "Complete", "buddy-assign": "Complete",
      "probation-review": "Pending",
    },
  },
  {
    employeeId: "EMP017",
    employeeName: "Yash Chaudhary",
    avatar: "https://i.pravatar.cc/80?img=51",
    department: "Finance",
    designation: "Financial Analyst",
    joinDate: "2026-07-25",
    buddy: "Priya Iyer",
    probationMonths: 3,
    statuses: {
      "doc-upload": "Complete", "doc-edu": "Complete", "identity-verify": "Pending",
      "policy-accept": "In Progress", "personal-details": "Complete",
      "it-account": "Pending", "asset-laptop": "Complete", "asset-accesscard": "Complete",
      "laptop-handover": "Pending",
      "induction": "Pending", "buddy-assign": "Complete",
      "probation-review": "Pending",
    },
  },
];

function resolveItems(joiner) {
  const template = buildTemplateItems({ joinDate: joiner.joinDate });
  return template.map((item) => {
    const storedStatus = joiner.statuses[item.id] || "Pending";
    const dependency = item.dependsOn ? template.find((t) => t.id === item.dependsOn) : null;
    const dependencyStatus = dependency ? (joiner.statuses[dependency.id] || "Pending") : null;
    const isBlocked = dependency && dependencyStatus !== "Complete";
    return {
      ...item,
      status: isBlocked ? "Blocked" : storedStatus,
      blockedReason: isBlocked ? `Waiting on "${dependency.title}"` : null,
      isOverdue: !isBlocked && storedStatus !== "Complete" && item.dueDate < new Date().toISOString().slice(0, 10),
    };
  });
}

export function getMockOnboardingRecords() {
  return RAW_JOINERS.map((joiner) => {
    const items = resolveItems(joiner);
    const probationEndDate = (() => {
      const dt = new Date(joiner.joinDate + "T00:00:00");
      dt.setMonth(dt.getMonth() + joiner.probationMonths);
      return dt.toISOString().slice(0, 10);
    })();
    return {
      employeeId: joiner.employeeId,
      employeeName: joiner.employeeName,
      avatar: joiner.avatar,
      department: joiner.department,
      designation: joiner.designation,
      joinDate: joiner.joinDate,
      buddy: joiner.buddy,
      probationEndDate,
      items,
    };
  });
}