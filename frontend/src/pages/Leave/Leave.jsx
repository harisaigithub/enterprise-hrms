/**
 * Leave Management Page — Module 6
 */

import { useState, useEffect } from "react";
import { Plus, CalendarDays } from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import { getMyLeaveBalance, getLeaveRequests, getLeaveTypes, applyLeave } from "../../services/leaveService";
import { useAuth } from "../../context/AuthContext";
import { leaveStatusMeta } from "../../mock/leave";

function ApplyLeaveModal({ isOpen, onClose, leaveTypes, employeeId }) {
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
    await applyLeave({ ...form, employeeId, days: daysBetween() });
    setSaving(false);
    onClose();
    setForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
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

export default function Leave() {
  const { user } = useAuth();
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getMyLeaveBalance(user.id),
      getLeaveRequests({ employeeId: user.id }),
      getLeaveTypes(),
    ]).then(([balRes, reqRes, ltRes]) => {
      setBalances(balRes.data);
      setRequests(reqRes.data);
      setLeaveTypes(ltRes.data);
    }).catch(() => setLoading(false)).finally(() => setLoading(false));
  }, [user.id]);

  const filtered = statusFilter ? requests.filter((r) => r.status === statusFilter) : requests;

  if (loading) return <MainLayout><Spinner /></MainLayout>;

  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <PageHeader title="Leave Management" subtitle="Balances, requests and approvals">
          <button id="apply-leave-btn" onClick={() => setShowApply(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
            <Plus size={16} /> Apply Leave
          </button>
        </PageHeader>

        {/* Balance cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px", marginBottom: "28px" }}>
          {balances.map((b) => (
            <div key={b.leaveTypeId} style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", padding: "18px 20px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "10px" }}>{b.leaveTypeName}</p>
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                <div>
                  <p style={{ fontSize: "28px", fontWeight: 800, color: "var(--primary)", lineHeight: 1 }}>{b.available}</p>
                  <p style={{ fontSize: "11px", color: "var(--subtext)", marginTop: "2px" }}>Available</p>
                </div>
                <div style={{ marginBottom: "4px", display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "11px", color: "var(--green)", fontWeight: 600 }}>Used: {b.used}</span>
                  {b.pending > 0 && <span style={{ fontSize: "11px", color: "var(--amber)", fontWeight: 600 }}>Pending: {b.pending}</span>}
                </div>
              </div>
              <div style={{ marginTop: "10px", height: "4px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, (b.used / b.total) * 100)}%`, background: "var(--primary)", borderRadius: "99px" }} />
              </div>
              <p style={{ fontSize: "10px", color: "var(--subtext)", marginTop: "4px" }}>of {b.total} total</p>
            </div>
          ))}
        </div>

        {/* Requests table */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Leave Requests</h2>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            style={{ height: "34px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px", background: "var(--card)", outline: "none", cursor: "pointer" }}>
            <option value="">All Statuses</option>
            {["Pending", "Approved", "Rejected", "Cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No leave requests" subtitle="Apply for leave using the button above." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
                    {["Employee", "Leave Type", "Dates", "Days", "Reason", "Status", "Applied On"].map((h) => (
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
                        <td style={{ padding: "13px 16px", fontSize: "12px", color: "var(--subtext)", whiteSpace: "nowrap" }}>
                          {new Date(req.appliedOn + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
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
      />
    </MainLayout>
  );
}
