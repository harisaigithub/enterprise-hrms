/**
 * Leave Management Page — Module 6
 */

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  CalendarDays,
  Umbrella,
  HeartPulse,
  Sparkles,
  CircleDollarSign,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import {
  getMyLeaveBalance,
  getLeaveRequests,
  getLeaveTypes,
  applyLeave,
  approveLeave,
  rejectLeave,
} from "../../services/leaveService";
import { useAuth } from "../../context/AuthContext";
import { leaveStatusMeta } from "../../mock/leave";
import "./Leave.css";

const LEAVE_COLORS = ["#0f766e", "#7c3aed", "#0284c7", "#d97706", "#dc2626"];

function leaveIcon(name = "") {
  const normalized = name.toLowerCase();
  if (normalized.includes("sick")) return HeartPulse;
  if (normalized.includes("earned")) return Sparkles;
  if (normalized.includes("unpaid")) return CircleDollarSign;
  return Umbrella;
}

function LeaveBalanceOverview({ balances, selectedId, onSelect }) {
  const availableTotal = balances.reduce((sum, item) => sum + Number(item.available || 0), 0);
  const distributionTotal = availableTotal || balances.length || 1;
  const segments = balances.map((item, index) => {
    const value = availableTotal ? Number(item.available || 0) : 1;
    const precedingValue = balances
      .slice(0, index)
      .reduce((sum, balance) => sum + (availableTotal ? Number(balance.available || 0) : 1), 0);
    const start = (precedingValue / distributionTotal) * 100;
    const end = start + (value / distributionTotal) * 100;
    return { item, start, end, color: LEAVE_COLORS[index % LEAVE_COLORS.length] };
  });
  const gradientStops = segments.map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`);
  const selected = balances.find((item) => item.leaveTypeId === selectedId) || balances[0];

  const handleDonutClick = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - (bounds.left + bounds.width / 2);
    const y = event.clientY - (bounds.top + bounds.height / 2);
    const angle = (Math.atan2(y, x) * (180 / Math.PI) + 450) % 360;
    const percentage = (angle / 360) * 100;
    const segment = segments.find((entry) => percentage >= entry.start && percentage < entry.end);
    if (segment) onSelect(segment.item.leaveTypeId);
  };

  return (
    <section className="leave-overview" aria-label="Leave balance overview">
      <div className="leave-donut-panel">
        <div className="leave-donut-wrap">
          <div
            className="leave-donut"
            style={{ background: `conic-gradient(${gradientStops.join(", ") || "#e2e8f0 0 100%"})` }}
            onClick={handleDonutClick}
            role="img"
            aria-label={`${availableTotal} total leave days available. Select a coloured section for details.`}
          >
            <div className="leave-donut-center">
              <strong>{availableTotal}</strong>
              <span>days available</span>
            </div>
          </div>
        </div>

        <div className="leave-donut-legend">
          <p className="leave-eyebrow">Leave distribution</p>
          <h2>My leave balance</h2>
          <p className="leave-helper">Select a colour or card to view its complete balance.</p>
          <div className="leave-legend-list">
            {balances.map((item, index) => (
              <button
                type="button"
                key={item.leaveTypeId}
                className={selected?.leaveTypeId === item.leaveTypeId ? "leave-legend active" : "leave-legend"}
                onClick={() => onSelect(item.leaveTypeId)}
              >
                <span className="leave-legend-dot" style={{ background: LEAVE_COLORS[index % LEAVE_COLORS.length] }} />
                <span>{item.leaveTypeName}</span>
                <strong>{item.available}</strong>
              </button>
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <div className="leave-detail-panel" aria-live="polite">
          <div>
            <p className="leave-eyebrow">Selected leave</p>
            <h3>{selected.leaveTypeName}</h3>
          </div>
          <div className="leave-detail-grid">
            <div><strong>{selected.total}</strong><span>Total</span></div>
            <div><strong>{selected.used}</strong><span>Used</span></div>
            <div><strong>{selected.available}</strong><span>Remaining</span></div>
            <div><strong>{selected.pending || 0}</strong><span>Pending</span></div>
          </div>
          <div className="leave-progress" aria-label={`${selected.used} of ${selected.total} days used`}>
            <span style={{ width: `${Math.min(100, (Number(selected.used || 0) / Math.max(1, Number(selected.total || 0))) * 100)}%` }} />
          </div>
        </div>
      )}
    </section>
  );
}

function ApplyLeaveModal({ isOpen, onClose, leaveTypes, employeeId, onSaved }) {
  const [form, setForm] = useState({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.leaveTypeId) e.leaveTypeId = "Select a leave type";
    if (!form.startDate) e.startDate = "Required";
    if (!form.endDate) e.endDate = "Required";
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      e.endDate = "End date must be after start date";
    if (!form.reason.trim()) e.reason = "Please provide a reason";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const daysBetween = () => {
    if (!form.startDate || !form.endDate) return 0;
    return Math.max(0, Math.round((new Date(form.endDate) - new Date(form.startDate)) / 86400000) + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await applyLeave({ ...form, employeeId, days: daysBetween() });
      setForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
      onClose();
      await onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = (key) => ({
    width: "100%", height: "38px", padding: "0 12px",
    border: `1px solid ${errors[key] ? "var(--red)" : "var(--border)"}`,
    borderRadius: "var(--radius-sm)", fontSize: "13.5px",
    color: "var(--text)", outline: "none", background: "var(--card)",
  });

  return (
    <Modal isOpen={isOpen} title="Apply for Leave" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Leave Type *</label>
          <select value={form.leaveTypeId} onChange={(e) => setForm((p) => ({ ...p, leaveTypeId: e.target.value }))} style={inputStyle("leaveTypeId")}>
            <option value="">Select type</option>
            {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name} (max {t.maxDays} days)</option>)}
          </select>
          {errors.leaveTypeId && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.leaveTypeId}</span>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {[["startDate", "Start Date *"], ["endDate", "End Date *"]].map(([key, label]) => (
            <div key={key} style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>{label}</label>
              <input type="date" value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} style={inputStyle(key)} />
              {errors[key] && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors[key]}</span>}
            </div>
          ))}
        </div>

        {daysBetween() > 0 && (
          <div style={{ background: "var(--primary-light)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: "13px", color: "var(--primary)", fontWeight: 600 }}>
            Duration: {daysBetween()} day{daysBetween() > 1 ? "s" : ""}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Reason *</label>
          <textarea value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} rows={3}
            placeholder="Briefly describe the reason for leave…"
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${errors.reason ? "var(--red)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", fontSize: "13.5px", color: "var(--text)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
          {errors.reason && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.reason}</span>}
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "none", color: "var(--label)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>Cancel</button>
          <button type="submit" disabled={saving} style={{ padding: "9px 20px", border: "none", borderRadius: "var(--radius-sm)", background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: "13px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function LeaveDecisionModal({ request, action, onClose, onCompleted }) {
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const rejecting = action === "reject";

  const submit = async (event) => {
    event.preventDefault();
    const cleanComments = comments.trim();
    if (rejecting && !cleanComments) {
      setError("Please enter a rejection reason. The employee will see this message.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (rejecting) await rejectLeave(request.id, cleanComments);
      else await approveLeave(request.id, cleanComments);
      await onCompleted();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Unable to update this leave request.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(request && action)}
      title={rejecting ? "Reject Leave Request" : "Approve Leave Request"}
      onClose={saving ? undefined : onClose}
    >
      <form onSubmit={submit} className="leave-decision-form">
        <div className="leave-decision-summary">
          <strong>{request?.employeeName}</strong>
          <span>{request?.leaveTypeName} · {request?.days} day{request?.days === 1 ? "" : "s"}</span>
          <small>{request?.reason || "No application reason provided"}</small>
        </div>
        <label htmlFor="leave-decision-comments">
          {rejecting ? "Rejection reason *" : "Approval comment (optional)"}
        </label>
        <textarea
          id="leave-decision-comments"
          value={comments}
          onChange={(event) => { setComments(event.target.value); setError(""); }}
          maxLength={1000}
          rows={4}
          placeholder={rejecting ? "Explain clearly why this request is being rejected…" : "Add a note for the employee…"}
          autoFocus
        />
        <div className="leave-character-count">{comments.length}/1000</div>
        {error && <div className="leave-decision-error" role="alert">{error}</div>}
        <div className="leave-decision-actions">
          <button type="button" className="leave-secondary-button" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className={rejecting ? "leave-reject-confirm" : "leave-approve-confirm"} disabled={saving}>
            {saving ? "Saving…" : rejecting ? "Reject with reason" : "Approve request"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Leave() {
  const { user, permissions } = useAuth();
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedBalanceId, setSelectedBalanceId] = useState(null);
  const [decision, setDecision] = useState({ request: null, action: "" });
  const canApprove = permissions.includes("leave:approve");
  const canApply = permissions.includes("leave:write");

  const loadData = useCallback(async () => {
    const [balRes, reqRes, ltRes] = await Promise.all([
      getMyLeaveBalance(user.id),
      getLeaveRequests(canApprove ? {} : { employeeId: user.id }),
      getLeaveTypes(),
    ]);
    setBalances(balRes.data);
    setSelectedBalanceId((current) => current || balRes.data?.[0]?.leaveTypeId || null);
    setRequests(reqRes.data);
    setLeaveTypes(ltRes.data);
  }, [canApprove, user.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData().catch(() => undefined).finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const filtered = statusFilter ? requests.filter((r) => r.status === statusFilter) : requests;
  const statusCounts = requests.reduce((counts, request) => {
    counts[request.status] = (counts[request.status] || 0) + 1;
    return counts;
  }, {});

  if (loading) return <MainLayout><Spinner /></MainLayout>;

  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <PageHeader title="Leave Management" subtitle="Balances, requests and approvals">
          {canApply && <button id="apply-leave-btn" onClick={() => setShowApply(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
            <Plus size={16} /> Apply Leave
          </button>}
        </PageHeader>

        <LeaveBalanceOverview balances={balances} selectedId={selectedBalanceId} onSelect={setSelectedBalanceId} />

        <div className="leave-balance-cards">
          {balances.map((balance, index) => {
            const Icon = leaveIcon(balance.leaveTypeName);
            const active = balance.leaveTypeId === selectedBalanceId;
            return (
              <button
                type="button"
                key={balance.leaveTypeId}
                className={active ? "leave-balance-card active" : "leave-balance-card"}
                onClick={() => setSelectedBalanceId(balance.leaveTypeId)}
                style={{ "--leave-color": LEAVE_COLORS[index % LEAVE_COLORS.length] }}
              >
                <span className="leave-card-icon"><Icon size={17} /></span>
                <span><strong>{balance.available}</strong><small>{balance.leaveTypeName}</small></span>
                <span className="leave-card-total">of {balance.total}</span>
              </button>
            );
          })}
        </div>

        {/* Requests table */}
        <div className="leave-request-header">
          <div>
            <h2>{canApprove ? "Leave Requests & Approvals" : "My Leave Requests"}</h2>
            <p>{canApprove ? "Review team requests and record clear decisions." : "Track every request and the decision reason."}</p>
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            style={{ height: "34px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px", background: "var(--card)", outline: "none", cursor: "pointer" }}>
            <option value="">All Statuses</option>
            {["Pending", "Approved", "Rejected", "Cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="leave-status-cards">
          {[
            { key: "", label: "All requests", icon: CalendarDays, color: "#475569" },
            { key: "Pending", label: "Pending", icon: Clock3, color: "#d97706" },
            { key: "Approved", label: "Approved", icon: CheckCircle2, color: "#059669" },
            { key: "Rejected", label: "Rejected", icon: XCircle, color: "#dc2626" },
          ].map((status) => {
            const Icon = status.icon;
            const count = status.key ? statusCounts[status.key] || 0 : requests.length;
            return (
              <button
                type="button"
                key={status.label}
                className={statusFilter === status.key ? "leave-status-card active" : "leave-status-card"}
                onClick={() => setStatusFilter(status.key)}
                style={{ "--status-color": status.color }}
              >
                <Icon size={17} />
                <span>{status.label}</span>
                <strong>{count}</strong>
              </button>
            );
          })}
        </div>

        <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No leave requests"
              subtitle={canApply ? "Apply for leave using the button above." : "There are no requests requiring your attention."}
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
                    {["Employee", "Leave Type", "Dates", "Days", "Reason", "Status", "Decision Details", "Applied On", ...(canApprove ? ["Actions"] : [])].map((h) => (
                      <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((req, i) => {
                    const meta = leaveStatusMeta[req.status] || leaveStatusMeta.Pending;
                    return (
                      <tr key={req.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)", fontWeight: 500 }}>{req.employeeName}</td>
                        <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--label)" }}>{req.leaveTypeName}</td>
                        <td style={{ padding: "13px 16px", fontSize: "12.5px", color: "var(--text)", whiteSpace: "nowrap" }}>
                          {new Date(req.startDate + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          {req.startDate !== req.endDate && ` – ${new Date(req.endDate + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`}
                        </td>
                        <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)", textAlign: "center" }}>{req.days}</td>
                        <td style={{ padding: "13px 16px", fontSize: "13px", color: "var(--subtext)", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{req.reason}</td>
                        <td style={{ padding: "13px 16px" }}><StatusBadge label={meta.label} color={meta.color} bg={meta.bg} /></td>
                        <td className="leave-decision-cell">
                          {req.status === "Pending" ? (
                            <span className="leave-awaiting">Awaiting decision</span>
                          ) : (
                            <div>
                              <strong>{req.approverName || "Approver"}</strong>
                              <span>{req.approvedOn ? new Date(req.approvedOn + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}</span>
                              {req.comments && <p className={req.status === "Rejected" ? "leave-rejection-reason" : ""}>{req.comments}</p>}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "13px 16px", fontSize: "12px", color: "var(--subtext)", whiteSpace: "nowrap" }}>
                          {new Date(req.appliedOn + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        {canApprove && (
                          <td style={{ padding: "13px 16px" }}>
                            {req.status === "Pending" && req.employeeId !== user.id ? (
                              <div className="leave-row-actions">
                                <button type="button" className="leave-approve-button" onClick={() => setDecision({ request: req, action: "approve" })}>Approve</button>
                                <button type="button" className="leave-reject-button" onClick={() => setDecision({ request: req, action: "reject" })}>Reject</button>
                              </div>
                            ) : req.status === "Pending" ? <span className="leave-self-note">Own request</span> : null}
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

      <ApplyLeaveModal
        isOpen={showApply}
        onClose={() => setShowApply(false)}
        leaveTypes={leaveTypes}
        employeeId={user.id}
        onSaved={loadData}
      />
      <LeaveDecisionModal
        request={decision.request}
        action={decision.action}
        onClose={() => setDecision({ request: null, action: "" })}
        onCompleted={loadData}
      />
    </MainLayout>
  );
}
