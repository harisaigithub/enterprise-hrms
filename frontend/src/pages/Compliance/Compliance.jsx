/**
 * Compliance Page � Module 24
 * Tabs: Dashboard � Calendar & Filings � Compliance Cases � Retention & Audit
 */

import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  CalendarClock,
  ShieldAlert,
  Archive,
  Plus,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  FlaskConical,
  Search,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import {
  getObligations,
  addObligation,
  markObligationFiled,
  getCaseSummaries,
  getCaseDetail,
  applyCaseLegalHold,
  clearCaseLegalHold,
  runCaseAccessSelfTest,
  getRetentionRecords,
  applyRecordLegalHold,
  clearRecordLegalHold,
  runRetentionJob,
  queryAuditFeed,
  getComplianceAuditLog,
  getDashboardSummary,
} from "../../services/complianceService";
import { OBLIGATION_CATEGORIES, obligationStatusMeta, caseStatusMeta, severityMeta, complianceActors } from "../../mock/compliance";

const fmtDate = (d) => (d ? new Date(d.slice(0, 10) + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "�");
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "�");

/* ---------------------------------- shared bits ---------------------------------- */

const cardStyle = {
  background: "var(--card)",
  borderRadius: "var(--radius-lg)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-sm)",
};

function inputStyle() {
  return {
    width: "100%", padding: "9px 12px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)", fontSize: "13.5px", color: "var(--text)",
    outline: "none", background: "var(--card)", fontFamily: "inherit",
  };
}

function fieldLabel(text) {
  return <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>{text}</label>;
}

function PrimaryButton({ children, ...props }) {
  return (
    <button {...props} style={{
      display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px",
      background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)",
      fontWeight: 600, fontSize: "13px", cursor: props.disabled ? "not-allowed" : "pointer",
      opacity: props.disabled ? 0.6 : 1, ...props.style,
    }}>
      {children}
    </button>
  );
}

function SecondaryButton({ children, ...props }) {
  return (
    <button {...props} style={{
      padding: "9px 16px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
      background: "none", color: "var(--label)", fontWeight: 600, fontSize: "13px", cursor: "pointer", ...props.style,
    }}>
      {children}
    </button>
  );
}

function TabNav({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--border)", marginBottom: "22px", overflowX: "auto" }}>
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button key={t.key} onClick={() => onChange(t.key)} style={{
            display: "flex", alignItems: "center", gap: "7px", padding: "10px 16px",
            border: "none", borderBottom: isActive ? "2px solid var(--primary)" : "2px solid transparent",
            background: "none", color: isActive ? "var(--primary)" : "var(--subtext)",
            fontWeight: 600, fontSize: "13.5px", cursor: "pointer", whiteSpace: "nowrap",
          }}>
            <t.icon size={15} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function ActorSelector({ actorId, onChange }) {
  const actor = complianceActors.find((a) => a.id === actorId);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
      <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Viewing as:</label>
      <select value={actorId} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle(), width: "auto", height: "34px", cursor: "pointer" }}>
        {complianceActors.map((a) => <option key={a.id} value={a.id}>{a.name} � {a.role}</option>)}
      </select>
      {actor?.role === "Auditor" && <span style={{ fontSize: "11px", color: "var(--subtext)", fontStyle: "italic" }}>Read-only visibility</span>}
    </div>
  );
}

/* ---------------------------------- Dashboard tab ---------------------------------- */

function DashboardTab({ summary }) {
  const cards = [
    { label: "Overdue Statutory Filings / Reviews", value: summary.overdueObligations, color: "var(--red)" },
    { label: "Open Compliance Cases", value: summary.openCases, color: "#d97706" },
    { label: "Active Legal Holds", value: summary.legalHoldsActive, color: "#7c3aed" },
    { label: "Records Needing Classification Review", value: summary.needsClassificationReview, color: "#0284c7" },
  ];
  return (
    <div>
      <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>Compliance Alerts</h2>
      <p style={{ fontSize: "12px", color: "var(--subtext)", marginBottom: "16px" }}>Feeds the HR Dashboard's Compliance Alerts widget � counts only, no case detail exposed here.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" }}>
        {cards.map((c) => (
          <div key={c.label} style={{ ...cardStyle, padding: "18px 20px" }}>
            <p style={{ fontSize: "28px", fontWeight: 700, color: c.color }}>{c.value}</p>
            <p style={{ fontSize: "12.5px", color: "var(--subtext)" }}>{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- Calendar & Filings tab ---------------------------------- */

function AddObligationModal({ isOpen, onClose, onSaved, by }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(OBLIGATION_CATEGORIES[0]);
  const [dueDate, setDueDate] = useState("");
  const [owner, setOwner] = useState("Neha Kapoor");
  const [recurring, setRecurring] = useState("Monthly");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;
    setSaving(true);
    const res = await addObligation({ title: title.trim(), category, dueDate, owner, recurring }, by);
    setSaving(false);
    onSaved(res.data);
    onClose();
    setTitle(""); setDueDate("");
  };

  return (
    <Modal isOpen={isOpen} title="Add Compliance Obligation" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Title *")}
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle()} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Category *")}
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle(), height: "38px", cursor: "pointer" }}>
              {OBLIGATION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Recurrence")}
            <select value={recurring} onChange={(e) => setRecurring(e.target.value)} style={{ ...inputStyle(), height: "38px", cursor: "pointer" }}>
              <option>Monthly</option><option>Quarterly</option><option>Annual</option><option>One-off</option>
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Due Date *")}
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle()} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Owner")}
            <input value={owner} onChange={(e) => setOwner(e.target.value)} style={inputStyle()} />
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Adding�" : "Add Obligation"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function CalendarFilingsTab({ obligations, onObligationAdded, onObligationUpdated, actorName, readOnly }) {
  const [showAdd, setShowAdd] = useState(false);

  const handleMarkFiled = async (id) => {
    const res = await markObligationFiled(id, actorName);
    if (res.data.obligation) onObligationUpdated(res.data.obligation);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Compliance Calendar & Filings</h2>
        {!readOnly && <PrimaryButton onClick={() => setShowAdd(true)}><Plus size={16} /> Add Obligation</PrimaryButton>}
      </div>

      {obligations.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No obligations tracked yet" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {obligations.map((o) => {
            const meta = obligationStatusMeta[o.status];
            return (
              <div key={o.id} style={{ ...cardStyle, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)" }}>{o.title}</p>
                  <p style={{ fontSize: "12px", color: "var(--subtext)" }}>{o.category} � due {fmtDate(o.dueDate)} � owner {o.owner} � {o.recurring}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <StatusBadge label={o.status} color={meta.color} bg={meta.bg} />
                  {!readOnly && (o.status === "Pending" || o.status === "Overdue") && (
                    <button onClick={() => handleMarkFiled(o.id)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>
                      Mark Filed
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddObligationModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSaved={onObligationAdded} by={actorName} />
    </div>
  );
}

/* ---------------------------------- Compliance Cases tab ---------------------------------- */

function LegalHoldModal({ isOpen, onClose, target, onApplied, actorId }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await applyCaseLegalHold(target.id, reason.trim(), actorId);
    setSaving(false);
    if (res.data.error) {
      setError(res.data.error);
      return;
    }
    setError("");
    onApplied(res.data.case);
    onClose();
    setReason("");
  };

  if (!target) return null;

  return (
    <Modal isOpen={isOpen} title={`Apply Legal Hold � ${target.caseNumber}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <p style={{ fontSize: "11.5px", color: "var(--subtext)", margin: 0 }}>This override is itself audit-logged with the reason and authorizing user.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Reason *")}
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...inputStyle(), resize: "vertical" }} />
        </div>
        {error && <p style={{ fontSize: "12px", color: "var(--red)" }}>{error}</p>}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Applying�" : "Apply Legal Hold"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function CaseDetailPanel({ caseId, actorId, onClose, onUpdated }) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [showHoldModal, setShowHoldModal] = useState(false);

  const load = () => {
    setState((s) => ({ ...s, loading: true }));
    getCaseDetail(caseId, actorId).then((res) => {
      if (res.data.error) setState({ loading: false, error: res.data.error, data: null });
      else setState({ loading: false, error: null, data: res.data.case });
    });
  };

  useEffect(load, [caseId, actorId]);

  const handleClearHold = async () => {
    const res = await clearCaseLegalHold(caseId, actorId);
    if (res.data.case) {
      setState((s) => ({ ...s, data: res.data.case }));
      onUpdated();
    }
  };

  if (state.loading) return <div style={{ ...cardStyle, padding: "18px" }}><Spinner /></div>;

  if (state.error) {
    return (
      <div style={{ ...cardStyle, padding: "18px 20px", background: "#fef2f2", border: "1px solid #fecaca" }}>
        <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--red)", display: "flex", alignItems: "center", gap: "6px" }}>
          <ShieldAlert size={15} /> Access Denied
        </p>
        <p style={{ fontSize: "12.5px", color: "#991b1b", marginTop: "6px" }}>{state.error}</p>
        <SecondaryButton onClick={onClose} style={{ marginTop: "10px", padding: "6px 12px", fontSize: "12px" }}>Close</SecondaryButton>
      </div>
    );
  }

  const kase = state.data;
  const meta = caseStatusMeta[kase.status];

  return (
    <div style={{ ...cardStyle, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text)" }}>{kase.caseNumber}</h3>
        <StatusBadge label={kase.status} color={meta.color} bg={meta.bg} />
      </div>
      <p style={{ fontSize: "12.5px", color: "var(--subtext)", marginBottom: "10px" }}>{kase.summary}</p>
      <p style={{ fontSize: "12px", color: "var(--text)" }}>Investigators: {kase.investigatorIds.join(", ")}</p>
      <p style={{ fontSize: "12px", color: "var(--text)" }}>Opened {fmtDate(kase.openedAt)}{kase.closedAt ? ` � Closed ${fmtDate(kase.closedAt)}` : ""}</p>
      <p style={{ fontSize: "12px", color: "var(--text)", marginBottom: "10px" }}>Retention until {fmtDate(kase.retentionUntil)}</p>

      {kase.legalHold ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f5f3ff", padding: "8px 12px", borderRadius: "var(--radius-sm)" }}>
          <p style={{ fontSize: "12px", color: "#7c3aed" }}>
            <Lock size={12} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
            Legal hold active � "{kase.legalHoldReason}" ({kase.legalHoldBy})
          </p>
          <button onClick={handleClearHold} style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>Clear</button>
        </div>
      ) : (
        <button onClick={() => setShowHoldModal(true)} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>
          <Unlock size={13} /> Apply Legal Hold
        </button>
      )}

      <div style={{ marginTop: "12px" }}>
        <SecondaryButton onClick={onClose} style={{ padding: "6px 12px", fontSize: "12px" }}>Close</SecondaryButton>
      </div>

      <LegalHoldModal isOpen={showHoldModal} onClose={() => setShowHoldModal(false)} target={kase} actorId={actorId} onApplied={(c) => { setState((s) => ({ ...s, data: c })); onUpdated(); }} />
    </div>
  );
}

function SelfTestPanel() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const handleRun = async () => {
    setRunning(true);
    const res = await runCaseAccessSelfTest();
    setRunning(false);
    setResult(res.data);
  };

  return (
    <div style={{ ...cardStyle, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: "6px" }}>
          <FlaskConical size={14} /> Access Control Self-Test
        </h3>
        <SecondaryButton onClick={handleRun} disabled={running} style={{ padding: "6px 12px", fontSize: "12px" }}>{running ? "Running�" : "Run Test"}</SecondaryButton>
      </div>
      <p style={{ fontSize: "11.5px", color: "var(--subtext)", marginBottom: result ? "10px" : 0 }}>
        Exercises the case-access check directly (the service layer, not the UI) against several actor IDs.
      </p>
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <p style={{ fontSize: "12.5px", fontWeight: 700, color: result.allPass ? "var(--green)" : "var(--red)" }}>
            {result.allPass ? "? All checks passed" : "? Some checks failed"}
          </p>
          {result.results.map((r, i) => (
            <p key={i} style={{ fontSize: "12px", color: "var(--subtext)", display: "flex", alignItems: "center", gap: "6px" }}>
              {r.pass ? <CheckCircle2 size={13} style={{ color: "var(--green)" }} /> : <XCircle size={13} style={{ color: "var(--red)" }} />}
              {r.test}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ComplianceCasesTab({ caseSummaries, actorId, onCaseUpdated }) {
  const [openCaseId, setOpenCaseId] = useState(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <SelfTestPanel />

      <div>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>Compliance Cases</h2>
        <p style={{ fontSize: "12px", color: "var(--subtext)", marginBottom: "14px" }}>
          Status and legal-hold flag only � full case detail requires being a named investigator, checked server-side.
        </p>
        {caseSummaries.length === 0 ? (
          <EmptyState icon={ShieldAlert} title="No compliance cases" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {caseSummaries.map((c) => {
              const meta = caseStatusMeta[c.status];
              return (
                <div key={c.id}>
                  <div style={{ ...cardStyle, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)" }}>{c.caseNumber} � {c.category}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {c.legalHold && <Lock size={14} style={{ color: "#7c3aed" }} />}
                      <StatusBadge label={c.status} color={meta.color} bg={meta.bg} />
                      <button onClick={() => setOpenCaseId(openCaseId === c.id ? null : c.id)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>
                        {openCaseId === c.id ? "Hide" : "Open Case File"}
                      </button>
                    </div>
                  </div>
                  {openCaseId === c.id && (
                    <div style={{ marginTop: "8px" }}>
                      <CaseDetailPanel caseId={c.id} actorId={actorId} onClose={() => setOpenCaseId(null)} onUpdated={onCaseUpdated} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------- Retention & Audit tab ---------------------------------- */

function RecordLegalHoldModal({ isOpen, onClose, record, onSaved, by }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSaving(true);
    const res = await applyRecordLegalHold(record.id, reason.trim(), by);
    setSaving(false);
    onSaved(res.data.record);
    onClose();
    setReason("");
  };

  if (!record) return null;

  return (
    <Modal isOpen={isOpen} title={`Apply Legal Hold � ${record.label}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Reason *")}
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...inputStyle(), resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Applying�" : "Apply Hold"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function RetentionTab({ records, onRecordUpdated, actorName, readOnly }) {
  const [holdTarget, setHoldTarget] = useState(null);
  const [running, setRunning] = useState(false);
  const [jobResult, setJobResult] = useState(null);

  const handleClearHold = async (recordId) => {
    const res = await clearRecordLegalHold(recordId, actorName);
    if (res.data.record) onRecordUpdated(res.data.record);
  };

  const handleRunJob = async () => {
    setRunning(true);
    const res = await runRetentionJob(actorName);
    setRunning(false);
    setJobResult(res.data);
    const updated = await getRetentionRecords();
    updated.data.forEach(onRecordUpdated);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Retention & Purge</h2>
        {!readOnly && <PrimaryButton onClick={handleRunJob} disabled={running}><Archive size={15} /> {running ? "Running�" : "Run Retention Job"}</PrimaryButton>}
      </div>

      {jobResult && (
        <div style={{ ...cardStyle, padding: "12px 16px", marginBottom: "14px" }}>
          <p style={{ fontSize: "12.5px", color: "var(--text)" }}>
            {jobResult.purged.length} purged � {jobResult.blockedByHold.length} blocked by legal hold � {jobResult.needsReview.length} flagged for manual review � {jobResult.notDue.length} not yet due
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {records.map((r) => (
          <div key={r.id} style={{ ...cardStyle, padding: "14px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>{r.label}</p>
                <p style={{ fontSize: "12px", color: "var(--subtext)" }}>{r.sourceModule} � {r.recordType} � expires {fmtDate(r.retentionExpiresAt)}</p>
                <p style={{ fontSize: "11px", color: r.classification === "Unclassified" ? "#d97706" : "var(--subtext)" }}>
                  Classification: {r.classification}{r.jobStatus ? ` � Last job result: ${r.jobStatus}` : ""}
                </p>
              </div>
              {!readOnly && (
                r.legalHold ? (
                  <button onClick={() => handleClearHold(r.id)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>Clear Legal Hold</button>
                ) : (
                  <button onClick={() => setHoldTarget(r)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--subtext)", border: "none", background: "none", cursor: "pointer" }}>Apply Legal Hold</button>
                )
              )}
            </div>
            {r.legalHold && (
              <p style={{ fontSize: "11.5px", color: "#7c3aed", marginTop: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
                <Lock size={12} /> Legal hold � "{r.legalHoldReason}" ({r.legalHoldBy})
              </p>
            )}
          </div>
        ))}
      </div>

      <RecordLegalHoldModal isOpen={!!holdTarget} onClose={() => setHoldTarget(null)} record={holdTarget} onSaved={onRecordUpdated} by={actorName} />
    </div>
  );
}

function AuditFeedTab() {
  const [moduleFilter, setModuleFilter] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [results, setResults] = useState([]);
  const [complianceLog, setComplianceLog] = useState([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    getComplianceAuditLog().then((res) => setComplianceLog(res.data));
  }, []);

  const handleSearch = async () => {
    const res = await queryAuditFeed({ moduleFilter, fieldFilter, fromDate, toDate });
    setResults(res.data);
    setSearched(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>Cross-Module Audit Trail</h2>
        <p style={{ fontSize: "12px", color: "var(--subtext)", marginBottom: "14px" }}>
          Shows that a change occurred and by whom � never the underlying sensitive value, unless a separately granted reveal permission applies.
        </p>
        <div style={{ ...cardStyle, padding: "14px 18px", marginBottom: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: "10px", alignItems: "end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {fieldLabel("Module")}
              <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} style={{ ...inputStyle(), height: "36px", cursor: "pointer" }}>
                <option value="">All</option>
                <option value="Module 2 � Employee Master">Module 2 � Employee Master</option>
                <option value="Module 25 � Security">Module 25 � Security</option>
                <option value="Module 7 � Payroll">Module 7 � Payroll</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {fieldLabel("Field")}
              <select value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value)} style={{ ...inputStyle(), height: "36px", cursor: "pointer" }}>
                <option value="">All</option>
                <option value="Bank Account Number">Bank Account Number</option>
                <option value="Role Permission">Role Permission</option>
                <option value="Salary Structure">Salary Structure</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {fieldLabel("From")}
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ ...inputStyle(), height: "36px" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {fieldLabel("To")}
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ ...inputStyle(), height: "36px" }} />
            </div>
            <PrimaryButton onClick={handleSearch} style={{ height: "36px", padding: "0 14px" }}><Search size={14} /> Search</PrimaryButton>
          </div>
        </div>

        {searched && (
          results.length === 0 ? (
            <EmptyState icon={Search} title="No matching audit entries" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {results.map((r) => (
                <div key={r.id} style={{ ...cardStyle, padding: "12px 16px" }}>
                  <p style={{ fontSize: "12.5px", color: "var(--text)" }}>
                    <strong>{r.actor}</strong> {r.action.toLowerCase()} <strong>{r.field}</strong> in {r.module}
                    {r.maskedValue ? ` � new value: ${r.maskedValue}` : ""}{r.employeeRef ? ` (${r.employeeRef})` : ""}
                  </p>
                  <p style={{ fontSize: "11px", color: "var(--subtext)" }}>{fmtDateTime(r.timestamp)}</p>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <div>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "12px" }}>Compliance Module Activity Log</h2>
        {complianceLog.length === 0 ? (
          <EmptyState icon={Archive} title="No compliance actions logged yet" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {complianceLog.map((e) => {
              const meta = severityMeta[e.severity];
              return (
                <div key={e.id} style={{ ...cardStyle, padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "4px" }}>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>{e.action}</p>
                    <StatusBadge label={e.severity} color={meta.color} bg={meta.bg} />
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--subtext)" }}>{e.details}</p>
                  <p style={{ fontSize: "11px", color: "var(--subtext)", marginTop: "4px" }}>{e.actor} � {e.category} � {fmtDateTime(e.timestamp)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "calendar", label: "Calendar & Filings", icon: CalendarClock },
  { key: "cases", label: "Compliance Cases", icon: ShieldAlert },
  { key: "retention", label: "Retention & Audit", icon: Archive },
];

export default function Compliance() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [actorId, setActorId] = useState("EMP007"); // default: Neha Kapoor, HR-Compliance
  const [obligations, setObligations] = useState([]);
  const [caseSummaries, setCaseSummaries] = useState([]);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ overdueObligations: 0, openCases: 0, legalHoldsActive: 0, needsClassificationReview: 0 });

  const actor = complianceActors.find((a) => a.id === actorId);
  const readOnly = actor?.role === "Auditor";
  const actorName = actor?.name || "Unknown";

  const refreshDashboard = () => getDashboardSummary().then((res) => setSummary(res.data));

  useEffect(() => {
    setLoading(true);
    Promise.all([getObligations(), getCaseSummaries(), getRetentionRecords(), getDashboardSummary()])
      .then(([o, c, r, s]) => {
        setObligations(o.data); setCaseSummaries(c.data); setRecords(r.data); setSummary(s.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleObligationAdded = (o) => {
    setObligations((prev) => [o, ...prev]);
    refreshDashboard();
  };
  const handleObligationUpdated = (o) => {
    setObligations((prev) => prev.map((x) => (x.id === o.id ? o : x)));
    refreshDashboard();
  };
  const handleCaseUpdated = () => {
    getCaseSummaries().then((res) => setCaseSummaries(res.data));
    refreshDashboard();
  };
  const handleRecordUpdated = (r) => {
    setRecords((prev) => prev.map((x) => (x.id === r.id ? r : x)));
    refreshDashboard();
  };

  if (loading) {
    return (
      <MainLayout>
        <Spinner />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <PageHeader title="Compliance" subtitle="Statutory obligations, workplace-conduct case management, retention, and audit trails" />
        <ActorSelector actorId={actorId} onChange={setActorId} />
        <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {activeTab === "dashboard" && <DashboardTab summary={summary} />}

        {activeTab === "calendar" && (
          <CalendarFilingsTab obligations={obligations} onObligationAdded={handleObligationAdded} onObligationUpdated={handleObligationUpdated} actorName={actorName} readOnly={readOnly} />
        )}

        {activeTab === "cases" && (
          <ComplianceCasesTab caseSummaries={caseSummaries} actorId={actorId} onCaseUpdated={handleCaseUpdated} />
        )}

        {activeTab === "retention" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            <RetentionTab records={records} onRecordUpdated={handleRecordUpdated} actorName={actorName} readOnly={readOnly} />
            <AuditFeedTab />
          </div>
        )}
      </div>
    </MainLayout>
  );
}