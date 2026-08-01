/**
 * Mock data — Task Management (Module 13)
 */

export const TASK_STATUSES = ["To Do", "In Progress", "Review", "Done"];
export const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"];

export const taskStatusMeta = {
  "To Do": { color: "#64748b", bg: "#f1f5f9" },
  "In Progress": { color: "#0284c7", bg: "#f0f9ff" },
  Review: { color: "#7c3aed", bg: "#f5f3ff" },
  Done: { color: "#16a34a", bg: "#f0fdf4" },
};

export const priorityMeta = {
  Low: { color: "#64748b", bg: "#f1f5f9" },
  Medium: { color: "#0284c7", bg: "#f0f9ff" },
  High: { color: "#d97706", bg: "#fffbeb" },
  Urgent: { color: "#dc2626", bg: "#fef2f2" },
};

// Standin for Module 17 (Separation) until it's wired in — active flag drives
// orphaned-task detection when a task's assignee is no longer active.
export const employeeDirectory = [
  { id: "EMP001", name: "Matsya Singh", isActive: true },
  { id: "EMP002", name: "Alice Quinn", isActive: true },
  { id: "EMP003", name: "Viki Vance", isActive: true },
  { id: "EMP004", name: "Gary Chen", isActive: true },
  { id: "EMP006", name: "James Sullivan", isActive: true },
  { id: "EMP009", name: "Devika Rao", isActive: false }, // exited — used to demo orphan detection
];

const ME_ID = "EMP001";

let projects = [
  {
    id: "pr1",
    name: "HRMS Rollout",
    members: ["EMP001", "EMP002", "EMP004", "EMP009"],
    milestones: [
      { id: "ms1", title: "Module 11–13 Beta", dueDate: "2026-08-15", status: "In Progress" },
      { id: "ms2", title: "UAT Sign-off", dueDate: "2026-09-01", status: "Not Started" },
    ],
  },
  {
    id: "pr2",
    name: "General Tasks",
    members: ["EMP001", "EMP003", "EMP006"],
    milestones: [],
  },
];

let tasks = [
  {
    id: "t1", projectId: "pr1", milestoneId: "ms1", title: "Wire Compliance Dashboard filters",
    assigneeId: "EMP001", assigneeName: "Matsya Singh", priority: "High", dueDate: "2026-08-05",
    status: "In Progress", blockedByTaskIds: [], forceClosed: false, forceCloseReason: null,
  },
  {
    id: "t2", projectId: "pr1", milestoneId: "ms1", title: "Asset wipe/reimage checklist UI",
    assigneeId: "EMP004", assigneeName: "Gary Chen", priority: "Medium", dueDate: "2026-08-08",
    status: "Review", blockedByTaskIds: [], forceClosed: false, forceCloseReason: null,
  },
  {
    id: "t3", projectId: "pr1", milestoneId: "ms1", title: "QA sign-off on Task Management module",
    assigneeId: "EMP002", assigneeName: "Alice Quinn", priority: "High", dueDate: "2026-08-10",
    status: "To Do", blockedByTaskIds: ["t1", "t2"], forceClosed: false, forceCloseReason: null,
  },
  {
    id: "t4", projectId: "pr1", milestoneId: "ms2", title: "Draft UAT test plan",
    assigneeId: "EMP009", assigneeName: "Devika Rao", priority: "Medium", dueDate: "2026-07-30",
    status: "In Progress", blockedByTaskIds: [], forceClosed: false, forceCloseReason: null,
  },
  {
    id: "t5", projectId: "pr2", milestoneId: null, title: "Reply to vendor onboarding email",
    assigneeId: "EMP001", assigneeName: "Matsya Singh", priority: "Low", dueDate: "2026-08-02",
    status: "To Do", blockedByTaskIds: [], forceClosed: false, forceCloseReason: null,
  },
];

let timeEntries = [
  { id: "te1", taskId: "t1", employeeId: "EMP001", employeeName: "Matsya Singh", date: "2026-07-29", hours: 3, note: "Filter logic + wiring." },
  { id: "te2", taskId: "t2", employeeId: "EMP004", employeeName: "Gary Chen", date: "2026-07-30", hours: 2.5, note: "Checklist form + validation." },
];

let history = [
  { id: "h1", taskId: "t1", action: "Created", date: "2026-07-25", detail: "Task created under HRMS Rollout / Module 11–13 Beta." },
  { id: "h2", taskId: "t1", action: "Status changed", date: "2026-07-27", detail: "To Do → In Progress" },
  { id: "h3", taskId: "t2", action: "Status changed", date: "2026-07-30", detail: "In Progress → Review" },
];

/* ---------------- Projects & Milestones ---------------- */

export function _getProjects() {
  return projects;
}

export function _addProject({ name, memberIds }) {
  const project = { id: `pr-${Date.now()}`, name, members: memberIds, milestones: [] };
  projects = [project, ...projects];
  return project;
}

export function _addMilestone(projectId, title, dueDate) {
  const milestone = { id: `ms-${Date.now()}`, title, dueDate, status: "Not Started" };
  projects = projects.map((p) => (p.id === projectId ? { ...p, milestones: [...p.milestones, milestone] } : p));
  return milestone;
}

/* ---------------- Tasks ---------------- */

export function _getTasks() {
  return tasks;
}

export function _addTask({ projectId, milestoneId, title, assigneeId, priority, dueDate }) {
  const assignee = employeeDirectory.find((e) => e.id === assigneeId);
  const task = {
    id: `t-${Date.now()}`,
    projectId,
    milestoneId: milestoneId || null,
    title,
    assigneeId,
    assigneeName: assignee ? assignee.name : "Unassigned",
    priority,
    dueDate,
    status: "To Do",
    blockedByTaskIds: [],
    forceClosed: false,
    forceCloseReason: null,
  };
  tasks = [task, ...tasks];
  history = [{ id: `h-${Date.now()}`, taskId: task.id, action: "Created", date: new Date().toISOString().slice(0, 10), detail: `Task created and assigned to ${task.assigneeName}.` }, ...history];
  return task;
}

// Validation rule 13.6: a task can't move to Done while any of its blockers
// are themselves not Done — unless the Project Lead force-closes it with a
// logged reason.
export function _updateTaskStatus(taskId, newStatus, { force = false, reason = "" } = {}) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return { error: "Task not found." };

  if (newStatus === "Done" && !force) {
    const openBlockers = task.blockedByTaskIds
      .map((id) => tasks.find((t) => t.id === id))
      .filter((b) => b && b.status !== "Done");
    if (openBlockers.length > 0) {
      return { error: "blocked", openBlockers };
    }
  }

  const prevStatus = task.status;
  tasks = tasks.map((t) =>
    t.id === taskId
      ? { ...t, status: newStatus, forceClosed: newStatus === "Done" && force, forceCloseReason: newStatus === "Done" && force ? reason : t.forceCloseReason }
      : t
  );
  history = [
    {
      id: `h-${Date.now()}`,
      taskId,
      action: "Status changed",
      date: new Date().toISOString().slice(0, 10),
      detail: force && newStatus === "Done" ? `${prevStatus} → Done (force-closed: ${reason})` : `${prevStatus} → ${newStatus}`,
    },
    ...history,
  ];
  return { task: tasks.find((t) => t.id === taskId) };
}

export function _reassignTask(taskId, newAssigneeId) {
  const task = tasks.find((t) => t.id === taskId);
  const assignee = employeeDirectory.find((e) => e.id === newAssigneeId);
  if (!task || !assignee) return null;
  tasks = tasks.map((t) => (t.id === taskId ? { ...t, assigneeId: assignee.id, assigneeName: assignee.name } : t));
  history = [{ id: `h-${Date.now()}`, taskId, action: "Reassigned", date: new Date().toISOString().slice(0, 10), detail: `Reassigned from ${task.assigneeName} to ${assignee.name}.` }, ...history];
  return tasks.find((t) => t.id === taskId);
}

export function _getTaskHistory(taskId) {
  return history.filter((h) => h.taskId === taskId);
}

// 13.8: orphaned-task detection — tasks still open, whose assignee is no
// longer active, surfaced so they never sit silently on a dead account.
export function _getOrphanedTasks() {
  return tasks.filter((t) => {
    if (t.status === "Done") return false;
    const assignee = employeeDirectory.find((e) => e.id === t.assigneeId);
    return assignee && !assignee.isActive;
  });
}

/* ---------------- Time Tracking ---------------- */

export function _getTimeEntries(taskId) {
  return taskId ? timeEntries.filter((te) => te.taskId === taskId) : timeEntries;
}

// 13.5 step 4: manually confirmed by the employee, never silently
// auto-populated from Attendance — this is the point of confirmation.
export function _logTimeEntry({ taskId, employeeId, employeeName, date, hours, note }) {
  const entry = { id: `te-${Date.now()}`, taskId, employeeId, employeeName, date, hours: Number(hours), note };
  timeEntries = [entry, ...timeEntries];
  return entry;
}

export function _getTaskTotalHours(taskId) {
  return timeEntries.filter((te) => te.taskId === taskId).reduce((sum, te) => sum + te.hours, 0);
}