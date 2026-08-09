/**
 * Helpdesk service — Module 17
 * Mirrors the async-delay + { data } shape of expenseService/leaveService.
 *
 * Escalation and auto-close are computed on read (like Onboarding's isOverdue),
 * not stored as a permanent flag — so "now" always reflects reality rather
 * than going stale.
 */

import {
  SLA_HOURS, CATEGORY_QUEUE, RESTRICTED_CATEGORY, REOPEN_WINDOW_DAYS,
  RAW_TICKETS, generateTicketId,
} from "../mock/helpdesk";

const DELAY = 350;

function delay(value) {
  return new Promise((resolve) => setTimeout(() => resolve({ data: value }), DELAY));
}

let _tickets = [...RAW_TICKETS];

/**
 * Derives the effective status/escalation state of a ticket without mutating
 * it, per 
 *   - SLA breached + not resolved/closed → escalated=true, but status and
 *     assignedAgent are untouched (escalation never removes ownership).
 *   - Resolved ticket past the reopen window with no reopen → effectively Closed.
 */
function deriveTicketView(t) {
  const now = new Date();
  const createdMs = new Date(t.createdOn).getTime();
  const slaHours = SLA_HOURS[t.category] ?? 24;
  const slaDeadline = new Date(createdMs + slaHours * 3600000);
  const isActive = !["Resolved", "Closed"].includes(t.status);
  const escalated = isActive && now > slaDeadline;

  let effectiveStatus = t.status;
  if (t.status === "Resolved" && t.resolvedOn) {
    const windowEnd = new Date(new Date(t.resolvedOn).getTime() + REOPEN_WINDOW_DAYS * 86400000);
    if (now > windowEnd) effectiveStatus = "Closed";
  }

  return {
    ...t,
    status: effectiveStatus,
    slaHours,
    slaDeadline: slaDeadline.toISOString(),
    escalated,
    escalatedTo: escalated ? "Team Lead" : null,
    canReopen: t.status === "Resolved" && effectiveStatus === "Resolved",
  };
}

export function getMyTickets(employeeId) {
  return delay(_tickets.filter((t) => t.employeeId === employeeId).map(deriveTicketView));
}

/**
 * Tickets for a given queue. Confidential-category tickets only ever
 * surface in the restricted queue  — a general agent
 * fetching "HR" never sees them, regardless of what's asked for.
 */
export function getAgentQueue(queueName) {
  const restricted = queueName === CATEGORY_QUEUE[RESTRICTED_CATEGORY];
  return delay(
    _tickets
      .filter((t) => t.queue === queueName && (restricted || !t.isConfidential))
      .map(deriveTicketView)
  );
}

export function getAllQueueNames() {
  return delay([...new Set(Object.values(CATEGORY_QUEUE))]);
}

/**
 * Raises a new ticket. Category drives queue assignment and SLA clock start
 * ; the confidential category is always force-routed to
 * the restricted queue, never left to the submitter to choose a queue.
 */
export function raiseTicket(input) {
  const isConfidential = input.category === RESTRICTED_CATEGORY;
  const ticket = {
    id: generateTicketId(),
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    category: input.category,
    queue: CATEGORY_QUEUE[input.category],
    description: input.description,
    attachmentFileName: input.attachmentFileName || null,
    status: "Open",
    assignedAgent: isConfidential ? "HR-Compliance" : `${CATEGORY_QUEUE[input.category]} (unassigned)`,
    createdOn: new Date().toISOString(),
    resolvedOn: null,
    resolutionNotes: null,
    reopenedOn: null,
    thread: [{ author: input.employeeName, message: input.description, timestamp: new Date().toISOString() }],
    isConfidential,
  };
  _tickets = [ticket, ..._tickets];
  return delay(deriveTicketView(ticket));
}

/**
 * Resolves a ticket. Blocked without resolution notes .
 */
export function resolveTicket(ticketId, notes) {
  if (!notes || !notes.trim()) {
    return Promise.reject(new Error("Resolution notes are required to close a ticket."));
  }
  const ticket = _tickets.find((t) => t.id === ticketId);
  if (!ticket) return delay(null);

  ticket.status = "Resolved";
  ticket.resolvedOn = new Date().toISOString();
  ticket.resolutionNotes = notes.trim();
  ticket.thread = [...ticket.thread, { author: ticket.assignedAgent, message: notes.trim(), timestamp: ticket.resolvedOn }];
  return delay(deriveTicketView(ticket));
}

/** Employee reopens within the window . */
export function reopenTicket(ticketId, message) {
  const ticket = _tickets.find((t) => t.id === ticketId);
  if (!ticket) return delay(null);

  const view = deriveTicketView(ticket);
  if (!view.canReopen) return delay(view); // window elapsed or not resolved — no-op

  ticket.status = "Reopened";
  ticket.reopenedOn = new Date().toISOString();
  if (message?.trim()) {
    ticket.thread = [...ticket.thread, { author: ticket.employeeName, message: message.trim(), timestamp: ticket.reopenedOn }];
  }
  return delay(deriveTicketView(ticket));
}

/**
 * Reassigns a ticket to a different queue. Confidential tickets can only be
 * reassigned by the restricted queue's own owner/Admin  — this
 * function is the enforcement point, independent of what the UI allows.
 */
export function reassignTicket(ticketId, newQueue, actorRole) {
  const ticket = _tickets.find((t) => t.id === ticketId);
  if (!ticket) return delay(null);

  if (ticket.isConfidential && !["Admin", "HR-Compliance Owner"].includes(actorRole)) {
    return Promise.reject(new Error("Confidential tickets can only be reassigned by the restricted queue owner or Admin."));
  }
  ticket.queue = newQueue;
  return delay(deriveTicketView(ticket));
}