/**
 * Helpdesk Page — Module 17
 * Tabs: My Tickets (raise + track), Agent Queue (resolve).
 * SLA escalation and reopen-window auto-close are computed live by the
 * service (spec 17.5 steps 4-5), not stored/stale flags.
 */

import { useState, useEffect } from "react";
import { Plus, Paperclip, AlertTriangle, Lock, RotateCcw } from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import {
  getMyTickets, getAgentQueue, getAllQueueNames, raiseTicket, resolveTicket, reopenTicket,
} from "../../services/helpdeskService";
import { TICKET_CATEGORIES, ticketStatusMeta } from "../../mock/helpdesk";

const CURRENT_EMPLOYEE = { id: "EMP014", name: "Ananya Verma" };
const fmtDateTime = (d) => new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function RaiseTicketModal({ isOpen, onClose, onRaised }) {
  const [form, setForm] = useState({ category: "", description: "", attachmentFileName: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const isConfidential = form.category === "HR — Grievance/Confidential";

  const validate = () => {
    const e = {};
    if (!form.category) e.category = "Select a category";
    if (!form.description.trim()) e.description = "Please describe the issue";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    await raiseTicket({
      employeeId: CURRENT_EMPLOYEE.id,
      employeeName: CURRENT_EMPLOYEE.name,
      category: form.category,
      description: form.description.trim(),
      attachmentFileName: form.attachmentFileName || null,
    });
    setSaving(false);
    onRaised();
    onClose();
    setForm({ category: "", description: "", attachmentFileName: "" });
  };

  const inputStyle = (key) => ({
    width: "100%", height: "38px", padding: "0 12px",
    border: `1px solid ${errors[key] ? "var(--red)" : "var(--border)"}`,
    borderRadius: "var(--radius-sm)", fontSize: "13.5px",
    color: "var(--text)", outline: "none", background: "var(--card)",
  });

  return (
    <Modal isOpen={isOpen} title="Raise a Ticket" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Category *</label>
          <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} style={inputStyle("category")}>
            <option value="">Select category</option>
            {TICKET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.category && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.category}</span>}
        </div>

        {isConfidential && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--radius-sm)", padding: "10px 14px", display: "flex", gap: "8px", alignItems: "flex-start" }}>
            <Lock size={14} style={{ color: "var(--red)", flexShrink: 0, marginTop: "1px" }} />
            <p style={{ fontSize: "12px", color: "#991b1b" }}>This ticket routes to a restricted HR-Compliance queue. Only designated HR-Compliance agents will see it.</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Description *</label>
          <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={4}
            placeholder="Describe the issue in as much detail as you can…"
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${errors.description ? "var(--red)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", fontSize: "13.5px", color: "var(--text)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
          {errors.description && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.description}</span>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Attachment (optional)</label>
          <input
            type="file"
            onChange={(e) => setForm((p) => ({ ...p, attachmentFileName: e.target.files?.[0]?.name || "" }))}
            style={{ fontSize: "12.5px" }}
          />
          {form.attachmentFileName && <span style={{ fontSize: "11.5px", color: "var(--subtext)" }}>Attached: {form.attachmentFileName}</span>}
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "none", color: "var(--label)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>Cancel</button>
          <button id="raise-ticket-btn" type="submit" disabled={saving} style={{ padding: "9px 20px", border: "none", borderRadius: "var(--radius-sm)", background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: "13px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Raising…" : "Raise Ticket"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ResolveModal({ ticket, onClose, onResolved }) {
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleResolve = async () => {
    if (!notes.trim()) {
      setError("Resolution notes are required before this ticket can be closed.");
      return;
    }
    setSaving(true);
    try {
      await resolveTicket(ticket.id, notes.trim());
      onResolved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={!!ticket} title={`Resolve ${ticket?.id}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <p style={{ fontSize: "13px", color: "var(--subtext)" }}>{ticket?.description}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Resolution Notes *</label>
          <textarea value={notes} onChange={(e) => { setNotes(e.target.value); setError(""); }} rows={4}
            placeholder="What was done to resolve this? (required — a ticket cannot be closed without this)"
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${error ? "var(--red)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", fontSize: "13.5px", color: "var(--text)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
          {error && <span style={{ fontSize: "11px", color: "var(--red)" }}>{error}</span>}
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "none", color: "var(--label)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>Cancel</button>
          <button onClick={handleResolve} disabled={saving} style={{ padding: "9px 20px", border: "none", borderRadius: "var(--radius-sm)", background: "var(--green)", color: "#fff", fontWeight: 600, fontSize: "13px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Resolving…" : "Mark Resolved"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SlaBadge({ ticket }) {
  if (ticket.escalated) {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600, color: "var(--red)" }}>
        <AlertTriangle size={11} /> SLA breached — escalated to {ticket.escalatedTo}
      </span>
    );
  }
  if (["Resolved", "Reopened"].includes(ticket.status) === false) {
    return <span style={{ fontSize: "11px", color: "var(--subtext)" }}>SLA: {ticket.slaHours}h · due {fmtDateTime(ticket.slaDeadline)}</span>;
  }
  return null;
}

export default function Helpdesk() {
  const [tab, setTab] = useState("mine");
  const [myTickets, setMyTickets] = useState([]);
  const [queueTickets, setQueueTickets] = useState([]);
  const [queueNames, setQueueNames] = useState([]);
  const [activeQueue, setActiveQueue] = useState("");
  const [loading, setLoading] = useState(true);
  const [showRaise, setShowRaise] = useState(false);
  const [resolveTarget, setResolveTarget] = useState(null);

  const loadMine = () => getMyTickets(CURRENT_EMPLOYEE.id).then((res) => setMyTickets(res.data));
  const loadQueue = (queue) => getAgentQueue(queue).then((res) => setQueueTickets(res.data));

  useEffect(() => {
    setLoading(true);
    Promise.all([loadMine(), getAllQueueNames()]).then(([, qRes]) => {
      setQueueNames(qRes.data);
      const first = qRes.data[0];
      setActiveQueue(first);
      return loadQueue(first);
    }).finally(() => setLoading(false));
  }, []);

  const handleQueueChange = (queue) => {
    setActiveQueue(queue);
    loadQueue(queue);
  };

  const handleReopen = async (ticket) => {
    await reopenTicket(ticket.id, "Reopening — issue is not fully resolved.");
    loadMine();
  };

  const tabs = [
    { id: "mine", label: "My Tickets" },
    { id: "queue", label: "Agent Queue" },
  ];

  if (loading) return <MainLayout><Spinner /></MainLayout>;

  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <PageHeader title="Helpdesk" subtitle="IT, HR, Finance, and Asset support tickets">
          <button id="raise-ticket-btn-header" onClick={() => setShowRaise(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
            <Plus size={16} /> Raise Ticket
          </button>
        </PageHeader>

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

        {tab === "queue" && (
          <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
            {queueNames.map((q) => (
              <button key={q} onClick={() => handleQueueChange(q)}
                style={{
                  padding: "6px 14px", borderRadius: "99px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer",
                  border: activeQueue === q ? "1px solid var(--primary)" : "1px solid var(--border)",
                  background: activeQueue === q ? "var(--primary)" : "var(--card)",
                  color: activeQueue === q ? "#fff" : "var(--text)",
                }}>
                {q}
              </button>
            ))}
          </div>
        )}

        <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
          {(tab === "mine" ? myTickets : queueTickets).length === 0 ? (
            <EmptyState title={tab === "mine" ? "No tickets raised" : "Queue is empty"} subtitle={tab === "mine" ? "Raise a ticket using the button above." : "Nothing to work on right now."} />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
                    {[tab === "queue" ? "Employee" : null, "ID", "Category", "Description", "SLA", "Status", tab === "queue" ? "Actions" : "Reopen"].filter(Boolean).map((h) => (
                      <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(tab === "mine" ? myTickets : queueTickets).map((t, i, arr) => {
                    const meta = ticketStatusMeta[t.status] || ticketStatusMeta.Open;
                    return (
                      <tr key={t.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                        {tab === "queue" && (
                          <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap" }}>{t.employeeName}</td>
                        )}
                        <td style={{ padding: "13px 16px", fontSize: "12.5px", color: "var(--subtext)", fontFamily: "monospace", whiteSpace: "nowrap" }}>{t.id}</td>
                        <td style={{ padding: "13px 16px", fontSize: "13px", color: "var(--text)", whiteSpace: "nowrap" }}>
                          {t.category}
                          {t.isConfidential && <Lock size={11} style={{ marginLeft: "5px", color: "var(--red)", display: "inline", verticalAlign: "middle" }} />}
                        </td>
                        <td style={{ padding: "13px 16px", fontSize: "13px", color: "var(--subtext)", maxWidth: "260px" }}>
                          {t.description}
                          {t.attachmentFileName && (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--subtext)", marginTop: "3px" }}>
                              <Paperclip size={10} /> {t.attachmentFileName}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "13px 16px" }}><SlaBadge ticket={t} /></td>
                        <td style={{ padding: "13px 16px" }}>
                          <StatusBadge label={meta.label} color={meta.color} bg={meta.bg} />
                        </td>
                        {tab === "queue" ? (
                          <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                            <button
                              id={`resolve-${t.id}-btn`}
                              onClick={() => setResolveTarget(t)}
                              disabled={["Resolved", "Closed"].includes(t.status)}
                              style={{ padding: "6px 14px", background: "var(--green-light)", color: "var(--green)", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "12px", cursor: ["Resolved", "Closed"].includes(t.status) ? "not-allowed" : "pointer" }}>
                              Resolve
                            </button>
                          </td>
                        ) : (
                          <td style={{ padding: "13px 16px" }}>
                            {t.canReopen ? (
                              <button
                                id={`reopen-${t.id}-btn`}
                                onClick={() => handleReopen(t)}
                                style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", background: "var(--red-light)", color: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
                                <RotateCcw size={12} /> Reopen
                              </button>
                            ) : (
                              <span style={{ fontSize: "12px", color: "var(--subtext)" }}>—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <RaiseTicketModal isOpen={showRaise} onClose={() => setShowRaise(false)} onRaised={loadMine} />
      <ResolveModal ticket={resolveTarget} onClose={() => setResolveTarget(null)} onResolved={() => loadQueue(activeQueue)} />
    </MainLayout>
  );
}