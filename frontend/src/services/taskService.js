/**
 * Task service — Module 13
 * Mirrors assetService/lmsService: async functions resolving to { data }.
 */

import {
  _getProjects,
  _addProject,
  _addMilestone,
  _getTasks,
  _addTask,
  _updateTaskStatus,
  _reassignTask,
  _getTaskHistory,
  _getOrphanedTasks,
  _getTimeEntries,
  _logTimeEntry,
  _getTaskTotalHours,
} from "../mock/tasks";

const resolve = (data, ms = 350) => new Promise((res) => setTimeout(() => res({ data }), ms));

export function getProjects() {
  return resolve(_getProjects());
}
export function addProject(project) {
  return resolve(_addProject(project));
}
export function addMilestone(projectId, title, dueDate) {
  return resolve(_addMilestone(projectId, title, dueDate));
}

export function getTasks() {
  return resolve(_getTasks());
}
export function addTask(task) {
  return resolve(_addTask(task));
}
// Returns { task } on success, or { error: "blocked", openBlockers } if Done
// is attempted while blockers are still open and force wasn't set.
export function updateTaskStatus(taskId, newStatus, options) {
  return resolve(_updateTaskStatus(taskId, newStatus, options));
}
export function reassignTask(taskId, newAssigneeId) {
  return resolve(_reassignTask(taskId, newAssigneeId));
}
export function getTaskHistory(taskId) {
  return resolve(_getTaskHistory(taskId));
}
export function getOrphanedTasks() {
  return resolve(_getOrphanedTasks());
}

export function getTimeEntries(taskId) {
  return resolve(_getTimeEntries(taskId));
}
export function logTimeEntry(entry) {
  return resolve(_logTimeEntry(entry));
}
export function getTaskTotalHours(taskId) {
  return resolve(_getTaskTotalHours(taskId));
}