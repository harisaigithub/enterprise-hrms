/**
 * Workflow Engine Page
 * Module 21 — Generic approval engine
 * Tabs: Instances & Approvals | Definitions | Event Log
 * Wired to the real backend via Workflowengineservice (? /api/workflow).
 *
 * Golden Rule #5 is enforced server-side: an approver can never approve their
 * own request (data anomalies auto-escalate one level up instead).
 */

import { useState, useEffect } from "react";
import { GitBranch, ListChecks, History, Plus, RefreshCw, Check, X, UserPlus } from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import { useAuth } from "../../context/AuthContext";
import {
  getRoster,
  getDefinitions,
  addDefinition,
  deactivateDefinition,
  deleteDefinition,
  getInstances,
  getEventLog,
  submitRequest,
  actOnStep,
  runSlaCheck,
  manuallyAssignApprover,
} from "../../services/Workflowengineservice";

const definitionStatusMeta = {
  Active: { color: "#16a34a", bg: "#f0fdf4" },
  Inactive: { color: "#64748b", bg: "#f1f5f9" },
};

const instanceStatusMeta = {
  "In Progress": { color: "#0284c7", bg: "#f0f9ff" },
  Approved: { color: "#16a34a", bg: "#f0fdf4" },
  Rejected: { color: "#dc2626", bg: "#fef2f2" },
  "Approver Resolution Failed": { color: "#dc2626", bg: "#fef2f2" },
};

const stepStatusMeta = {
  Pending: { color: "#d97706", bg: "#fffbeb" },
  Approved: { color: "#16a34a", bg: "#f0fdf4" },
  Rejected: { color: "#dc2626", bg: "#fef2f2" },
  Unresolved: { color: "#64748b", bg: "#f1f5f9" },
};

const APPROVER_RULES = [
  "Direct Reporting Manager",
  "Department Head",
  "Named Role: Finance",
  "Named Role: HR",
];

const TABS = [
  { key: "instances", label: "Instances & Approvals", icon: ListChecks },
  { key: "definitions", label: "Definitions", icon: GitBranch },
  { key: "events", label: "Event Log", icon: History },
];

function SectionCard({ children, style }) {
  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function TableCell({ children, style }) {
  return (
    <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)", borderBottom: "1px solid var(--border)", ...style }}>
      {children}
    </td>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(15,23,42,0.45)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "60px 16px", overflow: "auto",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
          width: "100%",
          maxWidth: "620px",
          padding: "22px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--subtext)" }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "9px 12px", fontSize: "13.5px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", boxSizing: "border-box" };
const labelStyle = { display: "block", fontSize: "12px", fontWeight: 600, color: "var(--subtext)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.4px" };
const btnPrimary = { display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "var(--radius)", background: "var(--primary)", color: "#fff", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer" };
const btnGhost = { display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "var(--radius)", background: "var(--primary-light)", color: "var(--primary)", border: "none", fontSize: "12.5px", fontWeight: 600, cursor: "pointer" };

export default function WorkflowEngine() {
  const { user, permissions } = useAuth();
  const canWrite = permissions.includes("workflows:write");

  const [activeTab, setActiveTab] = useState("instances");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);

  const [roster, setRoster] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [instances, setInstances] = useState([]);
  const [events, setEvents] = useState([]);

  const [showSubmit, setShowSubmit] = useState(false);
  const [showAddDef, setShowAddDef] = useState(false);
  const [assignFor, setAssignFor] = useState(null);

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 3500);
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([getRoster(), getDefinitions(), getInstances(), getEventLog()])
      .then(([r, d, i, e]) => {
        if (cancelled) return;
        setRoster(r.data || []);
        setDefinitions(d.data || []);
        setInstances(i.data || []);
        setEvents(e.data || []);
      })
      .catch((err) => flash(err.message || "Failed to load workflow data"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = async (part) => {
    setBusy(part);
    try {
      const [d, i, e] = await Promise.all([getDefinitions(), getInstances(), getEventLog()]);
      setDefinitions(d.data || []);
      setInstances(i.data || []);
      setEvents(e.data || []);
    } catch (err) {
      flash(err.message);
    } finally {
      setBusy(null);
    }
  };

  // -- Approver logic (mirrors backend eligibility) -------------------------
  const actionableIds = (inst) => {
    if (inst.status !== "In Progress") return new Set();
    const current = inst.steps[inst.currentStepIndex];
    if (!current) return new Set();
    return new Set(
      inst.steps
        .filter((s) => (s.parallelGroup ? s.parallelGroup === current.parallelGroup : s.stepId === current.stepId))
        .map((s) => s.stepId)
    );
  };

  const canAct = (inst, step) => {
    if (!actionableIds(inst).has(step.stepId) || step.status !== "Pending") return false;
    if (step.approverId?.startsWith("role-")) return canWrite; // named-role steps need workflows:write
    return user.id === step.approverId || user.id === step.escalatedTo;
  };

  const handleAct = async (inst, step, action) => {
    if (action === "reject" && !window.confirm(`Reject "${step.name}" for ${inst.requesterName}?`)) return;
    setBusy(step.stepId);
    try {
      await actOnStep(inst.id, user.id, `${user.firstName} ${user.lastName}`.trim(), action);
      flash(`${step.name} ${action === "approve" ? "approved" : "rejected"}`);
      await refresh("act");
    } catch (err) {
      flash(err.message || "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const handleSlaCheck = async () => {
    setBusy("sla");
    try {
      const res = await runSlaCheck();
      flash(`SLA check complete — ${res.data?.escalatedCount ?? 0} step(s) escalated`);
      await refresh("sla");
    } catch (err) {
      flash(err.message || "SLA check failed");
    } finally {
      setBusy(null);
    }
  };

  const handleAssign = async (approverId, approverName) => {
    setBusy("assign");
    try {
      await manuallyAssignApprover(assignFor.id, approverId, approverName);
      flash("Approver assigned — instance resumed");
      setAssignFor(null);
      await refresh("assign");
    } catch (err) {
      flash(err.message || "Assignment failed");
    } finally {
      setBusy(null);
    }
  };

  const handleDeactivate = async (def) => {
    if (!window.confirm(`Deactivate "${def.requestType}"?`)) return;
    setBusy(def.id);
    try {
      await deactivateDefinition(def.id);
      flash("Definition deactivated");
      await refresh("def");
    } catch (err) {
      flash(err.message);
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteDef = async (def) => {
    if (!window.confirm(`Delete "${def.requestType}"? This is permanent.`)) return;
    setBusy(def.id);
    try {
      const res = await deleteDefinition(def.id);
      if (res.data?.deleted) flash("Definition deleted");
      await refresh("def");
    } catch (err) {
      flash(err.message || "Cannot delete — active instances reference it");
    } finally {
      setBusy(null);
    }
  };

  const renderSteps = (inst) => {
    const actSet = actionableIds(inst);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {inst.steps.map((s) => (
          <div
            key={s.stepId}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              padding: "9px 12px",
              borderRadius: "var(--radius)",
              background: actSet.has(s.stepId) ? "var(--primary-light)" : "var(--bg)",
              border: actSet.has(s.stepId) ? "1px solid var(--primary)" : "1px solid var(--border)",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{s.name}</p>
              <p style={{ fontSize: "12px", color: "var(--subtext)", marginTop: "2px" }}>
                {s.approverName ?? "Unassigned"} {s.selfApprovalBlocked && <span style={{ color: "#dc2626", fontWeight: 600 }}>· self-approval blocked</span>}
                {s.escalatedToName && <span style={{ color: "#d97706", fontWeight: 600 }}> · escalated ? {s.escalatedToName}</span>}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <StatusBadge {...stepStatusMeta[s.status]} />
              {canAct(inst, s) && (
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => handleAct(inst, s, "approve")}
                    disabled={busy}
                    title="Approve"
                    style={{ ...btnGhost, padding: "5px 9px", background: "#f0fdf4", color: "#16a34a" }}
                  >
                    <Check size={13} />
                  </button>
                  <button
                    onClick={() => handleAct(inst, s, "reject")}
                    disabled={busy}
                    title="Reject"
                    style={{ ...btnGhost, padding: "5px 9px", background: "#fef2f2", color: "#dc2626" }}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderInstances = () => (
    <SectionCard>
      <div style={{ overflowX: "auto" }}>
        {instances.length === 0 ? (
          <EmptyState title="No workflow instances" subtitle="Submit a request to start an approval chain. It resolves approvers from live org data." icon={ListChecks} />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg)" }}>
                {["Request", "Requester", "Progress", "Steps & Approvals", "Status", "Created"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "11px 16px", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--border)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {instances.map((inst) => (
                <tr key={inst.id}>
                  <TableCell>
                    <p style={{ fontWeight: 600 }}>{inst.requestType}</p>
                    <p style={{ fontSize: "12px", color: "var(--subtext)", marginTop: "2px" }}>{inst.id.slice(0, 8)}</p>
                  </TableCell>
                  <TableCell>{inst.requesterName}</TableCell>
                  <TableCell style={{ minWidth: "90px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ flex: 1, minWidth: "56px", height: "6px", borderRadius: "99px", background: "var(--border)", overflow: "hidden" }}>
                        <div style={{ width: `${inst.steps.length ? Math.round((inst.currentStepIndex / inst.steps.length) * 100) : 0}%`, height: "100%", background: "var(--primary)" }} />
                      </div>
                      <span style={{ fontSize: "11.5px", color: "var(--subtext)", whiteSpace: "nowrap" }}>
                        {inst.currentStepIndex}/{inst.steps.length}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell style={{ minWidth: "260px" }}>{renderSteps(inst)}</TableCell>
                  <TableCell>
                    <StatusBadge {...instanceStatusMeta[inst.status]} />
                    {inst.resolutionFailure && (
                      <p style={{ fontSize: "11.5px", color: "#dc2626", marginTop: "6px", maxWidth: "220px", lineHeight: 1.4 }}>
                        {inst.resolutionFailure}
                      </p>
                    )}
                    {inst.status === "Approver Resolution Failed" && canWrite && (
                      <button onClick={() => setAssignFor(inst)} style={{ ...btnGhost, marginTop: "8px", background: "#fffbeb", color: "#d97706" }}>
                        <UserPlus size={13} /> Assign approver
                      </button>
                    )}
                  </TableCell>
                  <TableCell style={{ whiteSpace: "nowrap", color: "var(--subtext)" }}>
                    {new Date(inst.createdAt).toLocaleDateString("en-IN")}
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </SectionCard>
  );

  const renderDefinitions = () => (
    <SectionCard>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>
          {definitions.length} definition{definitions.length === 1 ? "" : "s"}
        </p>
        <button onClick={openAddDef} disabled={busy || !canWrite} style={btnPrimary}>
          <Plus size={14} /> Add definition
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        {definitions.length === 0 ? (
          <EmptyState title="No workflow definitions" subtitle="Create an approval template to start routing requests." icon={GitBranch} />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg)" }}>
                {["Request Type", "Approval Steps", "Status", "Created", "Actions"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "11px 16px", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--border)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {definitions.map((def) => (
                <tr key={def.id}>
                  <TableCell style={{ fontWeight: 600 }}>{def.requestType}</TableCell>
                  <TableCell style={{ minWidth: "240px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      {def.steps.map((s) => (
                        <div key={s.id} style={{ fontSize: "12.5px", color: "var(--text)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--primary)", flexShrink: 0 }} />
                          {s.name}
                          <span style={{ color: "var(--subtext)" }}>· {s.approverRule}</span>
                          {s.parallelGroup && <span style={{ color: "#d97706" }}>· parallel {s.parallelGroup}</span>}
                          {s.condition && (
                            <span style={{ color: "#0284c7" }}>· if {s.condition.field} {s.condition.operator} {s.condition.value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge {...definitionStatusMeta[def.status]} /></TableCell>
                  <TableCell style={{ whiteSpace: "nowrap", color: "var(--subtext)" }}>{def.createdAt}</TableCell>
                  <TableCell>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {def.status === "Active" && canWrite && (
                        <button onClick={() => handleDeactivate(def)} disabled={busy} style={{ ...btnGhost, background: "#fffbeb", color: "#d97706" }}>Deactivate</button>
                      )}
                      {canWrite && (
                        <button onClick={() => handleDeleteDef(def)} disabled={busy} style={{ ...btnGhost, background: "#fef2f2", color: "#dc2626" }}>Delete</button>
                      )}
                    </div>
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </SectionCard>
  );

  const renderEvents = () => (
    <SectionCard>
      {events.length === 0 ? (
        <EmptyState title="No events yet" subtitle="Approvals, rejections and escalations will show up here." icon={History} />
      ) : (
        <div style={{ padding: "18px" }}>
          {events.map((e) => (
            <div key={e.id} style={{ display: "flex", gap: "14px", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--primary)", marginTop: "5px", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "13px", color: "var(--text)" }}>
                  <span style={{ fontWeight: 600 }}>{e.type}</span>
                </p>
                <p style={{ fontSize: "12.5px", color: "var(--subtext)", marginTop: "2px", lineHeight: 1.45 }}>{e.detail}</p>
                <p style={{ fontSize: "11.5px", color: "var(--subtext)", marginTop: "3px", opacity: 0.75 }}>
                  {new Date(e.at).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );

  // -- Submit request modal ------------------------------------------------
  const [submitDef, setSubmitDef] = useState("");
  const [submitRequester, setSubmitRequester] = useState("");
  const [submitAttrs, setSubmitAttrs] = useState("{\n  \"duration_days\": 7\n}");

  const openSubmit = () => {
    setSubmitRequester(user.id);
    setSubmitDef(definitions.find((d) => d.status === "Active")?.id ?? "");
    setSubmitAttrs("{\n  \"duration_days\": 7\n}");
    setShowSubmit(true);
  };

  const handleSubmit = async () => {
    let attributes;
    try {
      attributes = JSON.parse(submitAttrs || "{}");
    } catch {
      flash("Attributes must be valid JSON");
      return;
    }
    setBusy("submit");
    try {
      const res = await submitRequest(submitDef, submitRequester, attributes);
      if (res.data) {
        flash(`Request submitted as "${res.data.requestType}" (${res.data.status})`);
        setShowSubmit(false);
        await refresh("submit");
      }
    } catch (err) {
      flash(err.message || "Submission failed");
    } finally {
      setBusy(null);
    }
  };

  // -- Add definition modal -------------------------------------------------
  const [newDef, setNewDef] = useState({ requestType: "", steps: [{ name: "Manager Approval", approverRule: APPROVER_RULES[0], slaHours: 24, parallelGroup: "", condition: "" }] });

  const openAddDef = () => {
    setNewDef({ requestType: "", steps: [{ name: "Manager Approval", approverRule: APPROVER_RULES[0], slaHours: 24, parallelGroup: "", condition: "" }] });
    setShowAddDef(true);
  };

  const handleAddDefinition = async () => {
    if (!newDef.requestType.trim()) {
      flash("Request type is required");
      return;
    }
    const steps = newDef.steps
      .filter((s) => s.name.trim())
      .map((s) => ({
        name: s.name.trim(),
        approverRule: s.approverRule,
        slaHours: Number(s.slaHours) || 24,
        parallelGroup: s.parallelGroup.trim() || null,
        condition: s.condition.trim() ? JSON.parse(s.condition) : null,
      }));
    if (steps.length === 0) {
      flash("At least one step is required");
      return;
    }
    setBusy("addDef");
    try {
      await addDefinition({ requestType: newDef.requestType.trim(), steps });
      flash("Definition created");
      setShowAddDef(false);
      await refresh("def");
    } catch (err) {
      flash(err.message || "Could not create definition");
    } finally {
      setBusy(null);
    }
  };

  const updateNewStep = (idx, patch) =>
    setNewDef((d) => ({ ...d, steps: d.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)) }));

  const submitForm = () => (
    <Modal title="Submit a workflow request" onClose={() => setShowSubmit(false)}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={labelStyle}>Definition</label>
          <select style={inputStyle} value={submitDef} onChange={(e) => setSubmitDef(e.target.value)}>
            {definitions.filter((d) => d.status === "Active").map((d) => (
              <option key={d.id} value={d.id}>{d.requestType}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Requester</label>
          <select style={inputStyle} value={submitRequester} onChange={(e) => setSubmitRequester(e.target.value)}>
            {roster.map((r) => (
              <option key={r.id} value={r.id}>{r.id} — {r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Attributes (JSON — only fields the engine needs)</label>
          <textarea
            style={{ ...inputStyle, minHeight: "120px", fontFamily: "monospace", fontSize: "12.5px", resize: "vertical" }}
            value={submitAttrs}
            onChange={(e) => setSubmitAttrs(e.target.value)}
          />
          <p style={{ fontSize: "11.5px", color: "var(--subtext)", marginTop: "5px" }}>
            Data minimization: conditions evaluate only these fields (e.g. duration_days, amount). The originating module's full record is never sent to the engine.
          </p>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button onClick={() => setShowSubmit(false)} style={{ ...btnGhost, background: "transparent", color: "var(--subtext)" }}>Cancel</button>
          <button onClick={handleSubmit} disabled={busy} style={btnPrimary}><Plus size={15} /> Submit</button>
        </div>
      </div>
    </Modal>
  );

  const addDefForm = () => (
    <Modal title="Create workflow definition" onClose={() => setShowAddDef(false)}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={labelStyle}>Request type</label>
          <input style={inputStyle} value={newDef.requestType} onChange={(e) => setNewDef((d) => ({ ...d, requestType: e.target.value }))} placeholder="e.g. Travel Expense Claim" />
        </div>
        <div>
          <label style={labelStyle}>Approval steps</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {newDef.steps.map((s, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "12px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--bg)" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input style={inputStyle} value={s.name} onChange={(e) => updateNewStep(i, { name: e.target.value })} placeholder="Step name" />
                  <select style={{ ...inputStyle, width: "210px", flexShrink: 0 }} value={s.approverRule} onChange={(e) => updateNewStep(i, { approverRule: e.target.value })}>
                    {APPROVER_RULES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <div>
                    <label style={labelStyle}>SLA (hrs)</label>
                    <input style={inputStyle} type="number" min={1} value={s.slaHours} onChange={(e) => updateNewStep(i, { slaHours: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Parallel group (optional)</label>
                    <input style={inputStyle} value={s.parallelGroup} onChange={(e) => updateNewStep(i, { parallelGroup: e.target.value })} placeholder="e.g. A" />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Condition (optional JSON {`{ "field": "amount", "operator": ">", "value": 2000000 }`})</label>
                  <input style={inputStyle} value={s.condition} onChange={(e) => updateNewStep(i, { condition: e.target.value })} placeholder='{"field":"duration_days","operator":">","value":5}' />
                </div>
                {newDef.steps.length > 1 && (
                  <button onClick={() => setNewDef((d) => ({ ...d, steps: d.steps.filter((_, x) => x !== i) }))} style={{ alignSelf: "flex-start", ...btnGhost, background: "#fef2f2", color: "#dc2626" }}>
                    Remove step
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => setNewDef((d) => ({ ...d, steps: [...d.steps, { name: "", approverRule: APPROVER_RULES[0], slaHours: 24, parallelGroup: "", condition: "" }] }))}
            style={{ ...btnGhost, marginTop: "10px" }}
          >
            <Plus size={14} /> Add step
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button onClick={() => setShowAddDef(false)} style={{ ...btnGhost, background: "transparent", color: "var(--subtext)" }}>Cancel</button>
          <button onClick={handleAddDefinition} disabled={busy} style={btnPrimary}><Plus size={15} /> Create</button>
        </div>
      </div>
    </Modal>
  );

  const assignModal = () => (
    <Modal title={`Assign approver — ${assignFor?.requestType ?? ""}`} onClose={() => setAssignFor(null)}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <p style={{ fontSize: "13px", color: "var(--subtext)", lineHeight: 1.5 }}>
          The engine could not resolve an approver automatically (missing manager / department head, or a data anomaly). Pick an employee to take the unresolved step — self-approval is still blocked server-side.
        </p>
        <AssignPicker
          key={assignFor?.id}
          roster={roster}
          onPick={(id, name) => handleAssign(id, name)}
          busy={busy}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => setAssignFor(null)} style={{ ...btnGhost, background: "transparent", color: "var(--subtext)" }}>Cancel</button>
        </div>
      </div>
    </Modal>
  );

  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <PageHeader title="Workflow Engine" subtitle="Generic approval engine — approvers resolve from live org data, self-approval is hard-blocked">
          <button onClick={handleSlaCheck} disabled={busy === "sla"} style={btnGhost}>
            <RefreshCw size={14} /> Run SLA check
          </button>
          <button onClick={openSubmit} disabled={busy} style={btnPrimary}>
            <Plus size={15} /> Submit request
          </button>
        </PageHeader>

        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "7px",
                  padding: "9px 16px", borderRadius: "99px",
                  fontSize: "13px", fontWeight: 600, cursor: "pointer",
                  border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
                  background: active ? "var(--primary)" : "var(--card)",
                  color: active ? "#fff" : "var(--subtext)",
                }}
              >
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        {notice && (
          <div style={{ marginBottom: "16px", padding: "11px 16px", borderRadius: "var(--radius)", background: "#f0fdf4", border: "1px solid #86efac", color: "#15803d", fontSize: "13px", fontWeight: 600 }}>
            {notice}
          </div>
        )}

        {loading ? (
          <Spinner size={32} />
        ) : (
          <>
            {activeTab === "instances" && renderInstances()}
            {activeTab === "definitions" && renderDefinitions()}
            {activeTab === "events" && renderEvents()}
          </>
        )}

        {showSubmit && submitForm()}
        {showAddDef && addDefForm()}
        {assignFor && assignModal()}
      </div>
    </MainLayout>
  );
}

function AssignPicker({ roster, onPick, busy }) {
  const [value, setValue] = useState("");
  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
      <select style={inputStyle} value={value} onChange={(e) => setValue(e.target.value)}>
        <option value="">Select employee…</option>
        {roster.map((r) => (
          <option key={r.id} value={r.id}>{r.id} — {r.name}</option>
        ))}
      </select>
      <button onClick={() => value && onPick(value, rosterNameOf(roster, value))} disabled={busy || !value} style={btnPrimary}>
        Assign
      </button>
    </div>
  );
}

function rosterNameOf(roster, id) {
  return roster.find((r) => r.id === id)?.name ?? id;
}
