/**
 * Travel Management Page — Module 15
 * Tabs: My Travel • Approvals • Travel Desk
 */

import { useState, useEffect } from "react";
import {
  Plane,
  ClipboardCheck,
  Briefcase,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  IndianRupee,
  ReceiptText,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import { useAuth } from "../../context/AuthContext";
import { uploadExpenseReceipt } from "../../services/expenseService";
import {
  getAllRequests,
  raiseRequest,
  cancelTravelRequest,
  managerDecision,
  financeDecision,
  attemptApiBooking,
  confirmManualBooking,
  disburseAdvance,
  submitSettlement,
  resolveSettlementBalance,
  closeZeroBalanceSettlement,
  getMaskedPassportRef,
  resubmitRequest,
  editPendingTravelRequest,
  requestMoreDetails,
} from "../../services/travelService";
import { TRAVEL_MODES, requestStatusMeta, travelPolicy } from "../../mock/travel";

const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const fmtTripDates = (start, end) => start === end ? fmtDate(start) : `${fmtDate(start)} – ${fmtDate(end)}`;
const firstDateAfter = (dateOnly) => {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return fmtDate(new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10));
};
const fmtINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const travelToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

function travelEventLabel(event) {
  if (event.action === "ADVANCE_DISBURSED") return `Advance disbursed ${event.comment || ""}`.trim();
  const labels = {
    MANAGER_APPROVE: "Manager approval",
    FINANCE_APPROVE: "Finance approval",
    MANAGER_REJECT: "Manager rejection",
    FINANCE_REJECT: "Finance rejection",
    SETTLEMENT_CLOSED: "Settlement closed",
    SETTLEMENT_SUBMITTED: "Settlement submitted",
    EDIT_RESUBMIT: "Edited and resubmitted",
    CANCEL: "Request cancelled",
    AUTO_EXPIRED: "Automatically expired",
    EXPIRED_ADVANCE_RECOVERY: "Expired — advance recovery required",
    BOOKING_FAILED: "Booking needs travel-desk action",
    BOOK: "Booking confirmed",
  };
  return labels[event.action] || String(event.action || event.newStatus).replaceAll("_", " ");
}

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

function RequestSummaryCard({ req, children }) {
  const meta = requestStatusMeta[req.status] || { color: "#475569", bg: "#f1f5f9" };
  return (
    <div style={{ ...cardStyle, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
        <div>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>{req.destination}</h3>
          <p style={{ fontSize: "12px", color: "var(--subtext)" }}>{req.employeeName} • {req.mode} • {fmtTripDates(req.startDate, req.endDate)}</p>
        </div>
        <StatusBadge label={req.status} color={meta.color} bg={meta.bg} />
      </div>
      <p style={{ fontSize: "12.5px", color: "var(--subtext)", marginBottom: "8px" }}>{req.purpose}</p>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
        <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--subtext)", background: "var(--background)", padding: "2px 8px", borderRadius: "99px" }}>Est. {fmtINR(req.estimatedCost)}</span>
        {req.isInternational && <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#7c3aed", background: "#f5f3ff", padding: "2px 8px", borderRadius: "99px" }}>International</span>}
        {req.advance && <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#16a34a", background: "#f0fdf4", padding: "2px 8px", borderRadius: "99px" }}>Advance {fmtINR(req.advance.amount)}</span>}
        {req.booking?.reference && <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--subtext)", background: "var(--background)", padding: "2px 8px", borderRadius: "99px" }}>{req.booking.reference}</span>}
        {req.requestNumber && <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--primary)", background: "#ecfeff", padding: "2px 8px", borderRadius: "99px" }}>{req.requestNumber}</span>}
      </div>
      {req.history?.length > 0 && <p style={{ fontSize: "10.5px", color: "var(--subtext)", margin: "0 0 10px" }}>{req.history.length} audit event{req.history.length === 1 ? "" : "s"}</p>}
      {["Pending Manager Approval", "Resubmitted", "Pending Finance Approval"].includes(req.status) && req.currentApprover && (
        <p style={{ fontSize: "11.5px", color: "var(--subtext)", margin: "0 0 8px" }}>
          Current approver: <strong style={{ color: "var(--label)" }}>{req.currentApprover}</strong>
        </p>
      )}
      {req.adminOverrides?.map((override, index) => (
        <p key={`${override.step}-${index}`} style={{ fontSize: "11.5px", color: "#92400e", margin: "0 0 8px" }}>
          Admin override recorded: {override.actorName || "Administrator"} approved the {override.step} step.
        </p>
      ))}
      {req.booking?.bookingFailed && (
        <p style={{ fontSize: "11.5px", color: "var(--red)", display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px" }}>
          <AlertTriangle size={13} /> Booking is being handled by the Travel Desk.
        </p>
      )}
      {req.settlement && (
        <p style={{ fontSize: "12px", color: req.settlement.balance === 0 ? "var(--subtext)" : "#d97706", marginBottom: "8px" }}>
          Settlement: actual {fmtINR(req.settlement.actualCost)}
          {req.settlement.balance > 0 ? ` • ${fmtINR(req.settlement.balance)} ${req.settlement.balanceType}` : " • No balance due"}
          {req.settlement.resolution && req.settlement.balance !== 0 && ` • resolved via ${req.settlement.resolution.method}`}
          {req.settlement.resolution?.reference && ` (${req.settlement.resolution.reference})`}
        </p>
      )}
      {req.history?.length > 0 && (
        <details style={{ marginBottom: "10px" }}>
          <summary style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", cursor: "pointer" }}>Status history</summary>
          <div style={{ borderLeft: "2px solid var(--border)", margin: "8px 0 0 4px", paddingLeft: "12px", display: "grid", gap: "7px" }}>
            {req.history.map((event) => (
              <div key={event.id} style={{ fontSize: "11.5px", color: "var(--subtext)" }}>
                <strong style={{ color: "var(--label)" }}>{travelEventLabel(event)}</strong> by {event.actorName}
                {event.comment ? ` — ${event.comment}` : ""}
              </div>
            ))}
          </div>
        </details>
      )}
      {children}
    </div>
  );
}

/* ---------------------------------- My Travel tab ---------------------------------- */

function RaiseRequestModal({ isOpen, onClose, onSaved, request = null }) {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [mode, setMode] = useState(TRAVEL_MODES[0]);
  const [estimatedCost, setEstimatedCost] = useState("");
  const [isInternational, setIsInternational] = useState(false);
  const [passportRef, setPassportRef] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setDestination(request?.destination || "");
      setStartDate(request?.startDate || "");
      setEndDate(request?.endDate || "");
      setPurpose(request?.purpose || "");
      setMode(request?.mode || TRAVEL_MODES[0]);
      setEstimatedCost(request?.estimatedCost || "");
      setIsInternational(Boolean(request?.isInternational));
      setError("");
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, request]);

  useEffect(() => {
    if (isInternational) {
      getMaskedPassportRef().then((res) => setPassportRef(res.data));
    }
  }, [isInternational]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const today = travelToday();
    if (!destination.trim() || !startDate || !endDate || !purpose.trim() || !estimatedCost) {
      setError("Complete all required fields before submitting.");
      return;
    }
    if (startDate < today) {
      setError("Start date cannot be in the past.");
      return;
    }
    if (endDate < startDate) {
      setError("End date must be on or after the start date.");
      return;
    }
    const cost = Number(estimatedCost);
    if (!Number.isFinite(cost) || cost <= 0 || cost > 10_000_000) {
      setError("Estimated cost must be greater than zero and no more than ₹10,000,000.");
      return;
    }
    setError("");
    setSaving(true);
    const payload = {
      destination: destination.trim(), startDate, endDate, purpose: purpose.trim(),
      mode, estimatedCost, isInternational,
    };
    try {
      const res = !request
        ? await raiseRequest(payload)
        : request.status === "More Details Required"
          ? await resubmitRequest(request.id, payload)
          : await editPendingTravelRequest(request.id, payload);
      onSaved(res.data);
      onClose();
      setDestination(""); setStartDate(""); setEndDate(""); setPurpose(""); setEstimatedCost(""); setIsInternational(false);
    } catch (submitError) {
      setError(submitError.message || "Could not save the travel request.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title={request ? "Edit & Resubmit Travel Request" : "Raise Travel Request"} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Destination *")}
          <input value={destination} onChange={(e) => setDestination(e.target.value)} style={inputStyle()} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Start Date *")}
            <input type="date" min={travelToday()} value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle()} required />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("End Date *")}
            <input type="date" min={startDate || travelToday()} value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle()} required />
          </div>
        </div>
        <p style={{ fontSize: "11.5px", color: "var(--subtext)", margin: "-8px 0 0" }}>
          Policy: trips are limited to 90 days; requests above {fmtINR(travelPolicy.financeApprovalThreshold)} require Manager and Finance approval. Advances are capped at {travelPolicy.advanceMaxPercent}% of the estimate and settlement is available only after the trip ends.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Purpose *")}
          <textarea rows={2} value={purpose} onChange={(e) => setPurpose(e.target.value)} style={{ ...inputStyle(), resize: "vertical" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Mode *")}
            <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ ...inputStyle(), height: "38px", cursor: "pointer" }}>
              {TRAVEL_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Estimated Cost (₹) *")}
            <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--card)" }}>
              <span aria-hidden="true" style={{ paddingLeft: "12px", color: "var(--subtext)", fontSize: "13px" }}>₹</span>
              <input aria-label="Estimated cost in rupees" type="number" min={1} max={10000000} step="0.01" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} style={{ ...inputStyle(), border: "none" }} required />
            </div>
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--label)", cursor: "pointer" }}>
          <input type="checkbox" checked={isInternational} onChange={(e) => setIsInternational(e.target.checked)} />
          International travel
        </label>
        <p style={{ fontSize: "11.5px", color: "var(--subtext)", margin: "-10px 0 0 24px" }}>
          International requests require passport details on your HR record and may need additional travel-desk review.
        </p>
        {isInternational && (
          <p style={{ fontSize: "11.5px", color: "var(--subtext)", display: "flex", alignItems: "center", gap: "6px", margin: 0 }}>
            <ShieldCheck size={13} />
            {passportRef ? `Passport on file (${passportRef}) — pulled securely from your HR record at booking time.` : "No passport on file — Travel Desk will need this added to your HR record before booking."}
          </p>
        )}
        {error && <p role="alert" style={{ fontSize: "12px", color: "var(--red)", margin: 0 }}>{error}</p>}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving..." : request?.status === "More Details Required" ? "Resubmit Request" : request ? "Save & Resubmit" : "Submit Request"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function SubmitSettlementModal({ isOpen, onClose, request, onSaved }) {
  const [actualCost, setActualCost] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const amount = actualCost === "" ? null : Number(actualCost);
  const advance = Number(request?.advance?.amount || 0);
  const balance = amount == null || !Number.isFinite(amount) ? null : amount - advance;
  const itemizedRows = items.filter((item) => item.description.trim() || item.amount !== "");
  const itemizedTotal = itemizedRows.reduce((total, item) => total + (Number(item.amount) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (actualCost === "" || !Number.isFinite(amount) || amount < 0 || amount > 9_999_999_999.99) {
      setError("Enter a valid actual cost from ₹0 to ₹9,999,999,999.99.");
      return;
    }
    if (itemizedRows.some((item) => !item.description.trim() || item.amount === "" || !Number.isFinite(Number(item.amount)) || Number(item.amount) < 0)) {
      setError("Complete the description and amount for every itemized expense.");
      return;
    }
    if (itemizedRows.length && Math.round(itemizedTotal * 100) !== Math.round(amount * 100)) {
      setError("Itemized expenses must add up to the actual cost.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await submitSettlement(request.id, actualCost, notes.trim(), itemizedRows.map((item) => ({ description: item.description.trim(), amount: Number(item.amount) })));
      onSaved(res.data);
      onClose();
      setActualCost(""); setNotes(""); setItems([]);
    } catch (submitError) {
      setError(submitError.message || "Could not submit the settlement.");
    } finally {
      setSaving(false);
    }
  };

  if (!request) return null;

  return (
    <Modal isOpen={isOpen} title={`Settle — ${request.destination}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ padding: "10px 12px", background: "var(--background)", borderRadius: "8px", display: "grid", gap: "5px", fontSize: "12.5px", color: "var(--subtext)" }}>
          <span>Trip: <strong style={{ color: "var(--text)" }}>{fmtTripDates(request.startDate, request.endDate)}</strong></span>
          <span>Estimate: <strong style={{ color: "var(--text)" }}>{fmtINR(request.estimatedCost)}</strong></span>
          <span>Approved advance: <strong style={{ color: "var(--text)" }}>{fmtINR(advance)}</strong></span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Actual Cost (₹) *")}
          <input aria-label="Actual cost in rupees" type="number" min={0} max={9_999_999_999.99} step="0.01" value={actualCost} onChange={(e) => { setActualCost(e.target.value); setError(""); }} style={inputStyle()} required />
        </div>
        {amount != null && Number.isFinite(amount) && amount > Number(request.estimatedCost) && (
          <p style={{ fontSize: "11.5px", color: "#92400e", background: "#fffbeb", padding: "8px 10px", borderRadius: "6px", margin: 0 }}>
            This exceeds the estimate by {fmtINR(amount - Number(request.estimatedCost))}. The Travel Desk may review the overage and determine whether additional approval is needed.
          </p>
        )}
        {balance != null && Number.isFinite(balance) && (
          <p aria-live="polite" style={{ fontSize: "13px", fontWeight: 700, color: balance > 0 ? "#15803d" : balance < 0 ? "#d97706" : "var(--subtext)", margin: 0 }}>
            {balance > 0 ? `Company owes you ${fmtINR(balance)}` : balance < 0 ? `You owe ${fmtINR(Math.abs(balance))}` : "No balance due"}
          </p>
        )}
        <div style={{ display: "grid", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
            {fieldLabel("Itemized expenses (optional)")}
            <SecondaryButton type="button" onClick={() => setItems((current) => [...current, { id: `${Date.now()}-${current.length}`, description: "", amount: "" }])} style={{ padding: "5px 8px", fontSize: "11px" }}>Add item</SecondaryButton>
          </div>
          {items.map((item, index) => (
            <div key={item.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 130px auto", gap: "6px" }}>
              <input aria-label={`Expense item ${index + 1} description`} value={item.description} onChange={(event) => setItems((current) => current.map((row) => row.id === item.id ? { ...row, description: event.target.value } : row))} placeholder="Expense description" style={inputStyle()} />
              <input aria-label={`Expense item ${index + 1} amount`} type="number" min="0" step="0.01" value={item.amount} onChange={(event) => setItems((current) => current.map((row) => row.id === item.id ? { ...row, amount: event.target.value } : row))} placeholder="₹ amount" style={inputStyle()} />
              <SecondaryButton type="button" aria-label={`Remove expense item ${index + 1}`} onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))} style={{ padding: "5px 8px", fontSize: "11px" }}>Remove</SecondaryButton>
            </div>
          ))}
          {itemizedRows.length > 0 && <span style={{ fontSize: "11px", color: "var(--subtext)" }}>Itemized total: {fmtINR(itemizedTotal)}</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Notes")}
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle(), resize: "vertical" }} />
        </div>
        <p style={{ fontSize: "11.5px", color: "var(--subtext)", margin: 0 }}>You can upload receipts after submitting the settlement. If itemization is entered, its total must match the actual cost.</p>
        {error && <p role="alert" style={{ fontSize: "12px", color: "var(--red)", margin: 0 }}>{error}</p>}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Submitting..." : "Submit Settlement"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function TravelReceiptUpload({ claimId }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      const receipts = [];
      for (const file of files) {
        const digest = await window.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
        const fileHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
        const receipt = await uploadExpenseReceipt(claimId, file, fileHash);
        receipts.push(receipt.fileName || file.name);
      }
      setUploadedFiles((current) => [...current, ...receipts]);
    } catch (uploadError) {
      setError(uploadError.message || "Receipt upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div style={{ display: "grid", gap: "6px", marginTop: "10px" }}>
      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--primary)" }}>
        {uploading ? "Uploading receipts..." : "Upload receipts"}
        <input type="file" accept="image/jpeg,image/png,application/pdf" multiple disabled={uploading} onChange={handleFiles} style={{ display: "block", marginTop: "5px", fontSize: "11px", color: "var(--subtext)" }} />
      </label>
      {uploadedFiles.map((fileName, index) => <span key={`${fileName}-${index}`} style={{ fontSize: "11px", color: "var(--subtext)" }}>Uploaded: {fileName}</span>)}
      {error && <p role="alert" style={{ fontSize: "11px", color: "var(--red)", margin: 0 }}>{error}</p>}
    </div>
  );
}

function MyTravelTab({ requests, onRequestAdded, onRequestUpdated, employeeId }) {
  const [showRaise, setShowRaise] = useState(false);
  const [settleTarget, setSettleTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelSaving, setCancelSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const allMyRequests = requests.filter((r) => r.employeeId === employeeId);
  const normalizedSearch = search.trim().toLowerCase();
  const myRequests = allMyRequests.filter((request) =>
    (statusFilter === "ALL" || request.status === statusFilter) &&
    (!normalizedSearch || [request.requestNumber, request.destination, request.purpose, request.mode, request.currentApprover]
      .some((value) => String(value || "").toLowerCase().includes(normalizedSearch)))
  );
  const cancellableStatuses = ["Pending Manager Approval", "More Details Required", "Resubmitted", "Pending Finance Approval", "Approved", "Booking In Progress"];

  const submitCancellation = async (event) => {
    event.preventDefault();
    if (!cancelTarget || !cancelReason.trim()) {
      setCancelError("A cancellation reason is required.");
      return;
    }
    setCancelSaving(true);
    setCancelError("");
    try {
      const result = await cancelTravelRequest(cancelTarget.id, cancelReason.trim());
      onRequestUpdated(result.data);
      setCancelTarget(null);
      setCancelReason("");
    } catch (error) {
      setCancelError(error.message || "Could not cancel this request.");
    } finally {
      setCancelSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>My Travel</h2>
        <PrimaryButton onClick={() => setShowRaise(true)}><Plus size={16} /> Raise Travel Request</PrimaryButton>
      </div>

      {allMyRequests.length > 0 && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
          <input aria-label="Search my travel requests" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search destination, request or approver" style={{ ...inputStyle(), flex: "1 1 240px" }} />
          <select aria-label="Filter my travel requests by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ ...inputStyle(), width: "auto", minWidth: "190px" }}>
            <option value="ALL">All statuses ({allMyRequests.length})</option>
            {[...new Set(allMyRequests.map((request) => request.status))].sort().map((status) => (
              <option key={status} value={status}>{status} ({allMyRequests.filter((request) => request.status === status).length})</option>
            ))}
          </select>
        </div>
      )}

      {allMyRequests.length === 0 ? (
        <EmptyState icon={Plane} title="No travel requests yet" />
      ) : myRequests.length === 0 ? (
        <EmptyState icon={Plane} title="No matching travel requests" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
          {myRequests.map((req) => (
            <RequestSummaryCard key={req.id} req={req}>
              {req.status === "Booked" && (
                (() => {
                  const tripEnded = req.endDate < travelToday();
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <PrimaryButton disabled={!tripEnded} title={!tripEnded ? `Available from ${firstDateAfter(req.endDate)}.` : "Submit trip costs for settlement."} onClick={() => setSettleTarget(req)}>
                        Submit Settlement
                      </PrimaryButton>
                      {!tripEnded && <span style={{ fontSize: "11.5px", color: "var(--subtext)" }}>Trip not completed yet — available from {firstDateAfter(req.endDate)}.</span>}
                    </div>
                  );
                })()
              )}
              {req.status === "Settlement Submitted" && req.linkedExpenseClaimId && (
                <TravelReceiptUpload claimId={req.linkedExpenseClaimId} />
              )}
              {["Pending Manager Approval", "Resubmitted"].includes(req.status) && (
                <button onClick={() => setEditTarget(req)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>
                  Edit Request
                </button>
              )}
              {req.status === "More Details Required" && (
                <button onClick={() => setEditTarget(req)} style={{ fontSize: "12px", fontWeight: 700, color: "#d97706", border: "none", background: "none", cursor: "pointer" }}>
                  Edit & Resubmit
                </button>
              )}
              {cancellableStatuses.includes(req.status) && (
                <SecondaryButton onClick={() => { setCancelTarget(req); setCancelReason(""); setCancelError(""); }}>
                  Cancel Request
                </SecondaryButton>
              )}
            </RequestSummaryCard>
          ))}
        </div>
      )}

      <RaiseRequestModal isOpen={showRaise} onClose={() => setShowRaise(false)} onSaved={onRequestAdded} />
      <RaiseRequestModal isOpen={!!editTarget} request={editTarget} onClose={() => setEditTarget(null)} onSaved={onRequestUpdated} />
      <SubmitSettlementModal isOpen={!!settleTarget} onClose={() => setSettleTarget(null)} request={settleTarget} onSaved={onRequestUpdated} />
      <Modal isOpen={!!cancelTarget} title={`Cancel — ${cancelTarget?.requestNumber || "travel request"}`} onClose={() => !cancelSaving && setCancelTarget(null)}>
        <form onSubmit={submitCancellation} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ fontSize: "12.5px", color: "var(--subtext)", margin: 0 }}>{cancelTarget?.destination} • {fmtTripDates(cancelTarget?.startDate, cancelTarget?.endDate)}</p>
          {Number(cancelTarget?.advance?.amount || 0) > 0 && (
            <p style={{ fontSize: "12px", color: "#92400e", background: "#fffbeb", padding: "9px 11px", borderRadius: "6px", margin: 0 }}>
              An advance of {fmtINR(cancelTarget.advance.amount)} has been disbursed. Cancelling creates a settlement requiring recovery before this request can close.
            </p>
          )}
          <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>
            Cancellation reason *
            <textarea autoFocus rows={3} maxLength={1000} required value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} style={{ ...inputStyle(), resize: "vertical" }} />
          </label>
          {cancelError && <p role="alert" style={{ color: "var(--red)", fontSize: "12px", margin: 0 }}>{cancelError}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <SecondaryButton type="button" onClick={() => setCancelTarget(null)} disabled={cancelSaving}>Keep Request</SecondaryButton>
            <PrimaryButton type="submit" disabled={cancelSaving || !cancelReason.trim()}>{cancelSaving ? "Cancelling..." : "Confirm Cancel"}</PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ---------------------------------- Approvals tab ---------------------------------- */

function ApprovalsTab({ requests, onRequestUpdated, role }) {
  const pendingManager = role === "MANAGER" ? requests.filter((r) => ["Pending Manager Approval", "Resubmitted"].includes(r.status)) : [];
  const pendingFinance = ["FINANCE", "ADMIN"].includes(role) ? requests.filter((r) => r.status === "Pending Finance Approval") : [];

  const handleManagerDecision = async (id, approved) => {
    const comment = approved ? window.prompt("Approval comment (optional):") || undefined : window.prompt("Rejection reason (required):");
    if (!approved && !comment?.trim()) return;
    const res = await managerDecision(id, approved, undefined, comment);
    if (res.data.request) onRequestUpdated(res.data.request);
  };
  const handleFinanceDecision = async (id, approved) => {
    const comment = approved ? window.prompt("Finance comment (optional):") || undefined : window.prompt("Rejection reason (required):");
    if (!approved && !comment?.trim()) return;
    const res = await financeDecision(id, approved, undefined, comment);
    if (res.data.request) onRequestUpdated(res.data.request);
  };

  if (pendingManager.length === 0 && pendingFinance.length === 0) {
    return <EmptyState icon={ClipboardCheck} title="No approvals pending" />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {pendingManager.length > 0 && (
        <div>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "12px" }}>Pending Manager Approval</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {pendingManager.map((req) => (
              <div key={req.id} style={{ ...cardStyle, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)" }}>{req.employeeName} → {req.destination}</p>
                  <p style={{ fontSize: "12px", color: "var(--subtext)" }}>{req.purpose} • Est. {fmtINR(req.estimatedCost)} • {fmtTripDates(req.startDate, req.endDate)}</p>
                  {req.estimatedCost > travelPolicy.financeApprovalThreshold && (
                    <p style={{ fontSize: "11px", color: "#d97706", marginTop: "4px" }}>Above ₹{travelPolicy.financeApprovalThreshold.toLocaleString("en-IN")} — will also need Finance approval.</p>
                  )}
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={() => handleManagerDecision(req.id, true)} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button onClick={() => handleManagerDecision(req.id, false)} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, color: "var(--red)", border: "none", background: "none", cursor: "pointer" }}>
                    <XCircle size={14} /> Reject
                  </button>
                  <button onClick={async () => { const comment = window.prompt("What details are missing? (required)"); if (!comment?.trim()) return; const res = await requestMoreDetails(req.id, comment); if (res.data.request) onRequestUpdated(res.data.request); }} style={{ fontSize: "12px", fontWeight: 700, color: "#d97706", border: "none", background: "none", cursor: "pointer" }}>
                    More Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingFinance.length > 0 && (
        <div>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "12px" }}>Pending Finance Approval</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {pendingFinance.map((req) => (
              <div key={req.id} style={{ ...cardStyle, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)" }}>{req.employeeName} → {req.destination}</p>
                  <p style={{ fontSize: "12px", color: "var(--subtext)" }}>Est. {fmtINR(req.estimatedCost)} — manager-approved by {req.managerApproval?.by}</p>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={() => handleFinanceDecision(req.id, true)} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button onClick={() => handleFinanceDecision(req.id, false)} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, color: "var(--red)", border: "none", background: "none", cursor: "pointer" }}>
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- Travel Desk tab ---------------------------------- */

function ManualBookingModal({ isOpen, onClose, request, onSaved }) {
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!reference.trim()) return;
    setSaving(true);
    const res = await confirmManualBooking(request.id, reference.trim());
    setSaving(false);
    if (res.data.request) onSaved(res.data.request);
    onClose();
    setReference("");
  };

  if (!request) return null;

  return (
    <Modal isOpen={isOpen} title={`Confirm Manual Booking — ${request.destination}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Booking Reference *")}
          <input value={reference} onChange={(e) => setReference(e.target.value)} style={inputStyle()} placeholder="e.g. TKT-90211" />
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleConfirm} disabled={saving || !reference.trim()}>{saving ? "Confirming..." : "Confirm Booking"}</PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

function DisburseAdvanceModal({ isOpen, onClose, request, onSaved }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const maxAdvance = request ? Math.floor(request.estimatedCost * (travelPolicy.advanceMaxPercent / 100)) : 0;
  const validAmount = amount !== "" && Number.isFinite(Number(amount)) && Number(amount) > 0 && Number(amount) <= maxAdvance;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validAmount) {
      setError(`Enter an amount greater than ₹0 and no more than ${fmtINR(maxAdvance)}.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await disburseAdvance(request.id, amount, "Finance Desk");
      onSaved(res.data.request);
      onClose();
      setAmount("");
    } catch (submitError) {
      setError(submitError.message || "Could not disburse the advance.");
    } finally {
      setSaving(false);
    }
  };

  if (!request) return null;

  return (
    <Modal isOpen={isOpen} title={`Disburse Advance — ${request.destination}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ padding: "10px 12px", background: "var(--background)", borderRadius: "8px", display: "grid", gap: "5px", fontSize: "12.5px", color: "var(--subtext)" }}>
          <span>Employee: <strong style={{ color: "var(--text)" }}>{request.employeeName}</strong></span>
          <span>Trip: <strong style={{ color: "var(--text)" }}>{fmtTripDates(request.startDate, request.endDate)} — {request.destination}</strong></span>
          <span>Estimated cost: <strong style={{ color: "var(--text)" }}>{fmtINR(request.estimatedCost)}</strong></span>
        </div>
        <p style={{ fontSize: "12.5px", color: "var(--subtext)", margin: 0 }}>
          Policy cap: {travelPolicy.advanceMaxPercent}% of estimated cost — max {fmtINR(maxAdvance)}. An advance is eligible after approval; booking confirmation is not required.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Advance Amount (₹) *")}
          <input aria-label="Advance amount in rupees" type="number" min="0.01" max={maxAdvance} step="0.01" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} style={inputStyle()} required />
        </div>
        {error && <p style={{ fontSize: "12px", color: "var(--red)" }}>{error}</p>}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Disbursing..." : "Disburse Advance"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function ResolveSettlementModal({ isOpen, onClose, request, onSaved }) {
  const [method, setMethod] = useState(request?.settlement?.balanceType === "Due to Employee" ? "Reimbursed" : "Refunded");
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await resolveSettlementBalance(request.id, method, note.trim(), reference.trim());
      onSaved(res.data.request);
      onClose();
      setNote("");
      setReference("");
    } catch (submitError) {
      setError(submitError.message || "Could not resolve the settlement.");
    } finally {
      setSaving(false);
    }
  };

  if (!request) return null;

  return (
    <Modal isOpen={isOpen} title={`Resolve Balance — ${request.destination}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <p style={{ fontSize: "12.5px", color: "var(--subtext)", margin: 0 }}>
          {fmtINR(request.settlement.balance)} {request.settlement.balanceType} — record the payment or recovery before closing.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel(request.settlement.balanceType === "Due to Employee" ? "Payment Method *" : "Recovery Method *")}
          <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ ...inputStyle(), height: "38px", cursor: "pointer" }}>
            {request.settlement.balanceType === "Due to Employee" ? (
              <option value="Reimbursed">Reimbursed</option>
            ) : (
              <>
                <option value="Refunded">Refunded</option>
                <option value="Payroll Deduction">Payroll Deduction</option>
                <option value="Written Off">Written Off (requires approval)</option>
              </>
            )}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Payment / transaction reference")}
          <input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={120} style={inputStyle()} placeholder="Optional reference number" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Note")}
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} style={{ ...inputStyle(), resize: "vertical" }} />
        </div>
        {error && <p style={{ fontSize: "12px", color: "var(--red)" }}>{error}</p>}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose} disabled={saving}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Resolving..." : "Resolve & Close"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function TravelDeskTab({ requests, onRequestUpdated }) {
  const [manualBookingTarget, setManualBookingTarget] = useState(null);
  const [advanceTarget, setAdvanceTarget] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);

  const { role, user } = useAuth();
  const canManageBookings = ["HR", "ADMIN"].includes(role);
  const canManageFinances = ["FINANCE", "ADMIN"].includes(role);
  const needsBooking = requests.filter((r) => r.status === "Approved" || r.status === "Booking In Progress");
  const canDisburseAdvance = requests.filter((r) => ["Approved", "Booking In Progress", "Booked"].includes(r.status) && !r.advance && r.employeeId !== user?.id);
  const settlementsToClose = requests.filter((r) => r.status === "Settlement Submitted");
  const isPastTrip = (request) => request.startDate < travelToday();

  const handleApiBooking = async (req) => {
    const res = await attemptApiBooking(req.id, { simulateFailure: false });
    if (res.data.request) onRequestUpdated(res.data.request);
  };

  const handleZeroBalanceClose = async (id) => {
    const res = await closeZeroBalanceSettlement(id, "Finance Desk");
    if (res.data.request) onRequestUpdated(res.data.request);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {canManageBookings && <div>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
          <Briefcase size={15} /> Bookings
        </h2>
        {needsBooking.length === 0 ? (
          <EmptyState icon={Briefcase} title="Nothing awaiting booking" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {needsBooking.map((req) => (
              (() => {
                const pastTrip = isPastTrip(req);
                return (
              <div key={req.id} style={{ ...cardStyle, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)" }}>{req.employeeName} → {req.destination}{req.isInternational ? " (international)" : ""}</p>
                  <p style={{ fontSize: "11px", color: "var(--subtext)", marginTop: "3px" }}>{req.requestNumber}</p>
                  <p style={{ fontSize: "12px", color: "var(--subtext)" }}>{req.status} • {req.mode} • {fmtTripDates(req.startDate, req.endDate)} • Est. {fmtINR(req.estimatedCost)}</p>
                  {pastTrip && <p style={{ fontSize: "11.5px", color: "var(--red)", marginTop: "4px" }}>Past trip — booking is disabled.</p>}
                  {req.booking?.bookingFailed && (
                    <p style={{ fontSize: "11.5px", color: "var(--red)", marginTop: "4px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <AlertTriangle size={13} /> {req.booking.failureNote}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button disabled={pastTrip} title={pastTrip ? "Past trips cannot be booked." : "Book this approved trip"} onClick={() => handleApiBooking(req)} style={{ fontSize: "12px", fontWeight: 700, color: pastTrip ? "var(--subtext)" : "var(--primary)", border: "1px solid var(--border)", borderRadius: "6px", background: pastTrip ? "var(--background)" : "var(--card)", padding: "7px 10px", cursor: pastTrip ? "not-allowed" : "pointer", opacity: pastTrip ? 0.55 : 1 }}>
                    {req.status === "Booking In Progress" ? "Retry API Booking" : "Book via API"}
                  </button>
                  {req.status === "Booking In Progress" && (
                    <button disabled={pastTrip} title={pastTrip ? "Past trips cannot be booked." : "Confirm a manually arranged booking"} onClick={() => setManualBookingTarget(req)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--subtext)", border: "1px solid var(--border)", borderRadius: "6px", background: pastTrip ? "var(--background)" : "var(--card)", padding: "7px 10px", cursor: pastTrip ? "not-allowed" : "pointer", opacity: pastTrip ? 0.55 : 1 }}>
                      Confirm Manually
                    </button>
                  )}
                </div>
              </div>
                );
              })()
            ))}
          </div>
        )}
      </div>}

      {canManageFinances && <div>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
          <IndianRupee size={15} /> Advance Disbursement
        </h2>
        {canDisburseAdvance.length === 0 ? (
          <EmptyState icon={IndianRupee} title="No advances pending" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {canDisburseAdvance.map((req) => (
              (() => {
                const pastTrip = isPastTrip(req);
                return (
              <div key={req.id} style={{ ...cardStyle, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)" }}>{req.employeeName} → {req.destination}</p>
                  <p style={{ fontSize: "11px", color: "var(--subtext)", marginTop: "3px" }}>{req.requestNumber}</p>
                  <p style={{ fontSize: "12px", color: "var(--subtext)" }}>{req.status} • {fmtTripDates(req.startDate, req.endDate)} • Est. {fmtINR(req.estimatedCost)} • cap {fmtINR(Math.floor(req.estimatedCost * (travelPolicy.advanceMaxPercent / 100)))}</p>
                  {pastTrip && <p style={{ fontSize: "11.5px", color: "var(--red)", marginTop: "4px" }}>Past trip — advance is disabled.</p>}
                </div>
                <button disabled={pastTrip} title={pastTrip ? "Advances cannot be disbursed for past trips." : "Advance is permitted after approval, including while booking is in progress."} onClick={() => setAdvanceTarget(req)} style={{ fontSize: "12px", fontWeight: 700, color: pastTrip ? "var(--subtext)" : "var(--primary)", border: "1px solid var(--border)", borderRadius: "6px", background: pastTrip ? "var(--background)" : "var(--card)", padding: "7px 10px", cursor: pastTrip ? "not-allowed" : "pointer", opacity: pastTrip ? 0.55 : 1 }}>
                  Disburse Advance
                </button>
              </div>
                );
              })()
            ))}
          </div>
        )}
      </div>}

      {canManageFinances && <div>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
          <ReceiptText size={15} /> Settlements to Close
        </h2>
        {settlementsToClose.length === 0 ? (
          <EmptyState icon={ReceiptText} title="No settlements awaiting close-out" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {settlementsToClose.map((req) => (
              <div key={req.id} style={{ ...cardStyle, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)" }}>{req.employeeName} → {req.destination}</p>
                  <p style={{ fontSize: "11px", color: "var(--subtext)", marginTop: "3px" }}>{req.requestNumber}</p>
                  <p style={{ fontSize: "12px", color: "var(--subtext)" }}>
                    Actual {fmtINR(req.settlement.actualCost)} vs advance {fmtINR(req.settlement.advanceGiven)}
                    {req.settlement.balance > 0 ? ` • ${fmtINR(req.settlement.balance)} ${req.settlement.balanceType === "Due to Employee" ? "Company owes employee" : "Employee owes company"}` : " • balanced"}
                  </p>
                  <details style={{ marginTop: "8px" }}>
                    <summary style={{ fontSize: "11.5px", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}>
                      Status history ({req.history?.length || 0} event{req.history?.length === 1 ? "" : "s"})
                    </summary>
                    <div style={{ display: "grid", gap: "6px", marginTop: "8px" }}>
                      {(req.history || []).map((event) => (
                        <p key={event.id} style={{ fontSize: "11px", color: "var(--subtext)", margin: 0 }}>
                          <strong>{travelEventLabel(event)}</strong> by {event.actorName}{event.comment ? ` — ${event.comment}` : ""}
                        </p>
                      ))}
                    </div>
                  </details>
                </div>
                {req.employeeId === user?.id ? (
                  <span style={{ fontSize: "11.5px", color: "var(--subtext)" }}>You cannot close your own settlement.</span>
                ) : req.settlement.balance === 0 ? (
                  <PrimaryButton onClick={() => handleZeroBalanceClose(req.id)} style={{ padding: "7px 12px", fontSize: "12px" }}>
                    Close — No balance due
                  </PrimaryButton>
                ) : (
                  <PrimaryButton onClick={() => setResolveTarget(req)} style={{ padding: "7px 12px", fontSize: "12px" }}>
                    Resolve Balance
                  </PrimaryButton>
                )}
              </div>
            ))}
          </div>
        )}
      </div>}

      <ManualBookingModal isOpen={!!manualBookingTarget} onClose={() => setManualBookingTarget(null)} request={manualBookingTarget} onSaved={onRequestUpdated} />
      <DisburseAdvanceModal isOpen={!!advanceTarget} onClose={() => setAdvanceTarget(null)} request={advanceTarget} onSaved={onRequestUpdated} />
      <ResolveSettlementModal key={resolveTarget?.id || "closed"} isOpen={!!resolveTarget} onClose={() => setResolveTarget(null)} request={resolveTarget} onSaved={onRequestUpdated} />
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

const TABS = [
  { key: "myTravel", label: "My Travel", icon: Plane },
  { key: "approvals", label: "Approvals", icon: ClipboardCheck },
  { key: "travelDesk", label: "Travel Desk", icon: Briefcase },
];

export default function Travel() {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState("myTravel");
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const tabs = TABS.filter((tab) => tab.key === "myTravel" || (tab.key === "approvals" && ["MANAGER", "FINANCE", "ADMIN"].includes(role)) || (tab.key === "travelDesk" && ["HR", "FINANCE", "ADMIN"].includes(role)));

  useEffect(() => {
    getAllRequests()
      .then((res) => setRequests(res.data))
      .finally(() => setLoading(false));
  }, []);

  const handleRequestAdded = (req) => {
    setRequests((prev) => [req, ...prev]);
  };

  const handleRequestUpdated = (req) => {
    setRequests((prev) => prev.map((r) => (r.id === req.id ? req : r)));
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
        <PageHeader title="Travel Management" subtitle="Requests, approvals, bookings, advances and expense settlement" />
        <TabNav tabs={tabs} active={activeTab} onChange={setActiveTab} />

        {activeTab === "myTravel" && (
          <MyTravelTab requests={requests} employeeId={user?.id} onRequestAdded={handleRequestAdded} onRequestUpdated={handleRequestUpdated} />
        )}

        {activeTab === "approvals" && (
          <ApprovalsTab requests={requests} role={role} onRequestUpdated={handleRequestUpdated} />
        )}

        {activeTab === "travelDesk" && (
          <TravelDeskTab requests={requests} onRequestUpdated={handleRequestUpdated} />
        )}
      </div>
    </MainLayout>
  );
}
