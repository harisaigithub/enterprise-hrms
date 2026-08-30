import { useCallback, useEffect, useState } from "react";
import { Archive, CalendarClock, CheckCircle2, LayoutDashboard, Lock, Plus, Search, ShieldAlert, Unlock } from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import { useAuth } from "../../context/AuthContext";
import {
  addObligation, applyCaseLegalHold, applyRecordLegalHold, clearCaseLegalHold,
  clearRecordLegalHold, getCaseDetail, getCaseSummaries, getComplianceAuditLog,
  getDashboardSummary, getObligations, getRetentionRecords, markObligationFiled,
  queryAuditFeed, runRetentionJob,
} from "../../services/Complianceservice";

const CATEGORIES = ["PF Filing", "ESI Filing", "TDS Filing", "POSH Training Review", "Policy Acknowledgement Review", "Other Statutory"];
const statusMeta = {
  Pending: { color: "#0284c7", bg: "#f0f9ff" }, Overdue: { color: "#dc2626", bg: "#fef2f2" },
  Filed: { color: "#16a34a", bg: "#f0fdf4" }, Completed: { color: "#16a34a", bg: "#f0fdf4" },
  "Under Investigation": { color: "#d97706", bg: "#fffbeb" }, "Closed - Resolved": { color: "#16a34a", bg: "#f0fdf4" },
};
const card = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)" };
const input = { width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--card)", color: "var(--text)", fontFamily: "inherit" };
const fmtDate = (value) => value ? new Date(String(value).slice(0, 10) + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
const errorText = (error) => error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || "Something went wrong";

function Button({ children, secondary, ...props }) {
  return <button {...props} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: "var(--radius-sm)", border: secondary ? "1px solid var(--border)" : "none", background: secondary ? "var(--card)" : "var(--primary)", color: secondary ? "var(--label)" : "#fff", fontWeight: 700, fontSize: 12.5, cursor: props.disabled ? "not-allowed" : "pointer", opacity: props.disabled ? .6 : 1 }}>{children}</button>;
}

function Tabs({ active, onChange }) {
  const tabs = [["dashboard", "Dashboard", LayoutDashboard], ["calendar", "Calendar & Filings", CalendarClock], ["cases", "Restricted Cases", ShieldAlert], ["retention", "Retention & Audit", Archive]];
  return <div style={{ display: "flex", overflowX: "auto", borderBottom: "1px solid var(--border)", marginBottom: 22 }}>{tabs.map(([key, label, Icon]) => <button key={key} onClick={() => onChange(key)} style={{ display: "flex", gap: 7, alignItems: "center", padding: "10px 16px", border: "none", borderBottom: active === key ? "2px solid var(--primary)" : "2px solid transparent", background: "none", color: active === key ? "var(--primary)" : "var(--subtext)", fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer" }}><Icon size={15} />{label}</button>)}</div>;
}

function Dashboard({ summary }) {
  const items = [["Overdue filings", summary.overdueObligations, "#dc2626"], ["Open restricted cases", summary.openCases, "#d97706"], ["Active legal holds", summary.legalHoldsActive, "#7c3aed"], ["Classification reviews", summary.needsClassificationReview, "#0284c7"]];
  return <div><h2 style={{ fontSize: 14, marginBottom: 14 }}>Compliance alerts</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>{items.map(([label, value, color]) => <div key={label} style={{ ...card, padding: 18 }}><p style={{ fontSize: 28, fontWeight: 800, color }}>{value}</p><p style={{ color: "var(--subtext)", fontSize: 12.5 }}>{label}</p></div>)}</div></div>;
}

function ObligationModal({ open, close, saved, user }) {
  const [form, setForm] = useState({ title: "", category: CATEGORIES[0], dueDate: "", owner: user?.name || "Sunita Reddy", recurring: "Monthly" });
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const submit = async (event) => { event.preventDefault(); setSaving(true); setError(""); try { const res = await addObligation(form); saved(res.data); close(); } catch (e) { setError(errorText(e)); } finally { setSaving(false); } };
  return <Modal isOpen={open} title="Add compliance obligation" onClose={close}><form onSubmit={submit} style={{ display: "grid", gap: 14 }}><label>Title *<input required minLength={3} style={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><label>Category<select style={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((x) => <option key={x}>{x}</option>)}</select></label><label>Recurrence<select style={input} value={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.value })}>{["Monthly", "Quarterly", "Annual", "One-off"].map((x) => <option key={x}>{x}</option>)}</select></label></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><label>Due date *<input required type="date" style={input} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label><label>Owner *<input required style={input} value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></label></div>{error && <p style={{ color: "var(--red)", fontSize: 12 }}>{error}</p>}<div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Button type="button" secondary onClick={close}>Cancel</Button><Button disabled={saving}>{saving ? "Saving..." : "Add obligation"}</Button></div></form></Modal>;
}

function Calendar({ rows, refresh, user }) {
  const [open, setOpen] = useState(false); const [error, setError] = useState("");
  const filed = async (id) => { try { await markObligationFiled(id); refresh(); } catch (e) { setError(errorText(e)); } };
  return <div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><h2 style={{ fontSize: 14 }}>Statutory calendar</h2><Button onClick={() => setOpen(true)}><Plus size={15} /> Add obligation</Button></div>{error && <p style={{ color: "var(--red)", marginBottom: 10 }}>{error}</p>}<div style={{ display: "grid", gap: 10 }}>{rows.map((row) => { const meta = statusMeta[row.status] || statusMeta.Pending; return <div key={row.id} style={{ ...card, padding: 15, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><strong>{row.title}</strong><p style={{ fontSize: 12, color: "var(--subtext)", marginTop: 4 }}>{row.category} | due {fmtDate(row.dueDate)} | {row.owner} | {row.recurrence}</p></div><div style={{ display: "flex", alignItems: "center", gap: 10 }}><StatusBadge label={row.status} color={meta.color} bg={meta.bg} />{["Pending", "Overdue"].includes(row.status) && <button onClick={() => filed(row.id)} style={{ border: 0, background: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}>Mark filed</button>}</div></div>; })}</div><ObligationModal open={open} close={() => setOpen(false)} user={user} saved={() => { setOpen(false); refresh(); }} /></div>;
}

function HoldModal({ target, close, save }) {
  const [reason, setReason] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const submit = async (e) => { e.preventDefault(); setSaving(true); try { await save(reason); close(); } catch (err) { setError(errorText(err)); } finally { setSaving(false); } };
  return <Modal isOpen={!!target} title="Apply legal hold" onClose={close}><form onSubmit={submit} style={{ display: "grid", gap: 12 }}><p style={{ color: "var(--subtext)", fontSize: 12 }}>A reason is mandatory and this action is audit logged.</p><textarea required minLength={3} rows={4} style={input} value={reason} onChange={(e) => setReason(e.target.value)} />{error && <p style={{ color: "var(--red)" }}>{error}</p>}<div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Button type="button" secondary onClick={close}>Cancel</Button><Button disabled={saving}>{saving ? "Applying..." : "Apply hold"}</Button></div></form></Modal>;
}

function Cases({ rows, refresh }) {
  const [detail, setDetail] = useState(null); const [loadingId, setLoadingId] = useState(null); const [error, setError] = useState(""); const [holdTarget, setHoldTarget] = useState(null);
  const open = async (id) => { setLoadingId(id); setError(""); try { const res = await getCaseDetail(id); setDetail(res.data.case); } catch (e) { setError(errorText(e)); } finally { setLoadingId(null); } };
  const clear = async () => { await clearCaseLegalHold(detail.id); setDetail((await getCaseDetail(detail.id)).data.case); refresh(); };
  return <div><h2 style={{ fontSize: 14 }}>Confidential compliance cases</h2><p style={{ color: "var(--subtext)", fontSize: 12, margin: "5px 0 14px" }}>Case summaries are visible to HR/Admin; detail is restricted server-side to named investigators and Admin.</p>{error && <p style={{ color: "var(--red)", marginBottom: 10 }}>{error}</p>}<div style={{ display: "grid", gap: 10 }}>{rows.map((row) => <div key={row.id} style={{ ...card, padding: 15 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><div><strong>{row.caseNumber}</strong><p style={{ color: "var(--subtext)", fontSize: 12 }}>{row.category}</p></div><div style={{ display: "flex", gap: 9, alignItems: "center" }}>{row.legalHold && <Lock size={14} color="#7c3aed" />}<StatusBadge label={row.status} color="#d97706" bg="#fffbeb" /><button onClick={() => open(row.id)} style={{ border: 0, background: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}>{loadingId === row.id ? "Opening..." : "Open case"}</button></div></div>{detail?.id === row.id && <div style={{ marginTop: 12, padding: 14, background: "var(--surface)", borderRadius: 8 }}><p>{detail.summary}</p><p style={{ fontSize: 12, marginTop: 8 }}>Investigators: {detail.investigators.map((x) => x.name).join(", ")}</p><p style={{ fontSize: 12 }}>Opened {fmtDate(detail.openedAt)} | retain until {fmtDate(detail.retentionUntil)}</p>{detail.legalHold ? <div style={{ marginTop: 9 }}><p style={{ color: "#7c3aed", fontSize: 12 }}><Lock size={12} /> Hold: {detail.legalHoldReason} ({detail.legalHoldBy})</p><Button secondary onClick={clear}>Clear hold</Button></div> : <Button secondary onClick={() => setHoldTarget(detail)}><Unlock size={13} /> Apply legal hold</Button>}</div>}</div>)}</div><HoldModal target={holdTarget} close={() => setHoldTarget(null)} save={async (reason) => { await applyCaseLegalHold(holdTarget.id, reason); setHoldTarget(null); setDetail((await getCaseDetail(holdTarget.id)).data.case); refresh(); }} /></div>;
}

function Retention({ rows, refresh }) {
  const [target, setTarget] = useState(null); const [result, setResult] = useState(null); const [running, setRunning] = useState(false); const [audit, setAudit] = useState([]); const [activities, setActivities] = useState([]); const [error, setError] = useState("");
  const loadAudit = useCallback(async () => { try { const [a, b] = await Promise.all([queryAuditFeed({}), getComplianceAuditLog()]); setAudit(a.data); setActivities(b.data); } catch (e) { setError(errorText(e)); } }, []);
  // The async loader synchronizes this tab with the backend when mounted.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadAudit(); }, [loadAudit]);
  const run = async () => { setRunning(true); try { setResult((await runRetentionJob()).data); await refresh(); await loadAudit(); } catch (e) { setError(errorText(e)); } finally { setRunning(false); } };
  const clear = async (id) => { await clearRecordLegalHold(id); refresh(); loadAudit(); };
  return <div style={{ display: "grid", gap: 25 }}><section><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><h2 style={{ fontSize: 14 }}>Retention and legal hold</h2><Button onClick={run} disabled={running}><Archive size={14} />{running ? "Running..." : "Run retention job"}</Button></div>{error && <p style={{ color: "var(--red)" }}>{error}</p>}{result && <p style={{ ...card, padding: 12, marginBottom: 12, fontSize: 12 }}>{result.purged.length} purged | {result.blockedByHold.length} blocked | {result.needsReview.length} need review | {result.notDue.length} not due</p>}<div style={{ display: "grid", gap: 9 }}>{rows.map((row) => <div key={row.id} style={{ ...card, padding: 14, display: "flex", justifyContent: "space-between", gap: 10 }}><div><strong>{row.label}</strong><p style={{ color: "var(--subtext)", fontSize: 12 }}>{row.sourceModule} | expires {fmtDate(row.retentionExpiresAt)} | {row.classification}</p>{row.jobStatus && <p style={{ fontSize: 11.5 }}>Last result: {row.jobStatus}</p>}{row.legalHold && <p style={{ color: "#7c3aed", fontSize: 11.5 }}>Legal hold: {row.legalHoldReason} ({row.legalHoldBy})</p>}</div>{row.legalHold ? <Button secondary onClick={() => clear(row.id)}>Clear hold</Button> : <Button secondary onClick={() => setTarget(row)}>Apply hold</Button>}</div>)}</div></section><section><h2 style={{ fontSize: 14, marginBottom: 10 }}><Search size={14} /> Cross-module audit trail</h2>{audit.length ? audit.slice(0, 15).map((x) => <div key={x.id} style={{ ...card, padding: 11, marginBottom: 7, fontSize: 12 }}><strong>{x.actor}</strong> {x.action.toLowerCase()} {x.module}<p style={{ color: "var(--subtext)", fontSize: 11 }}>{new Date(x.timestamp).toLocaleString("en-IN")}</p></div>) : <EmptyState icon={Search} title="No audit records yet" />}</section><section><h2 style={{ fontSize: 14, marginBottom: 10 }}>Compliance activity</h2>{activities.length ? activities.map((x) => <div key={x.id} style={{ ...card, padding: 11, marginBottom: 7, fontSize: 12 }}><strong>{x.action}</strong><p>{x.details}</p><p style={{ color: "var(--subtext)", fontSize: 11 }}>{x.actorName} | {new Date(x.timestamp).toLocaleString("en-IN")}</p></div>) : <EmptyState icon={CheckCircle2} title="No compliance activity yet" />}</section><HoldModal target={target} close={() => setTarget(null)} save={async (reason) => { await applyRecordLegalHold(target.id, reason); setTarget(null); refresh(); loadAudit(); }} /></div>;
}

export default function Compliance() {
  const { user, role } = useAuth(); const [tab, setTab] = useState("dashboard"); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [summary, setSummary] = useState({ overdueObligations: 0, openCases: 0, legalHoldsActive: 0, needsClassificationReview: 0 }); const [obligations, setObligations] = useState([]); const [cases, setCases] = useState([]); const [records, setRecords] = useState([]);
  const load = useCallback(async () => { setError(""); try { const [s, o, c, r] = await Promise.all([getDashboardSummary(), getObligations(), getCaseSummaries(), getRetentionRecords()]); setSummary(s.data); setObligations(o.data); setCases(c.data); setRecords(r.data); } catch (e) { setError(errorText(e)); } finally { setLoading(false); } }, []);
  // The async loader synchronizes the module with the backend when mounted.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  if (loading) return <MainLayout><Spinner /></MainLayout>;
  if (!["HR", "ADMIN"].includes(role)) return <MainLayout><EmptyState icon={ShieldAlert} title="Compliance access is restricted to HR and Admin" /></MainLayout>;
  return <MainLayout><div style={{ maxWidth: 1480, margin: "0 auto" }}><PageHeader title="Compliance" subtitle="Statutory obligations, confidential cases, retention and audit controls" />{error && <p style={{ ...card, padding: 12, color: "var(--red)", marginBottom: 12 }}>{error}</p>}<Tabs active={tab} onChange={setTab} />{tab === "dashboard" && <Dashboard summary={summary} />}{tab === "calendar" && <Calendar rows={obligations} refresh={load} user={user} />}{tab === "cases" && <Cases rows={cases} refresh={load} />}{tab === "retention" && <Retention rows={records} refresh={load} />}</div></MainLayout>;
}
