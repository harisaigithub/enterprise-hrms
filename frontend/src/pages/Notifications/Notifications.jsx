import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, History, Mail, Plus, Send, Settings2, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import StatusBadge from "../../components/shared/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import {
  dispatchTestNotification, getInboxNotifications, getMergeFieldCatalog,
  getNotificationHistory, getTemplates, getUserPreferences, markAllRead,
  markAsRead, saveTemplate, updateUserPreference,
} from "../../services/notificationService";
import "./Notifications.css";

const CATEGORIES = ["Leave Approved", "Leave Rejected", "Payslip Ready", "Ticket Resolved", "Policy Published", "New Device Login", "Compliance Training Due", "Expense Approved", "Onboarding Reminder"];
const fmt = (value) => new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const statusMeta = { Delivered: { color: "#15803d", bg: "#f0fdf4" }, Failed: { color: "#dc2626", bg: "#fef2f2" }, Skipped: { color: "#64748b", bg: "#f8fafc" } };

function ErrorState({ message, onRetry }) {
  return <div className="notification-error" role="alert"><p>{message}</p><button type="button" onClick={onRetry}>Try again</button></div>;
}

function InboxTab({ onUnreadChange }) {
  const navigate = useNavigate();
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
  };
  if (loading) return <Spinner />;
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
