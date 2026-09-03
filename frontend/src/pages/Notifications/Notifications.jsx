<<<<<<< HEAD
/**
 * Notifications Page — Module 23
 * Tabs:
 *   - Inbox (in-app bell/history + preferences)
 *   - History (full dispatch log)
 *   - Admin: Templates (author + linting) [Admin / HR only]
 *   - Admin: Channels (integrations + outage simulation) [Admin / HR only]
 */

import { useState, useEffect } from "react";
import { Bell, CheckCheck, Send, AlertTriangle, ShieldAlert, Wifi, WifiOff, Plus, Lock, UserCheck } from "lucide-react";
=======
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, History, Mail, Plus, Send, Settings2, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
>>>>>>> 6131c0564256db16d13c9827b08130599434aac1
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
<<<<<<< HEAD
=======
import StatusBadge from "../../components/shared/StatusBadge";
>>>>>>> 6131c0564256db16d13c9827b08130599434aac1
import { useAuth } from "../../context/AuthContext";
import {
  dispatchTestNotification, getInboxNotifications, getMergeFieldCatalog,
  getNotificationHistory, getTemplates, getUserPreferences, markAllRead,
  markAsRead, saveTemplate, updateUserPreference,
} from "../../services/notificationService";
<<<<<<< HEAD
import { CHANNELS, NOTIFICATION_CATEGORIES, SECURITY_CRITICAL_CATEGORIES } from "../../mock/notifications";
=======
import "./Notifications.css";
>>>>>>> 6131c0564256db16d13c9827b08130599434aac1

const CATEGORIES = ["Leave Approved", "Leave Rejected", "Payslip Ready", "Ticket Resolved", "Policy Published", "New Device Login", "Compliance Training Due", "Expense Approved", "Onboarding Reminder"];
const fmt = (value) => new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const statusMeta = { Delivered: { color: "#15803d", bg: "#f0fdf4" }, Failed: { color: "#dc2626", bg: "#fef2f2" }, Skipped: { color: "#64748b", bg: "#f8fafc" } };

<<<<<<< HEAD
const statusMeta = {
  Delivered: { color: "#16a34a", bg: "#f0fdf4" },
  Retrying: { color: "#d97706", bg: "#fffbeb" },
  "Failed — see in-app": { color: "#dc2626", bg: "#fef2f2" },
  Failed: { color: "#dc2626", bg: "#fef2f2" },
  Active: { color: "#16a34a", bg: "#f0fdf4" },
  "Blocked — failed linting": { color: "#dc2626", bg: "#fef2f2" },
  Connected: { color: "#16a34a", bg: "#f0fdf4" },
  Down: { color: "#dc2626", bg: "#fef2f2" },
  "Not Configured": { color: "#64748b", bg: "#f8fafc" },
};

function InboxTab({ user }) {
=======
function ErrorState({ message, onRetry }) {
  return <div className="notification-error" role="alert"><p>{message}</p><button type="button" onClick={onRetry}>Try again</button></div>;
}

function InboxTab({ onUnreadChange }) {
  const navigate = useNavigate();
>>>>>>> 6131c0564256db16d13c9827b08130599434aac1
  const [items, setItems] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingCategory, setSavingCategory] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const [inboxResult, preferenceResult] = await Promise.all([getInboxNotifications(), getUserPreferences()]);
      setItems(inboxResult.data); setPreferences(preferenceResult.data); onUnreadChange(inboxResult.total || 0);
    } catch (requestError) { setError(requestError.message || "Unable to load notifications"); }
    finally { setLoading(false); }
  }, [onUnreadChange]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

<<<<<<< HEAD
  const userId = user?.id || "EMP001";

  const load = () => Promise.all([getInboxNotifications(userId), getUserPreferences()])
    .then(([iRes, pRes]) => { setItems(iRes.data); setPrefs(pRes.data); })
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, [userId]);

  const togglePref = async (category, channel) => {
    const current = prefs[category] || [];
    const next = current.includes(channel) ? current.filter((c) => c !== channel) : [...current, channel];
    const res = await updateUserPreference(category, next);
    setPrefs(res.data);
=======
  const openItem = async (item) => {
    if (!item.read) {
      await markAsRead(item.id);
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry));
      onUnreadChange((count) => Math.max(0, count - 1));
    }
    if (item.link && item.link !== "#") navigate(item.link);
  };
  const readAll = async () => { await markAllRead(); setItems((current) => current.map((item) => ({ ...item, read: true }))); onUnreadChange(0); };
  const toggle = async (preference, key) => {
    if (preference.securityCritical && key === "emailEnabled") return;
    setSavingCategory(preference.category);
    try { setPreferences((await updateUserPreference({ ...preference, [key]: !preference[key] })).data); }
    finally { setSavingCategory(""); }
>>>>>>> 6131c0564256db16d13c9827b08130599434aac1
  };
  if (loading) return <Spinner />;
<<<<<<< HEAD

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: "20px", alignItems: "start" }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Inbox</p>
          <button onClick={async () => { await markAllRead(userId); load(); }}
            style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", color: "var(--primary)", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
            <CheckCheck size={13} /> Mark all read
          </button>
        </div>
        {items.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" subtitle="You're all caught up." />
        ) : (
          <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
            {items.map((n, i) => (
              <div key={n.id} onClick={() => { markAsRead(n.id); load(); }}
                style={{ display: "flex", gap: "12px", padding: "14px 18px", borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", background: n.read ? "transparent" : "var(--primary-light)" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: n.read ? "transparent" : "var(--primary)", marginTop: "6px", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "13.5px", fontWeight: n.read ? 500 : 700, color: "var(--text)" }}>{n.title}</p>
                  <p style={{ fontSize: "12.5px", color: "var(--subtext)", marginTop: "2px" }}>{n.body}</p>
                  <p style={{ fontSize: "11px", color: "var(--subtext)", marginTop: "4px" }}>{fmtDateTime(n.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", padding: "16px 18px" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Channel Preferences</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {NOTIFICATION_CATEGORIES.map((cat) => {
            const isSecurity = SECURITY_CRITICAL_CATEGORIES.includes(cat);
            return (
              <div key={cat}>
                <p style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text)", marginBottom: "5px", display: "flex", alignItems: "center", gap: "5px" }}>
                  {cat}
                  {isSecurity && <ShieldAlert size={12} style={{ color: "var(--red)" }} title="Security-critical — always includes Email" />}
                </p>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {CHANNELS.filter((c) => c !== "In-app").map((c) => {
                    const active = (prefs[cat] || []).includes(c) || (isSecurity && c === "Email");
                    const disabled = isSecurity && c === "Email";
                    return (
                      <button key={c} disabled={disabled} onClick={() => togglePref(cat, c)}
                        style={{
                          padding: "3px 9px", borderRadius: "99px", fontSize: "11px", fontWeight: 600,
                          border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
                          background: active ? "var(--primary-light)" : "var(--background)",
                          color: active ? "var(--primary)" : "var(--subtext)",
                          cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.7 : 1,
                        }}>
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HistoryTab({ user }) {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = user?.id || "EMP001";

  useEffect(() => { getNotificationHistory(userId).then((res) => { setLog(res.data); setLoading(false); }); }, [userId]);

  if (loading) return <Spinner />;
  if (log.length === 0) return <EmptyState title="No notification history yet" subtitle="Dispatch attempts will show up here." />;

  return (
    <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
              {["Category", "Channel", "Attempt", "Status", "Timestamp"].map((h) => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {log.map((entry) => {
              const meta = statusMeta[entry.status] || { color: "var(--text)", bg: "var(--background)" };
              return (
                <tr key={entry.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{entry.category}</td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--label)" }}>{entry.channel}</td>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "var(--subtext)" }}>
                    {entry.attempt}/{entry.maxAttempts}
                    {entry.lastError && <span title={entry.lastError} style={{ color: "var(--red)", marginLeft: "5px", cursor: "help" }}>⚠</span>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <StatusBadge label={entry.status} color={meta.color} bg={meta.bg} />
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "var(--subtext)" }}>{fmtDateTime(entry.timestamp)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TemplateModal({ isOpen, onClose, onSaved }) {
  const [catalog, setCatalog] = useState({});
  const [formData, setFormData] = useState({
    name: "", category: "Leave", channel: "Email",
    subject: "", body: "", classification: "L2",
  });
  const [lintErrors, setLintErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getMergeFieldCatalog().then((res) => setCatalog(res.data));
      setFormData({ name: "", category: "Leave", channel: "Email", subject: "", body: "", classification: "L2" });
      setLintErrors([]);
    }
  }, [isOpen]);

  const handleBodyChange = async (val) => {
    setFormData((f) => ({ ...f, body: val }));
    const lint = await lintTemplateBody(val, formData.classification);
    setLintErrors(lint.errors || []);
  };

  const handleClassificationChange = async (val) => {
    setFormData((f) => ({ ...f, classification: val }));
    const lint = await lintTemplateBody(formData.body, val);
    setLintErrors(lint.errors || []);
  };

  const insertMerge = (field) => {
    const next = formData.body + ` {{${field}}}`;
    handleBodyChange(next);
  };

  const handleSave = async () => {
    setSaving(true);
    const lint = await lintTemplateBody(formData.body, formData.classification);
    if (!lint.valid) {
      setLintErrors(lint.errors);
      setSaving(false);
      return;
    }
    const res = await saveTemplate(formData);
    setSaving(false);
    onSaved(res.data);
    onClose();
  };

  const allowedFields = catalog[formData.classification] || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Notification Template">
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Template Name</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Leave Approval" style={{ width: "100%", height: "36px", marginTop: "4px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--card)", color: "var(--text)" }} />
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Category</label>
            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={{ width: "100%", height: "36px", marginTop: "4px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--card)", color: "var(--text)" }}>
              {NOTIFICATION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Channel</label>
            <select value={formData.channel} onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
              style={{ width: "100%", height: "36px", marginTop: "4px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--card)", color: "var(--text)" }}>
              {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Data Classification</label>
            <select value={formData.classification} onChange={(e) => handleClassificationChange(e.target.value)}
              style={{ width: "100%", height: "36px", marginTop: "4px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--card)", color: "var(--text)" }}>
              <option value="L1">L1 — Public</option>
              <option value="L2">L2 — Internal</option>
              <option value="L3">L3 — Confidential (PII)</option>
              <option value="L4">L4 — Restricted (Financial)</option>
            </select>
          </div>
        </div>

        {formData.channel === "Email" && (
          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Subject Line</label>
            <input type="text" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="e.g. Action Required: Leave Request Submitted" style={{ width: "100%", height: "36px", marginTop: "4px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--card)", color: "var(--text)" }} />
          </div>
        )}

        <div>
          <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Body</label>
          <textarea value={formData.body} onChange={(e) => handleBodyChange(e.target.value)} rows={4}
            placeholder="Type message text and insert merge tags..."
            style={{ width: "100%", marginTop: "4px", padding: "10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--card)", color: "var(--text)", fontSize: "13px", resize: "vertical" }} />
        </div>

        <div>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: "6px" }}>
            Available Merge Fields ({formData.classification})
          </p>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {allowedFields.map((f) => (
              <button key={f} type="button" onClick={() => insertMerge(f)}
                style={{ padding: "3px 8px", background: "var(--primary-light)", border: "1px solid var(--border-focus)", borderRadius: "var(--radius-sm)", color: "var(--primary)", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                +{f}
              </button>
            ))}
          </div>
        </div>

        {lintErrors.length > 0 && (
          <div style={{ background: "var(--red-light)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--red)", display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
              <AlertTriangle size={13} /> Lint Errors (Saving Blocked)
            </p>
            {lintErrors.map((err, i) => (
              <p key={i} style={{ fontSize: "11.5px", color: "var(--red)", marginLeft: "18px" }}>• {err}</p>
            ))}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "6px" }}>
          <button onClick={onClose} style={{ padding: "8px 14px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px", cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || lintErrors.length > 0 || !formData.name || !formData.body}
            style={{ padding: "8px 16px", background: lintErrors.length > 0 ? "var(--subtext)" : "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontSize: "13px", fontWeight: 700, cursor: lintErrors.length > 0 ? "not-allowed" : "pointer" }}>
            {saving ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function TemplatesTab({ user, onDispatchResult }) {
  const [templates, setTemplates] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [sendingId, setSendingId] = useState(null);

  const load = () => getTemplates().then((res) => setTemplates(res.data));
  useEffect(() => { load(); }, []);

  const sendTest = async (t) => {
    setSendingId(t.id);
    const userName = `${user?.firstName || 'Current'} ${user?.lastName || 'User'}`;
    const result = await dispatchNotification(t.id, {
      employeeName: userName, leaveType: "Casual Leave", leaveDates: "12–13 Aug",
      ticketId: "TCK-0001", policyTitle: "Code of Conduct", payslipMonth: "July 2026",
      payslipLink: "[view payslip]", courseName: "POSH Awareness", dueDate: "05 Aug",
      deviceInfo: "Chrome / Windows", loginTime: fmtDateTime(new Date().toISOString()),
    });
    setSendingId(null);
    onDispatchResult(result);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <p style={{ fontSize: "13px", color: "var(--subtext)" }}>
          Templates enforce classification-based merge-tag linting. Templates with lint errors cannot be dispatched.
        </p>
        <button onClick={() => setShowNew(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
          <Plus size={14} /> New Template
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {templates.map((t) => (
          <div key={t.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>{t.name}</span>
                <span style={{ fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "4px", background: classificationColor[t.classification] + "18", color: classificationColor[t.classification] }}>
                  {t.classification}
                </span>
                <span style={{ fontSize: "11px", color: "var(--subtext)" }}>• {t.channel}</span>
                <span style={{ fontSize: "11px", color: "var(--subtext)" }}>• {t.category}</span>
              </div>
              <p style={{ fontSize: "12.5px", color: "var(--subtext)", fontFamily: "monospace", background: "var(--background)", padding: "4px 8px", borderRadius: "4px", whiteSpace: "pre-wrap" }}>
                {t.body}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <button onClick={() => sendTest(t)} disabled={sendingId === t.id}
                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", background: "var(--primary-light)", color: "var(--primary)", border: "1px solid var(--border-focus)", borderRadius: "var(--radius-sm)", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                <Send size={12} /> {sendingId === t.id ? "Sending..." : "Test Dispatch"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <TemplateModal isOpen={showNew} onClose={() => setShowNew(false)} onSaved={() => load()} />
    </div>
  );
}

function ChannelsTab() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => getChannelIntegrations().then((res) => { setChannels(res.data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const toggleOutage = async (channelName) => {
    await simulateChannelOutage(channelName);
    load();
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <p style={{ fontSize: "13px", color: "var(--subtext)" }}>
        Channel integration statuses and outage simulation. If an external channel is Down, notifications will auto-fallback to In-app.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
        {channels.map((ch) => {
          const isDown = ch.status === "Down";
          const isConfigured = ch.status !== "Not Configured";
          return (
            <div key={ch.name} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>{ch.name}</p>
                <StatusBadge label={ch.status} color={statusMeta[ch.status]?.color} bg={statusMeta[ch.status]?.bg} />
              </div>
              <p style={{ fontSize: "12px", color: "var(--subtext)", marginBottom: "4px" }}>Provider: {ch.provider}</p>
              <p style={{ fontSize: "12px", color: "var(--subtext)", marginBottom: "12px" }}>
                Success Rate: <strong>{ch.successRate}%</strong> • Avg Latency: <strong>{ch.avgLatencyMs}ms</strong>
              </p>

              {isConfigured && (
                <button onClick={() => toggleOutage(ch.name)}
                  style={{
                    display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px",
                    background: isDown ? "var(--green-light)" : "var(--red-light)",
                    color: isDown ? "var(--green)" : "var(--red)",
                    border: `1px solid ${isDown ? "var(--green)" : "var(--red)"}40`,
                    borderRadius: "var(--radius-sm)", fontSize: "12px", fontWeight: 700, cursor: "pointer",
                  }}>
                  {isDown ? <Wifi size={13} /> : <WifiOff size={13} />}
                  {isDown ? "Restore Service" : "Simulate Outage"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DispatchResultPanel({ result, onClose }) {
  if (!result) return null;
  return (
    <div style={{ background: result.success ? "#f0fdf4" : "#fef2f2", border: `1px solid ${result.success ? "#bbf7d0" : "#fecaca"}`, borderRadius: "var(--radius-md)", padding: "14px 18px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "start" }}>
      <div>
        <p style={{ fontSize: "13.5px", fontWeight: 700, color: result.success ? "#16a34a" : "#dc2626" }}>
          {result.success ? "✓ Notification Dispatched Successfully" : "✗ Dispatch Failed"}
        </p>
        <p style={{ fontSize: "12px", color: "var(--text)", marginTop: "3px" }}>
          Channel: <strong>{result.channel}</strong> {result.fallbackUsed && <span style={{ color: "#d97706" }}>(Fell back to In-App)</span>} • Message: "{result.deliveredBody}"
        </p>
      </div>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--subtext)", padding: "2px" }}>✕</button>
    </div>
  );
}

export default function Notifications() {
  const { user, role, permissions } = useAuth();
  const [tab, setTab] = useState("inbox");
  const [dispatchResult, setDispatchResult] = useState(null);

  const isAdminOrHr = ["ADMIN", "HR"].includes(role?.toUpperCase()) || permissions?.includes("notifications:write");

  const tabs = [
    { id: "inbox", label: "Inbox" },
    { id: "history", label: "History" },
    ...(isAdminOrHr ? [{ id: "templates", label: "Admin: Templates" }, { id: "channels", label: "Admin: Channels" }] : []),
  ];

  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <PageHeader
          title="Notifications & Alerts"
          subtitle={`Logged in as ${user?.firstName || "Current"} ${user?.lastName || "User"} (${role || "Employee"}) — View notifications and channel delivery logs`}
        />

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: "1px solid var(--border)" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "10px 18px",
                background: "none",
                border: "none",
                borderBottom: tab === t.id ? "2px solid var(--primary)" : "2px solid transparent",
                color: tab === t.id ? "var(--primary)" : "var(--subtext)",
                fontWeight: tab === t.id ? 700 : 500,
                fontSize: "13.5px",
                cursor: "pointer",
                marginBottom: "-1px",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "templates" && <DispatchResultPanel result={dispatchResult} onClose={() => setDispatchResult(null)} />}

        {tab === "inbox" && <InboxTab user={user} />}
        {tab === "history" && <HistoryTab user={user} />}
        {tab === "templates" && <TemplatesTab user={user} onDispatchResult={setDispatchResult} />}
        {tab === "channels" && <ChannelsTab />}
      </div>
    </MainLayout>
  );
}
=======
  if (error) return <ErrorState message={error} onRetry={load} />;
  return <div className="notification-inbox-layout">
    <section><div className="notification-section-heading"><h2>Inbox</h2>{items.some((item) => !item.read) && <button type="button" onClick={() => void readAll()}><CheckCheck size={15} /> Mark all read</button>}</div>
      {items.length === 0 ? <EmptyState icon={Bell} title="No notifications" subtitle="You're all caught up." /> : <div className="notification-list">{items.map((item) => <button type="button" key={item.id} className={`notification-item ${item.read ? "" : "unread"}`} onClick={() => void openItem(item)}><span className="notification-unread-dot" /><span className="notification-copy"><strong>{item.title}</strong><span>{item.body}</span><small>{fmt(item.timestamp)}</small></span></button>)}</div>}
    </section>
    <aside className="notification-preferences"><div className="notification-section-heading"><h2><Settings2 size={15} /> Preferences</h2></div><p className="notification-help">Choose how alerts reach you. In-app is the safe fallback.</p>
      {preferences.map((preference) => <div className="notification-preference-row" key={preference.category}><div><strong>{preference.category}</strong>{preference.securityCritical && <span title="Security alerts always include email"><ShieldAlert size={13} /></span>}</div><div className="notification-channel-buttons"><button type="button" className={preference.emailEnabled ? "active" : ""} disabled={savingCategory === preference.category || preference.securityCritical} onClick={() => void toggle(preference, "emailEnabled")}><Mail size={12} /> Email</button><button type="button" className={preference.inAppEnabled ? "active" : ""} disabled={savingCategory === preference.category} onClick={() => void toggle(preference, "inAppEnabled")}><Bell size={12} /> In-app</button></div></div>)}
    </aside>
  </div>;
}

function HistoryTab() {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setError(""); try { setRows((await getNotificationHistory()).data); } catch (requestError) { setError(requestError.message || "Unable to load delivery history"); } finally { setLoading(false); } }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  if (loading) return <Spinner />; if (error) return <ErrorState message={error} onRetry={load} />; if (!rows.length) return <EmptyState icon={History} title="No delivery history" subtitle="Delivery attempts will appear here." />;
  return <div className="notification-table-wrap"><table><thead><tr><th>Category</th><th>Channel</th><th>Status</th><th>Attempt</th><th>Time</th></tr></thead><tbody>{rows.map((row) => { const meta = statusMeta[row.status] || statusMeta.Skipped; return <tr key={row.id}><td>{row.category}</td><td>{row.channel}</td><td><StatusBadge label={row.status} color={meta.color} bg={meta.bg} /></td><td>{row.attempt}</td><td>{fmt(row.createdAt)}</td></tr>; })}</tbody></table></div>;
}

function TemplateModal({ open, onClose, onSaved, catalog }) {
  const [form, setForm] = useState({ name: "", category: CATEGORIES[0], body: "" }); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const detected = useMemo(() => [...new Set([...form.body.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)].map((match) => match[1]))], [form.body]);
  const restricted = detected.filter((field) => { const definition = catalog.find((item) => item.id === field); return !definition || ["L3", "L4"].includes(definition.classification); });
  const submit = async () => { setSaving(true); setError(""); try { await saveTemplate(form); await onSaved(); onClose(); setForm({ name: "", category: CATEGORIES[0], body: "" }); } catch (requestError) { setError(requestError.message || "Unable to save template"); } finally { setSaving(false); } };
  return <Modal isOpen={open} title="New notification template" onClose={onClose}><div className="notification-form"><label>Name<input value={form.name} maxLength={180} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label><label>Category<select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label><label>Message body<textarea rows={5} value={form.body} maxLength={5000} placeholder="Hi {{employeeName}}, your request is ready." onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} /></label>{detected.length > 0 && <p className={restricted.length ? "field-warning" : "field-safe"}>Merge fields: {detected.join(", ")}{restricted.length ? `. Restricted or unknown: ${restricted.join(", ")}` : ""}</p>}{error && <p className="field-warning">{error}</p>}<div className="notification-form-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button type="button" disabled={saving || !form.name.trim() || !form.body.trim() || restricted.length > 0} onClick={() => void submit()}>{saving ? "Saving..." : "Save template"}</button></div></div></Modal>;
}

function TemplatesTab() {
  const [templates, setTemplates] = useState([]); const [catalog, setCatalog] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [open, setOpen] = useState(false); const [sending, setSending] = useState(""); const [notice, setNotice] = useState("");
  const load = useCallback(async () => { setError(""); try { const [templateResult, catalogResult] = await Promise.all([getTemplates(), getMergeFieldCatalog()]); setTemplates(templateResult.data); setCatalog(catalogResult.data); } catch (requestError) { setError(requestError.message || "Unable to load templates"); } finally { setLoading(false); } }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  const sendTest = async (template) => { setSending(template.id); setNotice(""); try { const result = await dispatchTestNotification(template.id, { employeeName: "Test User", leaveType: "Casual Leave", leaveDates: "12-13 Sep", ticketId: "TCK-0001", policyTitle: "Code of Conduct", payslipMonth: "August 2026", payslipLink: "/payroll", courseName: "Security Awareness", dueDate: "15 Sep 2026", deviceInfo: "Chrome on Windows", loginTime: fmt(new Date()), expenseCategory: "Travel" }); setNotice(`Test created. ${result.data.deliveries.map((item) => `${item.channel}: ${item.status}`).join(" | ")}`); } catch (requestError) { setNotice(requestError.message || "Unable to send test notification"); } finally { setSending(""); } };
  if (loading) return <Spinner />; if (error) return <ErrorState message={error} onRetry={load} />;
  return <div><div className="notification-section-heading"><h2>Templates</h2><button type="button" onClick={() => setOpen(true)}><Plus size={15} /> New template</button></div>{notice && <p className="notification-notice">{notice}</p>}{templates.length === 0 ? <EmptyState title="No templates" subtitle="Create the first reusable notification template." /> : <div className="notification-template-grid">{templates.map((template) => <article key={template.id}><div><strong>{template.name}</strong><StatusBadge label={template.status} color="#15803d" bg="#f0fdf4" /></div><small>{template.category}</small><p>{template.body}</p><button type="button" disabled={sending === template.id} onClick={() => void sendTest(template)}><Send size={13} /> {sending === template.id ? "Sending..." : "Send to myself"}</button></article>)}</div>}<TemplateModal open={open} onClose={() => setOpen(false)} onSaved={load} catalog={catalog} /></div>;
}

export default function Notifications() {
  const { role } = useAuth(); const [tab, setTab] = useState("inbox"); const [unread, setUnread] = useState(0); const canManage = role === "ADMIN" || role === "HR";
  const tabs = [{ id: "inbox", label: `Inbox${unread ? ` (${unread})` : ""}`, icon: Bell }, { id: "history", label: "Delivery history", icon: History }, ...(canManage ? [{ id: "templates", label: "Templates", icon: Settings2 }] : [])];
  return <MainLayout><div className="notifications-page"><PageHeader title="Notifications" subtitle="Your alerts, delivery history and communication preferences" /><div className="notification-tabs" role="tablist">{tabs.map((item) => { const Icon = item.icon; return <button type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "active" : ""} key={item.id} onClick={() => setTab(item.id)}><Icon size={15} />{item.label}</button>; })}</div>{tab === "inbox" && <InboxTab onUnreadChange={setUnread} />}{tab === "history" && <HistoryTab />}{tab === "templates" && canManage && <TemplatesTab />}</div></MainLayout>;
}
>>>>>>> 6131c0564256db16d13c9827b08130599434aac1
