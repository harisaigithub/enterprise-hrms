/**
 * Travel Management Page � Module 15
 * Tabs: My Travel � Approvals � Travel Desk
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
import {
  getAllRequests,
  raiseRequest,
  managerDecision,
  financeDecision,
  attemptApiBooking,
  confirmManualBooking,
  disburseAdvance,
  submitSettlement,
  resolveSettlementBalance,
  closeZeroBalanceSettlement,
  getMaskedPassportRef,
} from "../../services/travelService";
import { TRAVEL_MODES, requestStatusMeta, travelPolicy, employeeGradeDirectory } from "../../mock/travel";

const ME = { id: "EMP001", name: "Matsya Singh", grade: "L4" };
const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const fmtINR = (n) => `?${Number(n).toLocaleString("en-IN")}`;

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
  const meta = requestStatusMeta[req.status];
  return (
    <div style={{ ...cardStyle, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
        <div>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>{req.destination}</h3>
          <p style={{ fontSize: "12px", color: "var(--subtext)" }}>{req.employeeName} � {req.mode} � {fmtDate(req.startDate)} � {fmtDate(req.endDate)}</p>
        </div>
        <StatusBadge label={req.status} color={meta.color} bg={meta.bg} />
      </div>
      <p style={{ fontSize: "12.5px", color: "var(--subtext)", marginBottom: "8px" }}>{req.purpose}</p>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
        <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--subtext)", background: "var(--background)", padding: "2px 8px", borderRadius: "99px" }}>Est. {fmtINR(req.estimatedCost)}</span>
        {req.isInternational && <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#7c3aed", background: "#f5f3ff", padding: "2px 8px", borderRadius: "99px" }}>International</span>}
        {req.advance && <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#16a34a", background: "#f0fdf4", padding: "2px 8px", borderRadius: "99px" }}>Advance {fmtINR(req.advance.amount)}</span>}
        {req.booking?.reference && <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--subtext)", background: "var(--background)", padding: "2px 8px", borderRadius: "99px" }}>{req.booking.reference}</span>}
      </div>
      {req.booking?.bookingFailed && (
        <p style={{ fontSize: "11.5px", color: "var(--red)", display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px" }}>
          <AlertTriangle size={13} /> {req.booking.failureNote}
        </p>
      )}
      {req.settlement && (
        <p style={{ fontSize: "12px", color: req.settlement.balance === 0 ? "var(--subtext)" : "#d97706", marginBottom: "8px" }}>
          Settlement: actual {fmtINR(req.settlement.actualCost)}
          {req.settlement.balance > 0 ? ` � ${fmtINR(req.settlement.balance)} ${req.settlement.balanceType}` : " � balanced"}
          {req.settlement.resolution && ` � resolved via ${req.settlement.resolution.method}`}
        </p>
      )}
      {children}
    </div>
  );
}

/* ---------------------------------- My Travel tab ---------------------------------- */

function RaiseRequestModal({ isOpen, onClose, onSaved }) {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [mode, setMode] = useState(TRAVEL_MODES[0]);
  const [estimatedCost, setEstimatedCost] = useState("");
  const [isInternational, setIsInternational] = useState(false);
  const [passportRef, setPassportRef] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isInternational) {
      getMaskedPassportRef(ME.id).then((res) => setPassportRef(res.data));
    }
  }, [isInternational]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!destination.trim() || !startDate || !endDate || !purpose.trim() || !estimatedCost) return;
    setSaving(true);
    const res = await raiseRequest({
      employeeId: ME.id, employeeName: ME.name, grade: ME.grade,
      destination: destination.trim(), startDate, endDate, purpose: purpose.trim(),
      mode, estimatedCost, isInternational,
    });
    setSaving(false);
    onSaved(res.data);
    onClose();
    setDestination(""); setStartDate(""); setEndDate(""); setPurpose(""); setEstimatedCost(""); setIsInternational(false);
  };

  return (
    <Modal isOpen={isOpen} title="Raise Travel Request" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Destination *")}
          <input value={destination} onChange={(e) => setDestination(e.target.value)} style={inputStyle()} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Start Date *")}
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle()} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("End Date *")}
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle()} />
          </div>
        </div>
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
            {fieldLabel("Estimated Cost (?) *")}
            <input type="number" min={1} value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} style={inputStyle()} />
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--label)", cursor: "pointer" }}>
          <input type="checkbox" checked={isInternational} onChange={(e) => setIsInternational(e.target.checked)} />
          International travel
        </label>
        {isInternational && (
          <p style={{ fontSize: "11.5px", color: "var(--subtext)", display: "flex", alignItems: "center", gap: "6px", margin: 0 }}>
            <ShieldCheck size={13} />
            {passportRef ? `Passport on file (${passportRef}) � pulled securely from your HR record at booking time.` : "No passport on file � Travel Desk will need this added to your HR record before booking."}
          </p>
        )}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Submitting�" : "Submit Request"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function SubmitSettlementModal({ isOpen, onClose, request, onSaved }) {
  const [actualCost, setActualCost] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!actualCost) return;
    setSaving(true);
    const res = await submitSettlement(request.id, actualCost, notes.trim());
    setSaving(false);
    onSaved(res.data);
    onClose();
    setActualCost(""); setNotes("");
  };

  if (!request) return null;

  return (
    <Modal isOpen={isOpen} title={`Settle � ${request.destination}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <p style={{ fontSize: "12.5px", color: "var(--subtext)", margin: 0 }}>
          Advance given: <strong>{fmtINR(request.advance?.amount || 0)}</strong>
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Actual Cost (?) *")}
          <input type="number" min={0} value={actualCost} onChange={(e) => setActualCost(e.target.value)} style={inputStyle()} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Notes")}
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle(), resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Submitting�" : "Submit Settlement"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function MyTravelTab({ requests, onRequestAdded, onRequestUpdated }) {
  const [showRaise, setShowRaise] = useState(false);
  const [settleTarget, setSettleTarget] = useState(null);

  const myRequests = requests.filter((r) => r.employeeId === ME.id);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>My Travel</h2>
        <PrimaryButton onClick={() => setShowRaise(true)}><Plus size={16} /> Raise Travel Request</PrimaryButton>
      </div>

      {myRequests.length === 0 ? (
        <EmptyState icon={Plane} title="No travel requests yet" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
          {myRequests.map((req) => (
            <RequestSummaryCard key={req.id} req={req}>
              {req.status === "Booked" && (
                <button onClick={() => setSettleTarget(req)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>
                  Submit Settlement
                </button>
              )}
            </RequestSummaryCard>
          ))}
        </div>
      )}

      <RaiseRequestModal isOpen={showRaise} onClose={() => setShowRaise(false)} onSaved={onRequestAdded} />
      <SubmitSettlementModal isOpen={!!settleTarget} onClose={() => setSettleTarget(null)} request={settleTarget} onSaved={onRequestUpdated} />
    </div>
  );
}

/* ---------------------------------- Approvals tab ---------------------------------- */

function ApprovalsTab({ requests, onRequestUpdated }) {
  const pendingManager = requests.filter((r) => r.status === "Pending Manager Approval");
  const pendingFinance = requests.filter((r) => r.status === "Pending Finance Approval");

  const handleManagerDecision = async (id, approved) => {
    const res = await managerDecision(id, approved, "Alice Quinn");
    if (res.data.request) onRequestUpdated(res.data.request);
  };
  const handleFinanceDecision = async (id, approved) => {
    const res = await financeDecision(id, approved, "Finance Desk");
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
                  <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)" }}>{req.employeeName} ? {req.destination}</p>
                  <p style={{ fontSize: "12px", color: "var(--subtext)" }}>{req.purpose} � Est. {fmtINR(req.estimatedCost)} � {fmtDate(req.startDate)}�{fmtDate(req.endDate)}</p>
                  {req.estimatedCost > travelPolicy.financeApprovalThreshold && (
                    <p style={{ fontSize: "11px", color: "#d97706", marginTop: "4px" }}>Above ?{travelPolicy.financeApprovalThreshold.toLocaleString("en-IN")} � will also need Finance approval.</p>
                  )}
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={() => handleManagerDecision(req.id, true)} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button onClick={() => handleManagerDecision(req.id, false)} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, color: "var(--red)", border: "none", background: "none", cursor: "pointer" }}>
                    <XCircle size={14} /> Reject
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
                  <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)" }}>{req.employeeName} ? {req.destination}</p>
                  <p style={{ fontSize: "12px", color: "var(--subtext)" }}>Est. {fmtINR(req.estimatedCost)} � manager-approved by {req.managerApproval?.by}</p>
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
    <Modal isOpen={isOpen} title={`Confirm Manual Booking � ${request.destination}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Booking Reference *")}
          <input value={reference} onChange={(e) => setReference(e.target.value)} style={inputStyle()} placeholder="e.g. TKT-90211" />
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleConfirm} disabled={saving || !reference.trim()}>{saving ? "Confirming�" : "Confirm Booking"}</PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

function DisburseAdvanceModal({ isOpen, onClose, request, onSaved }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const maxAdvance = request ? Math.round(request.estimatedCost * (travelPolicy.advanceMaxPercent / 100)) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount) return;
    setSaving(true);
    const res = await disburseAdvance(request.id, amount, "Finance Desk");
    setSaving(false);
    if (res.data.error) {
      setError(res.data.error);
      return;
    }
    setError("");
    onSaved(res.data.request);
    onClose();
    setAmount("");
  };

  if (!request) return null;

  return (
    <Modal isOpen={isOpen} title={`Disburse Advance � ${request.destination}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <p style={{ fontSize: "12.5px", color: "var(--subtext)", margin: 0 }}>
          Policy cap: {travelPolicy.advanceMaxPercent}% of estimated cost � max {fmtINR(maxAdvance)}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Advance Amount (?) *")}
          <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle()} />
        </div>
        {error && <p style={{ fontSize: "12px", color: "var(--red)" }}>{error}</p>}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Disbursing�" : "Disburse Advance"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function ResolveSettlementModal({ isOpen, onClose, request, onSaved }) {
  const [method, setMethod] = useState("Refunded");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await resolveSettlementBalance(request.id, method, note.trim(), "Finance Desk");
    setSaving(false);
    if (res.data.error) {
      setError(res.data.error);
      return;
    }
    setError("");
    onSaved(res.data.request);
    onClose();
    setNote("");
  };

  if (!request) return null;

  return (
    <Modal isOpen={isOpen} title={`Resolve Balance � ${request.destination}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <p style={{ fontSize: "12.5px", color: "var(--subtext)", margin: 0 }}>
          {fmtINR(request.settlement.balance)} {request.settlement.balanceType} � must be recorded before this settlement can close.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Resolution Method *")}
          <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ ...inputStyle(), height: "38px", cursor: "pointer" }}>
            <option value="Refunded">Refunded</option>
            <option value="Payroll Deduction">Payroll Deduction</option>
            <option value="Written Off">Written Off (requires approval)</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Note")}
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} style={{ ...inputStyle(), resize: "vertical" }} />
        </div>
        {error && <p style={{ fontSize: "12px", color: "var(--red)" }}>{error}</p>}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Resolving�" : "Resolve & Close"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function TravelDeskTab({ requests, onRequestUpdated }) {
  const [manualBookingTarget, setManualBookingTarget] = useState(null);
  const [advanceTarget, setAdvanceTarget] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);

  const needsBooking = requests.filter((r) => r.status === "Approved" || r.status === "Booking In Progress");
  const canDisburseAdvance = requests.filter((r) => ["Approved", "Booking In Progress", "Booked"].includes(r.status) && !r.advance);
  const settlementsToClose = requests.filter((r) => r.status === "Settlement Submitted");

  const handleApiBooking = async (req) => {
    // Simulated 50/50 failure for requests not already in a failed state, to
    // demonstrate the manual fallback path from 15.8.
    const simulateFailure = req.status !== "Booking In Progress" && Math.random() < 0.4;
    const res = await attemptApiBooking(req.id, { simulateFailure });
    if (res.data.request) onRequestUpdated(res.data.request);
  };

  const handleZeroBalanceClose = async (id) => {
    const res = await closeZeroBalanceSettlement(id, "Finance Desk");
    if (res.data.request) onRequestUpdated(res.data.request);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
          <Briefcase size={15} /> Bookings
        </h2>
        {needsBooking.length === 0 ? (
          <EmptyState icon={Briefcase} title="Nothing awaiting booking" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {needsBooking.map((req) => (
              <div key={req.id} style={{ ...cardStyle, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)" }}>{req.employeeName} ? {req.destination}{req.isInternational ? " (international)" : ""}</p>
                  <p style={{ fontSize: "12px", color: "var(--subtext)" }}>{req.mode} � {fmtDate(req.startDate)}</p>
                  {req.booking?.bookingFailed && (
                    <p style={{ fontSize: "11.5px", color: "var(--red)", marginTop: "4px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <AlertTriangle size={13} /> {req.booking.failureNote}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => handleApiBooking(req)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>
                    {req.status === "Booking In Progress" ? "Retry API Booking" : "Book via API"}
                  </button>
                  {req.status === "Booking In Progress" && (
                    <button onClick={() => setManualBookingTarget(req)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--subtext)", border: "none", background: "none", cursor: "pointer" }}>
                      Confirm Manually
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
          <IndianRupee size={15} /> Advance Disbursement
        </h2>
        {canDisburseAdvance.length === 0 ? (
          <EmptyState icon={IndianRupee} title="No advances pending" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {canDisburseAdvance.map((req) => (
              <div key={req.id} style={{ ...cardStyle, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)" }}>{req.employeeName} ? {req.destination}</p>
                  <p style={{ fontSize: "12px", color: "var(--subtext)" }}>Est. {fmtINR(req.estimatedCost)} � cap {fmtINR(Math.round(req.estimatedCost * (travelPolicy.advanceMaxPercent / 100)))}</p>
                </div>
                <button onClick={() => setAdvanceTarget(req)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>
                  Disburse Advance
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
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
                  <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)" }}>{req.employeeName} ? {req.destination}</p>
                  <p style={{ fontSize: "12px", color: "var(--subtext)" }}>
                    Actual {fmtINR(req.settlement.actualCost)} vs advance {fmtINR(req.settlement.advanceGiven)}
                    {req.settlement.balance > 0 ? ` � ${fmtINR(req.settlement.balance)} ${req.settlement.balanceType}` : " � balanced"}
                  </p>
                </div>
                {req.settlement.balance === 0 ? (
                  <button onClick={() => handleZeroBalanceClose(req.id)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>
                    Close (no balance)
                  </button>
                ) : (
                  <button onClick={() => setResolveTarget(req)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>
                    Resolve Balance
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ManualBookingModal isOpen={!!manualBookingTarget} onClose={() => setManualBookingTarget(null)} request={manualBookingTarget} onSaved={onRequestUpdated} />
      <DisburseAdvanceModal isOpen={!!advanceTarget} onClose={() => setAdvanceTarget(null)} request={advanceTarget} onSaved={onRequestUpdated} />
      <ResolveSettlementModal isOpen={!!resolveTarget} onClose={() => setResolveTarget(null)} request={resolveTarget} onSaved={onRequestUpdated} />
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
  const [activeTab, setActiveTab] = useState("myTravel");
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    setLoading(true);
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
        <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {activeTab === "myTravel" && (
          <MyTravelTab requests={requests} onRequestAdded={handleRequestAdded} onRequestUpdated={handleRequestUpdated} />
        )}

        {activeTab === "approvals" && (
          <ApprovalsTab requests={requests} onRequestUpdated={handleRequestUpdated} />
        )}

        {activeTab === "travelDesk" && (
          <TravelDeskTab requests={requests} onRequestUpdated={handleRequestUpdated} />
        )}
      </div>
    </MainLayout>
  );
}