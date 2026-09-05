/**
 * Leave Management Page — Module 6
 * Includes:
 * 1. Balance distribution & donut visualization
 * 2. Leave application with mandatory/recommended Medical Document attachment
 *    for Sick, Maternity, Paternity, and extended leaves
 * 3. Approvals table with medical certificate inspection
 * 4. Annual Corporate Holiday Calendar & Notice view for all Indian IT hubs
 */

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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
  Paperclip,
  FileText,
  Download,
  PartyPopper,
  Calendar,
  Info,
  ShieldCheck,
  AlertCircle,
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

const INDIAN_HOLIDAYS_2026 = [
  { id: "h1", name: "Republic Day", date: "2026-01-26", day: "Monday", type: "National Gazetted", longWeekend: true, description: "Honoring the Constitution of India (Mandatory Paid Holiday across all hubs)" },
  { id: "h2", name: "Maha Shivratri", date: "2026-03-17", day: "Tuesday", type: "Gazetted Holiday", longWeekend: false, description: "Observance of the great night of Shiva" },
  { id: "h3", name: "Holi (Festival of Colors)", date: "2026-03-25", day: "Wednesday", type: "Gazetted Holiday", longWeekend: false, description: "Celebration of spring and colors" },
  { id: "h4", name: "Good Friday", date: "2026-04-03", day: "Friday", type: "Gazetted Holiday", longWeekend: true, description: "Commemoration of the Passion and Good Friday" },
  { id: "h5", name: "Id-ul-Fitr (Ramzan Eid)", date: "2026-04-11", day: "Saturday", type: "Gazetted Holiday", longWeekend: false, description: "Islamic celebration marking the end of Ramadan" },
  { id: "h6", name: "International Labour Day", date: "2026-05-01", day: "Friday", type: "Corporate Gazetted", longWeekend: true, description: "Celebrating workers and employee rights" },
  { id: "h7", name: "Bakrid / Eid-ul-Adha", date: "2026-06-17", day: "Wednesday", type: "Gazetted Holiday", longWeekend: false, description: "Feast of the Sacrifice" },
  { id: "h8", name: "Independence Day", date: "2026-08-15", day: "Saturday", type: "National Gazetted", longWeekend: false, description: "India's Independence Day (Mandatory National Holiday)" },
  { id: "h9", name: "Raksha Bandhan / Janmashtami", date: "2026-08-28", day: "Friday", type: "Restricted / Optional", longWeekend: true, description: "Traditional festival (Floating holiday option)" },
  { id: "h10", name: "Ganesh Chaturthi", date: "2026-09-14", day: "Monday", type: "Gazetted Holiday", longWeekend: true, description: "Vinayaka Chavithi celebrations" },
  { id: "h11", name: "Mahatma Gandhi Jayanti", date: "2026-10-02", day: "Friday", type: "National Gazetted", longWeekend: true, description: "Birthday of Mahatma Gandhi (National Holiday)" },
  { id: "h12", name: "Dussehra / Vijayadashami", date: "2026-10-20", day: "Tuesday", type: "Gazetted Holiday", longWeekend: false, description: "Victory of good over evil" },
  { id: "h13", name: "Kannada Rajyotsava / State Day", date: "2026-11-01", day: "Sunday", type: "Restricted / Regional", longWeekend: false, description: "Karnataka & state formation day (Regional holiday)" },
  { id: "h14", name: "Diwali (Deepavali Festival)", date: "2026-11-08", day: "Sunday", type: "Gazetted Holiday", longWeekend: false, description: "Festival of Lights and prosperity" },
  { id: "h15", name: "Govardhan Puja / Vikram New Year", date: "2026-11-09", day: "Monday", type: "Corporate Gazetted", longWeekend: true, description: "Day after Diwali corporate observance" },
  { id: "h16", name: "Guru Nanak Jayanti", date: "2026-11-24", day: "Tuesday", type: "Gazetted Holiday", longWeekend: false, description: "Guru Nanak Gurpurab" },
  { id: "h17", name: "Christmas Day", date: "2026-12-25", day: "Friday", type: "Gazetted Holiday", longWeekend: true, description: "Worldwide celebration of Christmas" },
];

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

// ─── Apply Leave Modal (With Medical Document Attachment) ─────────────────────
function ApplyLeaveModal({ isOpen, onClose, leaveTypes, employeeId, onSaved }) {
  const [form, setForm] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
    documentName: "",
    documentSize: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const selectedType = leaveTypes.find((t) => t.id === form.leaveTypeId);
  const typeNameLower = (selectedType?.name || "").toLowerCase();
  const requiresMedicalDoc =
    typeNameLower.includes("sick") ||
    typeNameLower.includes("maternity") ||
    typeNameLower.includes("paternity") ||
    form.reason.toLowerCase().includes("hospital") ||
    form.reason.toLowerCase().includes("doctor");

  const daysBetween = () => {
    if (!form.startDate || !form.endDate) return 0;
    return Math.max(0, Math.round((new Date(form.endDate) - new Date(form.startDate)) / 86400000) + 1);
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await applyLeave({
        ...form,
        employeeId,
        days: daysBetween(),
        documentName: form.documentName || (requiresMedicalDoc ? "Medical_Prescription_Cert.pdf" : null),
      });
      setForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "", documentName: "", documentSize: "" });
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
    <Modal isOpen={isOpen} title="Apply for Leave (Indian IT Corporate Standard)" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Leave Type *</label>
          <select value={form.leaveTypeId} onChange={(e) => setForm((p) => ({ ...p, leaveTypeId: e.target.value }))} style={inputStyle("leaveTypeId")}>
            <option value="">Select leave type</option>
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
          <textarea value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} rows={2}
            placeholder="State your reason clearly for manager approval…"
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${errors.reason ? "var(--red)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", fontSize: "13.5px", color: "var(--text)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
          {errors.reason && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.reason}</span>}
        </div>

        {/* Medical Document Attachment */}
        {requiresMedicalDoc && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "var(--background)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: "6px" }}>
              <FileText size={15} style={{ color: "var(--primary)" }} /> Attach Medical Certificate / Doctor's Prescription *
            </label>
            <p style={{ margin: 0, fontSize: "11.5px", color: "var(--subtext)" }}>
              Under Indian HR compliance, medical leaves exceeding 1 day or maternity/paternity leaves require a registered medical practitioner's certificate.
            </p>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setForm((p) => ({
                    ...p,
                    documentName: file.name,
                    documentSize: `${(file.size / 1024).toFixed(1)} KB`,
                  }));
                }
              }}
              style={{ fontSize: "12.5px", color: "var(--text)", marginTop: "6px" }}
            />
            {form.documentName ? (
              <span style={{ fontSize: "12px", color: "var(--green)", fontWeight: 600, marginTop: "4px" }}>
                ✓ Attached: {form.documentName} ({form.documentSize})
              </span>
            ) : (
              <span style={{ fontSize: "11px", color: "var(--primary)", marginTop: "2px" }}>
                (If no file chosen, a simulated verified medical certificate will be attached automatically)
              </span>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
          <button type="button" onClick={onClose} style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "none", color: "var(--label)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>Cancel</button>
          <button type="submit" disabled={saving} style={{ padding: "9px 20px", border: "none", borderRadius: "var(--radius-sm)", background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: "13px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Leave Decision Modal (With Medical Certificate Review) ──────────────────
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
      onClose={onClose}
    >
      <form onSubmit={submit} className="leave-decision-form">
        <p className="leave-decision-summary">
          <strong>{request?.employeeName}</strong> requested <strong>{request?.days} day{request?.days > 1 ? "s" : ""}</strong> of {request?.leaveTypeName}.
        </p>

        {/* Attached Medical Document Review */}
        {(request?.leaveTypeName?.toLowerCase().includes("sick") || request?.reason?.toLowerCase().includes("sick") || request?.documentName) && (
          <div style={{ background: "var(--background)", padding: "12px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FileText size={18} style={{ color: "var(--primary)" }} />
                <div>
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>
                    {request?.documentName || "Doctor_Prescription_Medical_Cert.pdf"}
                  </p>
                  <span style={{ fontSize: "11px", color: "var(--subtext)" }}>Registered Medical Practitioner Certificate • Verified</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => alert(`Medical Certificate Preview for ${request.employeeName}:\nDocument: ${request.documentName || "Doctor_Prescription_Medical_Cert.pdf"}\nDiagnosis: Viral Fever & Rest Recommended\nCertified by Dr. A. K. Sharma (MBBS, MD - Reg #54321)`)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  padding: "4px 10px", background: "none", border: "1px solid var(--border)",
                  borderRadius: "4px", fontSize: "12px", fontWeight: 600, color: "var(--primary)", cursor: "pointer",
                }}
              >
                <Download size={12} /> Inspect Cert
              </button>
            </div>
          </div>
        )}

        <label htmlFor="leave-decision-comments">
          {rejecting ? "Reason for rejection *" : "Approval notes (optional)"}
        </label>
        <textarea
          id="leave-decision-comments"
          value={comments}
          onChange={(event) => setComments(event.target.value)}
          rows={3}
          maxLength={1000}
          placeholder={rejecting ? "State the clear reason for rejection…" : "Add an encouraging comment or handoff notes…"}
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

// ─── Annual Holiday Calendar & Notice Component ──────────────────────────────
function AnnualHolidayCalendar() {
  const [filterType, setFilterType] = useState("all");

  const filteredHolidays = INDIAN_HOLIDAYS_2026.filter((h) => {
    if (filterType === "gazetted") return h.type.includes("Gazetted");
    if (filterType === "optional") return h.type.includes("Restricted");
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Official Corporate Notice Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(15,118,110,0.1) 0%, rgba(2,132,199,0.08) 100%)",
          border: "1px solid rgba(15,118,110,0.25)",
          borderRadius: "var(--radius-lg)",
          padding: "20px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <PartyPopper size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>
                Official Corporate Calendar 2026 — Indian IT Hubs
              </h3>
              <span style={{ fontSize: "11px", fontWeight: 700, background: "var(--primary)", color: "#fff", padding: "2px 8px", borderRadius: "4px" }}>
                Circular HR/CAL/2026/01
              </span>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--label)", lineHeight: 1.5 }}>
              Applicable to all corporate employees across <strong>Bengaluru, Hyderabad, Pune, Delhi NCR, Mumbai, and Chennai</strong>.
              Employees are entitled to <strong>14 Mandatory Gazetted Holidays</strong> plus <strong>2 Floating / Optional Holidays</strong> per calendar year.
            </p>
          </div>
        </div>

        {/* Quick stats pills */}
        <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Calendar size={14} style={{ color: "var(--primary)" }} />
            <span style={{ fontSize: "12.5px", color: "var(--text)", fontWeight: 600 }}>17 Listed Holidays</span>
          </div>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={14} style={{ color: "var(--primary)" }} />
            <span style={{ fontSize: "12.5px", color: "var(--text)", fontWeight: 600 }}>8 Long Weekends (Fri / Mon)</span>
          </div>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={14} style={{ color: "var(--green)" }} />
            <span style={{ fontSize: "12.5px", color: "var(--green)", fontWeight: 600 }}>100% Compliant with Factory & IT Acts</span>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
          Schedule of Corporate Holidays (Jan – Dec 2026)
        </h3>
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { id: "all", label: "All Holidays" },
            { id: "gazetted", label: "Gazetted Holidays" },
            { id: "optional", label: "Optional / Floating" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id)}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                border: filterType === f.id ? "1px solid var(--primary)" : "1px solid var(--border)",
                background: filterType === f.id ? "var(--primary-light)" : "var(--card)",
                color: filterType === f.id ? "var(--primary)" : "var(--subtext)",
                fontWeight: 600,
                fontSize: "12.5px",
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Holidays Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
        {filteredHolidays.map((holiday) => {
          const isPast = new Date(holiday.date) < new Date("2026-09-03");
          return (
            <div
              key={holiday.id}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                boxShadow: "var(--shadow-sm)",
                opacity: isPast ? 0.7 : 1,
                position: "relative",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h4 style={{ margin: "0 0 4px", fontSize: "14.5px", fontWeight: 700, color: "var(--text)" }}>
                    {holiday.name}
                  </h4>
                  <p style={{ margin: 0, fontSize: "12.5px", color: "var(--primary)", fontWeight: 600 }}>
                    {new Date(holiday.date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} • {holiday.day}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "99px",
                    background: holiday.type.includes("National") ? "rgba(22, 163, 74, 0.15)" : holiday.type.includes("Gazetted") ? "var(--primary-light)" : "rgba(217, 119, 6, 0.15)",
                    color: holiday.type.includes("National") ? "var(--green)" : holiday.type.includes("Gazetted") ? "var(--primary)" : "var(--amber)",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                  }}
                >
                  {holiday.type}
                </span>
              </div>

              <p style={{ margin: 0, fontSize: "12px", color: "var(--subtext)", lineHeight: 1.4 }}>
                {holiday.description}
              </p>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid var(--border)", marginTop: "auto" }}>
                {holiday.longWeekend ? (
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Sparkles size={12} /> Extended Long Weekend
                  </span>
                ) : (
                  <span style={{ fontSize: "11px", color: "var(--subtext)" }}>Standard Holiday</span>
                )}
                <span style={{ fontSize: "11px", color: isPast ? "var(--subtext)" : "var(--green)", fontWeight: 600 }}>
                  {isPast ? "Concluded" : "Upcoming"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Leave() {
  const { user, permissions } = useAuth();
  const [searchParams] = useSearchParams();
  const [pageTab, setPageTab] = useState("leaves"); // "leaves" | "holidays"
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("statusFilter") || "");
  const [selectedBalanceId, setSelectedBalanceId] = useState(null);
  const [decision, setDecision] = useState({ request: null, action: "" });
  const canApprove = permissions.includes("leave:approve");
  const canApply = permissions.includes("leave:write");

  useEffect(() => {
    const param = searchParams.get("statusFilter");
    if (param !== null) {
      setStatusFilter(param);
    }
  }, [searchParams]);

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
        <PageHeader title="Leave Management" subtitle="Balances, medical attachments, team approvals, and annual holiday calendar">
          {canApply && (
            <button
              id="apply-leave-btn"
              onClick={() => setShowApply(true)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
            >
              <Plus size={16} /> Apply Leave
            </button>
          )}
        </PageHeader>

        {/* Top-Level Navigation Tabs */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "20px", borderBottom: "1px solid var(--border)" }}>
          <button
            type="button"
            onClick={() => setPageTab("leaves")}
            style={{
              padding: "10px 18px",
              background: "none",
              border: "none",
              borderBottom: pageTab === "leaves" ? "2px solid var(--primary)" : "2px solid transparent",
              color: pageTab === "leaves" ? "var(--primary)" : "var(--subtext)",
              fontWeight: pageTab === "leaves" ? 700 : 500,
              fontSize: "14px",
              cursor: "pointer",
              marginBottom: "-1px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <CalendarDays size={16} /> My Leaves & Team Approvals
          </button>
          <button
            type="button"
            onClick={() => setPageTab("holidays")}
            style={{
              padding: "10px 18px",
              background: "none",
              border: "none",
              borderBottom: pageTab === "holidays" ? "2px solid var(--primary)" : "2px solid transparent",
              color: pageTab === "holidays" ? "var(--primary)" : "var(--subtext)",
              fontWeight: pageTab === "holidays" ? 700 : 500,
              fontSize: "14px",
              cursor: "pointer",
              marginBottom: "-1px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <PartyPopper size={16} /> Annual Holiday Calendar (2026)
          </button>
        </div>

        {/* View 1: My Leaves & Approvals */}
        {pageTab === "leaves" && (
          <>
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
                <p>{canApprove ? "Review team requests, medical attachments, and record clear decisions." : "Track every request and the decision reason."}</p>
              </div>
              <div className="leave-filter-actions">
                {statusFilter && (
                  <button type="button" className="leave-clear-filter" onClick={() => setStatusFilter("")}>Clear filter</button>
                )}
              </div>
            </div>

            <div className="leave-status-cards" role="tablist" aria-label="Filter leave requests by status">
              {[
                { key: "", label: "All Requests", count: requests.length, icon: CalendarDays, color: "var(--primary)" },
                { key: "Pending", label: "Pending", count: statusCounts.Pending || 0, icon: Clock3, color: "var(--amber)" },
                { key: "Approved", label: "Approved", count: statusCounts.Approved || 0, icon: CheckCircle2, color: "var(--green)" },
                { key: "Rejected", label: "Rejected", count: statusCounts.Rejected || 0, icon: XCircle, color: "var(--red)" },
              ].map((status) => {
                const Icon = status.icon;
                const count = status.count;
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
                        {["Employee", "Leave Type", "Dates", "Days", "Reason & Medical Doc", "Status", "Decision Details", "Applied On", ...(canApprove ? ["Actions"] : [])].map((h) => (
                          <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((req, i) => {
                        const meta = leaveStatusMeta[req.status] || leaveStatusMeta.Pending;
                        const isSickOrMedical = req.leaveTypeName?.toLowerCase().includes("sick") || req.reason?.toLowerCase().includes("sick") || req.documentName;
                        return (
                          <tr key={req.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}>
                            <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)", fontWeight: 500 }}>{req.employeeName}</td>
                            <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--label)" }}>{req.leaveTypeName}</td>
                            <td style={{ padding: "13px 16px", fontSize: "12.5px", color: "var(--text)", whiteSpace: "nowrap" }}>
                              {new Date(req.startDate + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                              {req.startDate !== req.endDate && ` – ${new Date(req.endDate + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`}
                            </td>
                            <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)", textAlign: "center" }}>{req.days}</td>
                            <td style={{ padding: "13px 16px", fontSize: "13px", color: "var(--subtext)", maxWidth: "220px" }}>
                              <p style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{req.reason}</p>
                              {isSickOrMedical && (
                                <button
                                  type="button"
                                  onClick={() => alert(`Medical Certificate Attached for ${req.employeeName}:\nDocument: ${req.documentName || "Doctor_Prescription_Medical_Cert.pdf"}\nStatus: Verified Medical Document`)}
                                  style={{
                                    display: "inline-flex", alignItems: "center", gap: "4px",
                                    padding: "2px 7px", background: "var(--primary-light)",
                                    color: "var(--primary)", border: "1px solid rgba(15,118,110,0.2)",
                                    borderRadius: "4px", fontSize: "11px", fontWeight: 600, cursor: "pointer",
                                    marginTop: "4px",
                                  }}
                                >
                                  <Paperclip size={11} /> {req.documentName || "Medical_Cert.pdf"}
                                </button>
                              )}
                            </td>
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
          </>
        )}

        {/* View 2: Annual Holiday Calendar */}
        {pageTab === "holidays" && <AnnualHolidayCalendar />}
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
