/**
 * Notifications Page — Module 23
 * Tabs: Inbox (in-app bell/history + preferences), History (full dispatch
 * log), Admin: Templates (author + linting), Admin: Channels (integrations
 * + outage simulation).
 */

import { useState, useEffect } from "react";
import { Bell, CheckCheck, Send, AlertTriangle, ShieldAlert, Wifi, WifiOff, Plus, Lock } from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import {
  getInboxNotifications, markAsRead, markAllRead, getNotificationHistory,
  getUserPreferences, updateUserPreference,
  getTemplates, getMergeFieldCatalog, lintTemplateBody, saveTemplate,
  getChannelIntegrations, simulateChannelOutage, dispatchNotification,
} from "../../services/notificationService";
import { CHANNELS, NOTIFICATION_CATEGORIES, SECURITY_CRITICAL_CATEGORIES, CURRENT_USER } from "../../mock/notifications";

const classificationColor = { L1: "#64748b", L2: "#0284c7", L3: "#d97706", L4: "#dc2626" };
const fmtDateTime = (d) => new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

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

function InboxTab() {
  const [items, setItems] = useState([]);
  const [prefs, setPrefs] = useState({});
  const [loading, setLoading] = useState(true);

  const load = () => Promise.all([getInboxNotifications(CURRENT_USER.id), getUserPreferences()])
    .then(([iRes, pRes]) => { setItems(iRes.data); setPrefs(pRes.data); })
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const togglePref = async (category, channel) => {
    const current = prefs[category] || [];
    const next = current.includes(channel) ? current.filter((c) => c !== channel) : [...current, channel];
    const res = await updateUserPreference(category, next);
    setPrefs(res.data);
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: "20px", alignItems: "start" }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Inbox</p>
          <button onClick={async () => { await markAllRead(CURRENT_USER.id); load(); }}
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
                    const active = (prefs[cat] || []).includes(c);
                    const forcedByEmail = isSecurity && c === "Email";
                    return (
                      <button key={c} onClick={() => !forcedByEmail && togglePref(cat, c)} disabled={forcedByEmail}
                        title={forcedByEmail ? "Security-critical — cannot be turned off" : ""}
                        style={{
                          padding: "3px 9px", borderRadius: "99px", fontSize: "11px", fontWeight: 600,
                          border: active || forcedByEmail ? "1px solid var(--primary)" : "1px solid var(--border)",
                          background: active || forcedByEmail ? "var(--primary)" : "var(--card)",
                          color: active || forcedByEmail ? "#fff" : "var(--subtext)",
                          cursor: forcedByEmail ? "not-allowed" : "pointer", opacity: forcedByEmail ? 0.85 : 1,
                        }}>
                        {c}{forcedByEmail && " 🔒"}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: "10.5px", color: "var(--subtext)", marginTop: "12px" }}>In-app is always delivered regardless of preference — it's the guaranteed fallback if every other channel fails.</p>
      </div>
    </div>
  );
}

function HistoryTab() {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getNotificationHistory(CURRENT_USER.id).then((res) => { setLog(res.data); setLoading(false); }); }, []);

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
            {log.map((l, i) => {
              const meta = statusMeta[l.status] || statusMeta.Delivered;
              return (
                <tr key={l.id} style={{ borderBottom: i < log.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "13px 16px", fontSize: "13px", color: "var(--text)" }}>{l.category}</td>
                  <td style={{ padding: "13px 16px", fontSize: "13px", color: "var(--subtext)" }}>{l.channel}</td>
                  <td style={{ padding: "13px 16px", fontSize: "12.5px", color: "var(--subtext)" }}>{l.attempt}</td>
                  <td style={{ padding: "13px 16px" }}><StatusBadge label={l.status} color={meta.color} bg={meta.bg} /></td>
                  <td style={{ padding: "13px 16px", fontSize: "12px", color: "var(--subtext)", whiteSpace: "nowrap" }}>{fmtDateTime(l.timestamp)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewTemplateModal({ isOpen, onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", category: NOTIFICATION_CATEGORIES[0], body: "" });
  const [catalog, setCatalog] = useState([]);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => { getMergeFieldCatalog().then((res) => setCatalog(res.data)); }, []);

  const lint = lintTemplateBody(form.body);

  const submit = async () => {
    if (!form.name.trim() || !form.body.trim()) return;
    setSaving(true);
    setApiError("");
    try {
      await saveTemplate({ ...form, createdBy: "Priya Iyer (HR)" });
      onSaved();
      onClose();
      setForm({ name: "", category: NOTIFICATION_CATEGORIES[0], body: "" });
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="New Template" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Name *</label>
          <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            style={{ height: "38px", padding: "0 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13.5px" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Category</label>
          <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
            style={{ height: "38px", padding: "0 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13.5px" }}>
            {NOTIFICATION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Body * — use {"{{fieldId}}"} for merge fields</label>
          <textarea value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} rows={4}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13.5px", fontFamily: "inherit", resize: "vertical" }} />
        </div>

        {lint.fields.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Merge Fields Detected</p>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {lint.fields.map((f) => {
                const def = catalog.find((c) => c.id === f);
                const bad = !def || def.classification === "L3" || def.classification === "L4";
                return (
                  <span key={f} style={{ fontSize: "11px", fontWeight: 600, padding: "3px 9px", borderRadius: "99px", background: bad ? "#fef2f2" : "#f0fdf4", color: bad ? "var(--red)" : "var(--green)", display: "flex", alignItems: "center", gap: "4px" }}>
                    {bad && <Lock size={10} />} {f} {def && <span style={{ opacity: 0.7 }}>({def.classification})</span>}
                  </span>
                );
              })}
            </div>
            {!lint.passed && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--radius-sm)", padding: "10px 12px", display: "flex", gap: "7px", alignItems: "flex-start" }}>
                <AlertTriangle size={13} style={{ color: "var(--red)", flexShrink: 0, marginTop: "1px" }} />
                <div>
                  {lint.violations.map((v) => (
                    <p key={v.field} style={{ fontSize: "12px", color: "#991b1b" }}>{`{{${v.field}}}`} — {v.reason}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {apiError && <p style={{ fontSize: "12px", color: "var(--red)" }}>{apiError}</p>}

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "none", color: "var(--label)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>Cancel</button>
          <button
            id="save-template-btn"
            onClick={submit}
            disabled={saving || !lint.passed || !form.name.trim() || !form.body.trim()}
            style={{
              padding: "9px 20px", border: "none", borderRadius: "var(--radius-sm)",
              background: lint.passed ? "var(--primary)" : "var(--border)",
              color: lint.passed ? "#fff" : "var(--subtext)",
              fontWeight: 600, fontSize: "13px",
              cursor: saving || !lint.passed ? "not-allowed" : "pointer",
            }}>
            {saving ? "Saving…" : "Save Template"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function TemplatesTab({ onDispatchResult }) {
  const [templates, setTemplates] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [sendingId, setSendingId] = useState(null);

  const load = () => getTemplates().then((res) => setTemplates(res.data));
  useEffect(() => { load(); }, []);

  const sendTest = async (t) => {
    setSendingId(t.id);
    const result = await dispatchNotification(t.id, {
      employeeName: CURRENT_USER.name, leaveType: "Casual Leave", leaveDates: "12–13 Aug",
      ticketId: "TCK-0001", policyTitle: "Code of Conduct", payslipMonth: "July 2026",
      payslipLink: "[view payslip]", courseName: "POSH Awareness", dueDate: "05 Aug",
      deviceInfo: "Chrome / Windows", loginTime: fmtDateTime(new Date().toISOString()),
    });
    setSendingId(null);
    onDispatchResult(result);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
        <button onClick={() => setShowNew(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
          <Plus size={16} /> New Template
        </button>
      </div>
      <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
                {["Template", "Category", "Body", "Status", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {templates.map((t, i) => {
                const meta = statusMeta[t.status] || statusMeta.Active;
                const blocked = t.status !== "Active";
                return (
                  <tr key={t.id} style={{ borderBottom: i < templates.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td style={{ padding: "13px 16px", fontSize: "13.5px", fontWeight: 600, color: "var(--text)" }}>
                      {t.name} {SECURITY_CRITICAL_CATEGORIES.includes(t.category) && <ShieldAlert size={12} style={{ color: "var(--red)", display: "inline", marginLeft: "4px", verticalAlign: "-1px" }} />}
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: "13px", color: "var(--subtext)" }}>{t.category}</td>
                    <td style={{ padding: "13px 16px", fontSize: "12.5px", color: "var(--subtext)", maxWidth: "280px", fontFamily: "monospace" }}>{t.body}</td>
                    <td style={{ padding: "13px 16px" }}><StatusBadge label={t.status} color={meta.color} bg={meta.bg} /></td>
                    <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                      <button onClick={() => sendTest(t)} disabled={blocked || sendingId === t.id}
                        title={blocked ? "Blocked templates cannot be sent" : ""}
                        style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", background: blocked ? "var(--border)" : "var(--primary-light)", color: blocked ? "var(--subtext)" : "var(--primary)", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "12px", cursor: blocked ? "not-allowed" : "pointer" }}>
                        <Send size={12} /> {sendingId === t.id ? "Sending…" : "Send Test"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <NewTemplateModal isOpen={showNew} onClose={() => setShowNew(false)} onSaved={load} />
    </div>
  );
}

function ChannelsTab() {
  const [integrations, setIntegrations] = useState([]);

  const load = () => getChannelIntegrations().then((res) => setIntegrations(res.data));
  useEffect(() => { load(); }, []);

  return (
    <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
              {["Channel", "Status", "Last Checked", "Actions"].map((h) => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {integrations.map((c, i) => {
              const meta = statusMeta[c.status];
              const isDown = c.status === "Down";
              const canToggle = c.channel !== "In-app" && c.status !== "Not Configured";
              return (
                <tr key={c.channel} style={{ borderBottom: i < integrations.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "13px 16px", fontSize: "13.5px", fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: "7px" }}>
                    {c.status === "Connected" ? <Wifi size={13} style={{ color: "var(--green)" }} /> : <WifiOff size={13} style={{ color: "var(--subtext)" }} />}
                    {c.channel}
                  </td>
                  <td style={{ padding: "13px 16px" }}><StatusBadge label={c.status} color={meta.color} bg={meta.bg} /></td>
                  <td style={{ padding: "13px 16px", fontSize: "12px", color: "var(--subtext)" }}>{c.lastChecked ? fmtDateTime(c.lastChecked) : "—"}</td>
                  <td style={{ padding: "13px 16px" }}>
                    {canToggle && (
                      <button onClick={async () => { await simulateChannelOutage(c.channel, !isDown); load(); }}
                        style={{ padding: "6px 12px", background: isDown ? "var(--green-light)" : "var(--red-light)", color: isDown ? "var(--green)" : "var(--red)", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
                        {isDown ? "Restore" : "Simulate Outage"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: "11px", color: "var(--subtext)", padding: "12px 16px" }}>
        Toggle a channel to "Down", then send a test notification from the Templates tab whose preference includes that channel — watch it retry and fall back to In-app.
      </p>
    </div>
  );
}

function DispatchResultPanel({ result, onClose }) {
  if (!result) return null;
  return (
    <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--primary)", boxShadow: "var(--shadow-md)", padding: "16px 18px", marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>Dispatch trail — {result.category}</p>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--subtext)", cursor: "pointer", fontSize: "12px" }}>Dismiss</button>
      </div>
      {result.bypassedOptOut && (
        <p style={{ fontSize: "12px", color: "var(--red)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
          <ShieldAlert size={13} /> Security-critical — Email was sent despite the recipient's preference being fully opted out.
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {result.results.map((r) => (
          <div key={r.channel} style={{ fontSize: "12.5px" }}>
            <span style={{ fontWeight: 700, color: "var(--text)" }}>{r.channel}: </span>
            {r.trail.map((t, i) => (
              <span key={i} style={{ color: t.status === "Delivered" ? "var(--green)" : "var(--red)" }}>
                {i > 0 && " → "}attempt {t.attempt} {t.status.toLowerCase()}{t.backoffSeconds ? ` (backoff ${t.backoffSeconds}s)` : ""}
              </span>
            ))}
            {" — "}
            <span style={{ fontWeight: 600, color: r.finalStatus === "Delivered" ? "var(--green)" : "var(--red)" }}>{r.finalStatus}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Notifications() {
  const [tab, setTab] = useState("inbox");
  const [role, setRole] = useState("Employee");
  const [dispatchResult, setDispatchResult] = useState(null);

  const tabs = [
    { id: "inbox", label: "Inbox" },
    { id: "history", label: "History" },
    ...(role === "Admin" ? [{ id: "templates", label: "Admin: Templates" }, { id: "channels", label: "Admin: Channels" }] : []),
  ];

  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <PageHeader title="Notifications" subtitle="In-app inbox, history, and (Admin) templates & channel integrations" />

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", padding: "8px 12px", background: "#fffbeb", border: "1px dashed #d97706", borderRadius: "var(--radius-sm)", width: "fit-content" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#d97706" }}>VIEWING AS</span>
          {["Employee", "Admin"].map((r) => (
            <button key={r} onClick={() => { setRole(r); setTab("inbox"); }}
              style={{ padding: "4px 10px", fontSize: "12px", fontWeight: 600, borderRadius: "99px", cursor: "pointer", border: role === r ? "1px solid var(--primary)" : "1px solid var(--border)", background: role === r ? "var(--primary)" : "var(--card)", color: role === r ? "#fff" : "var(--text)" }}>
              {r}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: "1px solid var(--border)" }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: "10px 18px", background: "none", border: "none",
                borderBottom: tab === t.id ? "2px solid var(--primary)" : "2px solid transparent",
                color: tab === t.id ? "var(--primary)" : "var(--subtext)",
                fontWeight: tab === t.id ? 700 : 500, fontSize: "13.5px", cursor: "pointer", marginBottom: "-1px",
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "templates" && <DispatchResultPanel result={dispatchResult} onClose={() => setDispatchResult(null)} />}

        {tab === "inbox" && <InboxTab />}
        {tab === "history" && <HistoryTab />}
        {tab === "templates" && <TemplatesTab onDispatchResult={setDispatchResult} />}
        {tab === "channels" && <ChannelsTab />}
      </div>
    </MainLayout>
  );
}