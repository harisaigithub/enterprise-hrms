import api from "./api";

export async function getMyTickets(params = {}) {
  const res = await api.get("/helpdesk/tickets", { params: { ...params, scope: "mine" } });
  return res.data;
}
export async function getAgentQueue(queue, params = {}) {
  const res = await api.get("/helpdesk/tickets", { params: { ...params, scope: "queue", queue } });
  return res.data;
}
export async function getAllQueueNames() {
  const res = await api.get("/helpdesk/queues");
  return res.data;
}
export async function raiseTicket(payload) {
  const res = await api.post("/helpdesk/tickets", payload);
  return res.data;
}
export async function resolveTicket(ticketId, notes) {
  const res = await api.patch(`/helpdesk/tickets/${ticketId}/status`, { status: "Resolved", resolutionNotes: notes });
  return res.data;
}
export async function reopenTicket(ticketId, reason) {
  const res = await api.post(`/helpdesk/tickets/${ticketId}/reopen`, { reason });
  return res.data;
}
export async function addTicketComment(ticketId, message, isInternal = false) {
  const res = await api.post(`/helpdesk/tickets/${ticketId}/comments`, { message, isInternal });
  return res.data;
}
export async function assignTicket(ticketId, assigneeEmployeeCode) {
  const res = await api.patch(`/helpdesk/tickets/${ticketId}/assign`, { assigneeEmployeeCode });
  return res.data;
}

export async function updateTicketStatus(ticketId, status, resolutionNotes) {
  const res = await api.patch(`/helpdesk/tickets/${ticketId}/status`, { status, resolutionNotes });
  return res.data;
}
