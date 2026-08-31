import api from "./api";

/* =========================================================
   PROJECTS
   ========================================================= */

export async function getProjects() {
  const res = await api.get("/tasks/projects");
  return res.data;
}

export async function addProject(project) {
  const res = await api.post("/tasks/projects", project);
  return res.data;
}

export async function addMilestone(projectId, title, dueDate) {
  const res = await api.post(
    `/tasks/projects/${projectId}/milestones`,
    {
      title,
      dueDate,
    }
  );

  return res.data;
}

/* =========================================================
   TASKS
   ========================================================= */

export async function getTasks() {
  const res = await api.get("/tasks");
  return res.data;
}

export async function addTask(task) {
  const res = await api.post("/tasks", task);
  return res.data;
}

export async function updateTaskStatus(
  taskId,
  newStatus,
  options = {}
) {
  const res = await api.patch(
    `/tasks/${taskId}/status`,
    {
      status: newStatus,
      ...options,
    }
  );

  return res.data;
}

export async function reassignTask(taskId, newAssigneeId) {
  const res = await api.patch(
    `/tasks/${taskId}/reassign`,
    {
      assigneeId: newAssigneeId,
    }
  );

  return res.data;
}

/* =========================================================
   ORPHANED TASKS
   ========================================================= */

export async function getOrphanedTasks() {
  const res = await api.get("/tasks/orphaned");
  return res.data;
}

/* =========================================================
   TASK HISTORY
   ========================================================= */

export async function getTaskHistory(taskId) {
  const res = await api.get(`/tasks/${taskId}/history`);
  return res.data;
}

/* =========================================================
   TIME ENTRIES
   ========================================================= */

export async function getTimeEntries(taskId) {
  const res = await api.get(`/tasks/${taskId}/time-entries`);
  return res.data;
}

export async function logTimeEntry(entry) {
  const res = await api.post(
    `/tasks/${entry.taskId}/time-entries`,
    {
      employeeId: entry.employeeId,
      date: entry.date,
      hours: entry.hours,
      note: entry.note,
    }
  );

  return res.data;
}

export async function getTaskTotalHours(taskId) {
  const res = await api.get(`/tasks/${taskId}/total-hours`);
  return res.data;
}

/* =========================================================
   META
   ========================================================= */

export async function getTaskMeta() {
  const res = await api.get("/tasks/meta");
  return res.data;
}