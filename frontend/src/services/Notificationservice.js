/**
 * Notification service — Module 23
 * Mirrors the async-delay + { data } shape of the other services.
 *
 * The parts of the spec with real teeth, implemented here rather than just
 * described in the UI:
 *   - lintTemplateBody(): rejects L3/L4 raw fields at save time (23.6)
 *   - dispatchNotification(): security-critical categories always include
 *     Email even if the user opted out of everything (23.5 step 2)
 *   - retry with backoff, then fail-to-in-app, never silently dropped (23.5
 *     step 5, 23.8)
 *   - log entries never carry the merge values used to render a message —
 *     only category/channel/status (23.4)
 */

import {
  CHANNELS, NOTIFICATION_CATEGORIES, SECURITY_CRITICAL_CATEGORIES, CURRENT_USER,
  MERGE_FIELD_CATALOG, RAW_TEMPLATES, RAW_INBOX, RAW_LOG, CHANNEL_INTEGRATIONS,
  USER_PREFERENCES, generateTemplateId,
} from "../mock/notifications";

const DELAY = 300;
function delay(value) {
  return new Promise((resolve) => setTimeout(() => resolve({ data: value }), DELAY));
}

let _templates = [...RAW_TEMPLATES];
let _inbox = [...RAW_INBOX];
let _log = [...RAW_LOG];
let _integrations = CHANNEL_INTEGRATIONS.map((c) => ({ ...c }));
let _preferences = { ...USER_PREFERENCES };
let _nextLogId = _log.length + 1;
let _nextInboxId = _inbox.length + 1;

// ---------- Inbox / History (what a recipient sees) ----------

export function getInboxNotifications(userId) {
  return delay(_inbox.filter(() => userId === CURRENT_USER.id)); 
}

export function markAsRead(notificationId) {
  const n = _inbox.find((x) => x.id === notificationId);
  if (n) n.read = true;
  return delay(n || null);
}

export function markAllRead(userId) {
  _inbox.forEach((n) => { if (userId === CURRENT_USER.id) n.read = true; });
  return delay(_inbox);
}

export function getNotificationHistory(userId) {
  return delay(_log.filter((l) => l.recipientId === userId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
}

export function getUserPreferences() {
  return delay(_preferences);
}

export function updateUserPreference(category, channels) {
  _preferences = { ..._preferences, [category]: channels };
  return delay(_preferences);
}

// ---------- Admin: Templates ----------

export function getTemplates() {
  return delay(_templates);
}

export function getMergeFieldCatalog() {
  return delay(MERGE_FIELD_CATALOG);
}

function extractMergeFields(body) {
  const matches = [...body.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)];
  return [...new Set(matches.map((m) => m[1]))];
}

/**
 * 
 * at save time — not left to reviewer judgment. Returns every field found
 * in the body plus any violations (unknown field, or classified L3/L4).
 */
export function lintTemplateBody(body) {
  const fields = extractMergeFields(body);
  const violations = fields
    .map((f) => {
      const def = MERGE_FIELD_CATALOG.find((c) => c.id === f);
      if (!def) return { field: f, reason: "Not in the approved merge-field catalog" };
      if (def.classification === "L3" || def.classification === "L4") {
        return { field: f, reason: `Classified ${def.classification} — raw value cannot be merged into a notification body` };
      }
      return null;
    })
    .filter(Boolean);
  return { fields, violations, passed: violations.length === 0 };
}

/** Save is blocked outright if linting fails — this is the enforcement point, not just a warning. */
export function saveTemplate(input) {
  const lint = lintTemplateBody(input.body);
  if (!lint.passed) {
    return Promise.reject(new Error(`Template save blocked: ${lint.violations.map((v) => `{{${v.field}}} — ${v.reason}`).join("; ")}`));
  }
  const template = {
    id: generateTemplateId(),
    name: input.name,
    category: input.category,
    body: input.body,
    status: "Active",
    createdBy: input.createdBy,
  };
  _templates = [template, ..._templates];
  return delay(template);
}

// ---------- Admin: Channel Integrations ----------

export function getChannelIntegrations() {
  return delay(_integrations);
}

/** Toggles a channel between Connected/Down to demonstrate retry + in-app fallback. */
export function simulateChannelOutage(channel, down) {
  const integration = _integrations.find((i) => i.channel === channel);
  if (integration && channel !== "In-app") {
    integration.status = down ? "Down" : "Connected";
    integration.lastChecked = new Date().toISOString();
  }
  return delay(_integrations);
}

// ---------- Dispatch engine  ----------

const MAX_ATTEMPTS = 3;
const BACKOFF_SECONDS = [2, 4, 8]; // shown in the trail for realism; simulated wait for UI feedback

function writeLog(entry) {
  // category/channel/status/timestamp only — never the
  // merge values used to render the message body .
  const record = { id: `L${_nextLogId++}`, ...entry };
  _log = [record, ..._log];
  return record;
}

async function attemptChannel(channel, template, recipient) {
  const integration = _integrations.find((i) => i.channel === channel);
  const isUp = integration?.status === "Connected";
  await new Promise((r) => setTimeout(r, 200)); // small real delay for UX; not the full logical backoff

  const trail = [];
  if (channel === "In-app" || isUp) {
    const attempt = { attempt: 1, status: "Delivered", backoffSeconds: 0 };
    trail.push(attempt);
    writeLog({ recipientId: recipient.id, recipientName: recipient.name, category: template.category, channel, status: "Delivered", attempt: 1, timestamp: new Date().toISOString(), templateId: template.id });
    return { channel, finalStatus: "Delivered", trail };
  }

  // Channel is down — retry with backoff up to MAX_ATTEMPTS, then fall back.
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, 200));
    trail.push({ attempt, status: "Failed", backoffSeconds: BACKOFF_SECONDS[attempt - 1] || null });
    writeLog({ recipientId: recipient.id, recipientName: recipient.name, category: template.category, channel, status: attempt < MAX_ATTEMPTS ? "Retrying" : "Failed — see in-app", attempt, timestamp: new Date().toISOString(), templateId: template.id });
  }
  return { channel, finalStatus: "Failed — see in-app", trail };
}

/**
 * Dispatches a notification per 
 *  - resolves the recipient's channel preference for this category
 *  - security-critical categories always ALSO include Email, regardless of
 *    preference — even a full opt-out ([]) still gets Email
 *  - In-app is always attempted alongside external channels and always
 *    succeeds immediately, so it's the guaranteed fallback external
 *    channels can fail back to
 *  - mergeValues are used ONLY to render the in-app message text; they are
 *    never written into the log (see writeLog)
 */
export async function dispatchNotification(templateId, mergeValues = {}) {
  const template = _templates.find((t) => t.id === templateId);
  if (!template) throw new Error("Unknown template");
  const recipient = CURRENT_USER;

  const isSecurityCritical = SECURITY_CRITICAL_CATEGORIES.includes(template.category);
  const preferred = _preferences[template.category] || [];
  let channels = new Set(preferred);
  if (isSecurityCritical) channels.add("Email"); // bypasses opt-out, 
  channels.add("In-app"); // always attempted for anything important

  const rendered = template.body.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => mergeValues[key] ?? `[${key}]`);

  // In-app entry is created once, immediately, regardless of how many
  // external channels are also being attempted.
  _inbox = [{ id: `N${_nextInboxId++}`, title: template.name, body: rendered, category: template.category, read: false, timestamp: new Date().toISOString(), link: "#" }, ..._inbox];

  const results = [];
  for (const channel of channels) {
    // eslint-disable-next-line no-await-in-loop
    const result = await attemptChannel(channel, template, recipient);
    results.push(result);
  }

  return {
    templateId, category: template.category, isSecurityCritical,
    bypassedOptOut: isSecurityCritical && preferred.length === 0,
    resolvedChannels: [...channels], results,
  };
}