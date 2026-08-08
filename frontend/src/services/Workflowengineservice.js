/**
 * Workflow Engine service — Module 21
 * Talks to the real backend (VITE_API_URL → /api/workflow).
 * Each function mirrors the page's expected `{ data }` envelope.
 */

import api from "./api";

export const getRoster = async () => {
  const res = await api.get("/workflow/roster");
  return res.data;
};

export const getDefinitions = async () => {
  const res = await api.get("/workflow/definitions");
  return res.data;
};

export const addDefinition = async (def) => {
  const res = await api.post("/workflow/definitions", def);
  return res.data;
};

export const deactivateDefinition = async (id) => {
  const res = await api.put(`/workflow/definitions/${id}/deactivate`);
  return res.data;
};

export const deleteDefinition = async (id) => {
  const res = await api.delete(`/workflow/definitions/${id}`);
  return res.data;
};

export const getInstances = async () => {
  const res = await api.get("/workflow/instances");
  return res.data;
};

export const getEventLog = async () => {
  const res = await api.get("/workflow/events");
  return res.data;
};

// Resolves the concrete approver chain for this request server-side, applying
// the self-approval hard block (Golden Rule #5) and any step conditions.
export const submitRequest = async (definitionId, requesterId, attributes) => {
  const res = await api.post("/workflow/instances", { definitionId, requesterId, attributes });
  return res.data;
};

// action is "approve" | "reject". First action on a step wins — a second
// caller gets { error } explaining who already acted, never a silent no-op.
export const actOnStep = async (instanceId, actingApproverId, actingApproverName, action, reason) => {
  const res = await api.post(`/workflow/instances/${instanceId}/act`, {
    action,
    reason,
    actingApproverName,
  });
  return res.data;
};

export const runSlaCheck = async () => {
  const res = await api.post("/workflow/sla-check");
  return res.data;
};

export const manuallyAssignApprover = async (instanceId, approverId, approverName) => {
  const res = await api.post(`/workflow/instances/${instanceId}/assign`, { approverId, approverName });
  return res.data;
};
