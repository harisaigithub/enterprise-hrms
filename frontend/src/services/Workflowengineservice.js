/**
 * Workflow Engine service — Module 21
 * Mirrors leaveService/attendanceService: async functions resolving to { data }.
 */

import {
  _getRoster,
  _getDefinitions,
  _addDefinition,
  _deactivateDefinition,
  _deleteDefinition,
  _getInstances,
  _getEventLog,
  _submitRequest,
  _actOnStep,
  _runSlaCheck,
  _manuallyAssignApprover,
} from "../mock/workflowEngine";

const resolve = (data, ms = 350) => new Promise((res) => setTimeout(() => res({ data }), ms));

export function getRoster() { return resolve(_getRoster()); }

export function getDefinitions() { return resolve(_getDefinitions()); }
export function addDefinition(def) { return resolve(_addDefinition(def)); }
export function deactivateDefinition(id) { return resolve(_deactivateDefinition(id)); }
// Blocked while active instances reference it — returns { error } instead.
export function deleteDefinition(id) { return resolve(_deleteDefinition(id)); }

export function getInstances() { return resolve(_getInstances()); }
export function getEventLog() { return resolve(_getEventLog()); }

// Resolves the concrete approver chain for this specific request, applying
// the self-approval hard block (Golden Rule #5) and any step conditions.
export function submitRequest(definitionId, requesterId, attributes) {
  return resolve(_submitRequest(definitionId, requesterId, attributes));
}

// action is "approve" | "reject". First action on a step wins — a second
// caller gets { error } explaining who already acted, never a silent no-op.
export function actOnStep(instanceId, actingApproverId, actingApproverName, action, reason) {
  return resolve(_actOnStep(instanceId, actingApproverId, actingApproverName, action, reason));
}

export function runSlaCheck() {
  return resolve(_runSlaCheck());
}

export function manuallyAssignApprover(instanceId, approverId, approverName) {
  return resolve(_manuallyAssignApprover(instanceId, approverId, approverName));
}