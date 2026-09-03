/**
 * Expense Management Page  •  Module 14
 * Tabs: My Claims (submit + track), Approvals (Manager/Finance queue).
 * Policy violations and possible duplicates are surfaced for approver
 * judgment, never used to silently block or auto-reject .
 */

import { useState, useEffect } from "react";
import { Plus, AlertTriangle, Paperclip, Check, X, Copy } from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import {
  getMyExpenseClaims, getPendingApprovals, submitExpenseClaim, approveClaim, rejectClaim,
} from "../../services/expenseService";
import { EXPENSE_CATEGORIES, EXPENSE_POLICY, expenseStatusMeta, LOCKED_STATUSES } from "../../mock/expenses";

const CURRENT_EMPLOYEE = { id: "EMP014", name: "Ananya Verma" };
const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const fmtAmount = (n) => `₹${n.toLocaleString("en-IN")}`;

function SubmitClaimModal({ isOpen, onClose, onSubmitted }) {
  const [form, setForm] = useState({ category: "", amount: "", expenseDate: "", businessPurpose: "", receiptFileName: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const policy = form.category ? EXPENSE_POLICY[form.category] : null;
  const amountNum = Number(form.amount) || 0;
  const receiptRequired = policy && amountNum > policy.receiptThreshold;
  const willFlagLimit = policy && amountNum > policy.limit;

  const validate = () => {
    const e = {};
    if (!form.category) e.category = "Select a category";
    if (!form.amount || amountNum <= 0) e.amount = "Enter a valid amount";
    if (!form.expenseDate) e.expenseDate = "Required";
    if (!form.businessPurpose.trim()) e.businessPurpose = "Please provide a business purpose";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    await submitExpenseClaim({
      employeeId: CURRENT_EMPLOYEE.id,
      employeeName: CURRENT_EMPLOYEE.name,
      category: form.category,
      amount: amountNum,
      expenseDate: form.expenseDate,
      businessPurpose: form.businessPurpose,
      receiptAttached: !!form.receiptFileName,
      receiptFileName: form.receiptFileName || null,
    });
    setSaving(false);
    onSubmitted();
    onClose();
    setForm({ category: "", amount: "", expenseDate: "", businessPurpose: "", receiptFileName: "" });
  };

  const inputStyle = (key) => ({
    width: "100%", height: "38px", padding: "0 12px",
    border: `1px solid ${errors[key] ? "var(--red)" : "var(--border)"}`,
    borderRadius: "var(--radius-sm)", fontSize: "13.5px",
    color: "var(--text)", outline: "none", background: "var(--card)",
  });

  return (
    <Modal isOpen={isOpen} title="Submit Expense Claim" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Category *</label>
          <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} style={inputStyle("category")}>
            <option value="">Select category</option>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c} (limit {fmtAmount(EXPENSE_POLICY[c].limit)})</option>)}
          </select>
          {errors.category && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.category}</span>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Amount (₹) *</label>
            <input type="number" min="0" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} style={inputStyle("amount")} />
            {errors.amount && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.amount}</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Expense Date *</label>
            <input type="date" value={form.expenseDate} onChange={(e) => setForm((p) => ({ ...p, expenseDate: e.target.value }))} style={inputStyle("expenseDate")} />
            {errors.expenseDate && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.expenseDate}</span>}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Business Purpose *</label>
          <textarea value={form.businessPurpose} onChange={(e) => setForm((p) => ({ ...p, businessPurpose: e.target.value }))} rows={2}
            placeholder="Why was this expense incurred?"
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${errors.businessPurpose ? "var(--red)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", fontSize: "13.5px", color: "var(--text)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
          {errors.businessPurpose && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.businessPurpose}</span>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>
            Receipt {receiptRequired ? "*" : "(optional below the threshold)"}
          </label>
          <input
            type="file" accept="image/*,application/pdf"
            onChange={(e) => setForm((p) => ({ ...p, receiptFileName: e.target.files?.[0]?.name || "" }))}
            style={{ fontSize: "12.5px" }}
          />
          {form.receiptFileName && <span style={{ fontSize: "11.5px", color: "var(--subtext)" }}>Attached: {form.receiptFileName}</span>}
        </div>

        {((receiptRequired && !form.receiptFileName) || willFlagLimit) && (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "var(--radius-sm)", padding: "10px 14px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#b45309", display: "flex", alignItems: "center", gap: "6px" }}>
              <AlertTriangle size={13} /> This claim will be flagged for your approver
            </p>
            {willFlagLimit && <p style={{ fontSize: "12px", color: "#92400e" }}>Amount exceeds the {form.category} limit of {fmtAmount(policy.limit)}</p>}
            {receiptRequired && !form.receiptFileName && <p style={{ fontSize: "12px", color: "#92400e" }}>Receipt required above {fmtAmount(policy.receiptThreshold)} for this category</p>}
            <p style={{ fontSize: "11.5px", color: "#92400e" }}>You can still submit  •  your approver can review and approve exceptions.</p>
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "none", color: "var(--label)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>Cancel</button>
          <button id="submit-claim-btn" type="submit" disabled={saving} style={{ padding: "9px 20px", border: "none", borderRadius: "var(--radius-sm)", background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: "13px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Submitting • " : "Submit Claim"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ViolationFlags({ claim }) {
  if (claim.violations.length === 0 && !claim.possibleDuplicateOf) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "4px" }}>
      {claim.violations.map((v, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11.5px", color: "#b45309" }}>
          <AlertTriangle size={11} /> {v}
        </span>
      ))}
      {claim.possibleDuplicateOf && (
        <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11.5px", color: "var(--red)" }}>
          <Copy size={11} /> Possible duplicate of {claim.possibleDuplicateOf}
        </span>
      )}
    </div>
  );
}

function RejectModal({ claim, onClose, onRejected }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleReject = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    await rejectClaim(claim.id, claim.approvalStage, reason.trim());
    setSaving(false);
    onRejected();
    onClose();
  };

  return (
    <Modal isOpen={!!claim} title={`Reject ${claim?.id}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Reason *</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
            placeholder="Let the employee know why this was rejected • "
            style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13.5px", color: "var(--text)", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "none", color: "var(--label)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>Cancel</button>
          <button onClick={handleReject} disabled={saving || !reason.trim()} style={{ padding: "9px 20px", border: "none", borderRadius: "var(--radius-sm)", background: "var(--red)", color: "#fff", fontWeight: 600, fontSize: "13px", cursor: saving ? "not-allowed" : "pointer", opacity: saving || !reason.trim() ? 0.6 : 1 }}>
            {saving ? "Rejecting • " : "Reject Claim"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function Expenses() {
  const [tab, setTab] = useState("mine");
  const [myClaims, setMyClaims] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubmit, setShowSubmit] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      getMyExpenseClaims(CURRENT_EMPLOYEE.id),
      Promise.all([getPendingApprovals("Manager"), getPendingApprovals("Finance")]),
    ]).then(([mineRes, [mgrRes, finRes]]) => {
      setMyClaims(mineRes.data);
      setApprovals([...mgrRes.data, ...finRes.data]);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const handleApprove = async (claim) => {
    await approveClaim(claim.id, claim.approvalStage);
    loadAll();
  };

  const tabs = [
    { id: "mine", label: "My Claims" },
    { id: "approvals", label: `Approvals${approvals.length ? ` (${approvals.length})` : ""}` },
  ];

  const rows = tab === "mine" ? myClaims : approvals;

  if (loading) return <MainLayout><Spinner /></MainLayout>;

  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <PageHeader title="Expense Management" subtitle="Submit and track out-of-pocket business expense claims">
          <button id="submit-claim-btn-header" onClick={() => setShowSubmit(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
            <Plus size={16} /> Submit Claim
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

        <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
          {rows.length === 0 ? (
            <EmptyState title={tab === "mine" ? "No expense claims yet" : "Nothing pending approval"} subtitle={tab === "mine" ? "Submit a claim using the button above." : "You're all caught up."} />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
                    {[tab === "approvals" ? "Employee" : null, "Category", "Amount", "Expense Date", "Purpose", "Status", tab === "approvals" ? "Actions" : "Receipt"].filter(Boolean).map((h) => (
                      <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((claim, i) => {
                    const meta = expenseStatusMeta[claim.status] || expenseStatusMeta.Draft;
                    const locked = LOCKED_STATUSES.includes(claim.status);
                    return (
                      <tr key={claim.id} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
                        {tab === "approvals" && (
                          <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap" }}>{claim.employeeName}</td>
                        )}
                        <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)" }}>{claim.category}</td>
                        <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)", fontWeight: 600 }}>{fmtAmount(claim.amount)}</td>
                        <td style={{ padding: "13px 16px", fontSize: "12.5px", color: "var(--subtext)", whiteSpace: "nowrap" }}>{fmtDate(claim.expenseDate)}</td>
                        <td style={{ padding: "13px 16px", fontSize: "13px", color: "var(--subtext)", maxWidth: "200px" }}>
                          {claim.businessPurpose}
                          <ViolationFlags claim={claim} />
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          <StatusBadge label={meta.label} color={meta.color} bg={meta.bg} />
                          {tab === "mine" && claim.status === "Rejected" && claim.rejectionReason && (
                            <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>{claim.rejectionReason}</p>
                          )}
                        </td>
                        {tab === "approvals" ? (
                          <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                id={`approve-${claim.id}-btn`}
                                onClick={() => handleApprove(claim)} disabled={locked}
                                style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", background: "var(--green-light)", color: "var(--green)", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "12px", cursor: locked ? "not-allowed" : "pointer" }}>
                                <Check size={13} /> Approve
                              </button>
                              <button
                                id={`reject-${claim.id}-btn`}
                                onClick={() => setRejectTarget(claim)} disabled={locked}
                                style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", background: "var(--red-light)", color: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "12px", cursor: locked ? "not-allowed" : "pointer" }}>
                                <X size={13} /> Reject
                              </button>
                            </div>
                          </td>
                        ) : (
                          <td style={{ padding: "13px 16px" }}>
                            {claim.receiptAttached ? (
                              <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "var(--subtext)" }}>
                                <Paperclip size={12} /> {claim.receiptFileName}
                              </span>
                            ) : (
                              <span style={{ fontSize: "12px", color: "var(--subtext)" }}> • </span>
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

      <SubmitClaimModal isOpen={showSubmit} onClose={() => setShowSubmit(false)} onSubmitted={loadAll} />
      <RejectModal claim={rejectTarget} onClose={() => setRejectTarget(null)} onRejected={loadAll} />
    </MainLayout>
  );
}