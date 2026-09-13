/**
 * Expense Management Page • Module 14
 * Indian IT Corporate standard with prominent Claim IDs,
 * Employee IDs, clickable approval inspection rows,
 * and in-modal approver review workflow.
 */

import { useState, useEffect } from "react";
import {
  Plus,
  AlertTriangle,
  Paperclip,
  Check,
  X,
  Copy,
  Eye,
  FileText,
  Download,
  ShieldCheck,
} from "lucide-react";

import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";

import {
  getMyExpenseClaims,
  getPendingApprovals,
  submitExpenseClaim,
  approveClaim,
  rejectClaim,
  createDraft,
  uploadExpenseReceipt,
  getReceiptSignedUrl,
} from "../../services/expenseService";

import {
  EXPENSE_CATEGORIES,
  EXPENSE_POLICY,
  expenseStatusMeta,
  LOCKED_STATUSES,
} from "../../mock/expenses";

import { useAuth } from "../../context/AuthContext";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const fmtDate = (value) => {
  if (!value) return "—";

  const dateString = String(value);

  const date = dateString.includes("T")
    ? new Date(dateString)
    : new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const fmtAmount = (value) => {
  const amount = Number(value) || 0;
  return `₹${amount.toLocaleString("en-IN")}`;
};

const getClaimDisplayId = (claim) => {
  return claim?.claimNumber || claim?.id || "—";
};

const calculateFileHash = async (file) => {
  if (!file) return "";

  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

/* -------------------------------------------------------------------------- */
/* Expense Detail Modal                                                       */
/* -------------------------------------------------------------------------- */

function ExpenseDetailModal({
  claim,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onViewReceipt,
  isApprover,
}) {
  if (!claim) return null;

  const meta =
    expenseStatusMeta[claim.status] || expenseStatusMeta.Draft;

  const locked = LOCKED_STATUSES.includes(claim.status);

  const policy =
    EXPENSE_POLICY[claim.category] || {
      limit: 10000,
      receiptThreshold: 500,
    };

  const amount = Number(claim.amount) || 0;

  const isOverLimit = amount > Number(policy.limit || 0);

  const requiresReceipt =
    amount > Number(policy.receiptThreshold || 0);

  const receiptAttached =
    Boolean(claim.receiptAttached) ||
    Boolean(claim.receiptPending === false) ||
    Boolean(claim.receipts?.length);

  const duplicateClaimId =
    claim.possibleDuplicateOf ||
    claim.duplicateWarning?.claimId ||
    null;

  const policyViolations =
    Array.isArray(claim.policyViolations)
      ? claim.policyViolations
      : Array.isArray(claim.violations)
        ? claim.violations
        : [];

  return (
    <Modal
      isOpen={isOpen}
      title={`Expense Claim Inspection — ${getClaimDisplayId(claim)}`}
      onClose={onClose}
      maxWidth="680px"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* Header Hero Card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--background)",
            padding: "16px 20px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 800,
                  fontFamily: "monospace",
                  background: "var(--primary-light)",
                  color: "var(--primary)",
                  padding: "3px 9px",
                  borderRadius: "4px",
                }}
              >
                {getClaimDisplayId(claim)}
              </span>

              <StatusBadge
                label={meta.label}
                color={meta.color}
                bg={meta.bg}
              />
            </div>

            <p
              style={{
                margin: "6px 0 0",
                fontSize: "13px",
                color: "var(--subtext)",
              }}
            >
              Submitted on{" "}
              {claim.submittedAt
                ? fmtDate(claim.submittedAt)
                : claim.submittedOn
                  ? fmtDate(claim.submittedOn)
                  : "—"}{" "}
              • Stage:{" "}
              <strong>
                {claim.approvalStage || "Manager"} Review
              </strong>
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "var(--subtext)",
              }}
            >
              Claim Amount
            </span>

            <p
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: 800,
                color: "var(--text)",
              }}
            >
              {fmtAmount(claim.amount)}
            </p>
          </div>
        </div>

        {/* Employee & Context Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "14px",
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--subtext)",
                textTransform: "uppercase",
              }}
            >
              Claimant Employee
            </span>

            <p
              style={{
                margin: "4px 0 0",
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              {claim.employeeName || "—"}
            </p>

            <span
              style={{
                display: "inline-block",
                fontSize: "11.5px",
                fontFamily: "monospace",
                color: "var(--primary)",
                fontWeight: 700,
                marginTop: "2px",
              }}
            >
              ID: {claim.employeeId || "—"}
            </span>
          </div>

          <div
            style={{
              padding: "12px 14px",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--subtext)",
                textTransform: "uppercase",
              }}
            >
              Expense Category & Date
            </span>

            <p
              style={{
                margin: "4px 0 0",
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              {claim.category || "—"}
            </p>

            <span
              style={{
                fontSize: "12px",
                color: "var(--subtext)",
              }}
            >
              Incurred on {fmtDate(claim.expenseDate)}
            </span>
          </div>
        </div>

        {/* Purpose */}
        <div
          style={{
            padding: "14px 16px",
            background: "var(--background)",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--subtext)",
              textTransform: "uppercase",
            }}
          >
            Official Business Purpose
          </span>

          <p
            style={{
              margin: "6px 0 0",
              fontSize: "13.5px",
              color: "var(--text)",
              lineHeight: 1.5,
            }}
          >
            {claim.businessPurpose || "—"}
          </p>
        </div>

        {/* Policy & Duplicate Audit Verification */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "14px 16px",
            background: "var(--card)",
          }}
        >
          <span
            style={{
              fontSize: "11.5px",
              fontWeight: 700,
              color: "var(--subtext)",
              textTransform: "uppercase",
              display: "block",
              marginBottom: "8px",
            }}
          >
            Automated Audit & Compliance Checks
          </span>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                color: isOverLimit
                  ? "var(--amber)"
                  : "var(--green)",
              }}
            >
              <ShieldCheck size={16} />

              <span>
                Category Cap Limit: {fmtAmount(policy.limit)}{" "}
                (
                {isOverLimit
                  ? "Exceeds soft limit; requires manager waiver"
                  : "Within authorized single-claim limit"}
                )
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                color:
                  requiresReceipt && !receiptAttached
                    ? "var(--red)"
                    : "var(--green)",
              }}
            >
              <ShieldCheck size={16} />

              <span>
                Tax Invoice Threshold:{" "}
                {fmtAmount(policy.receiptThreshold)} (
                {receiptAttached
                  ? "GST Tax invoice attached and verified"
                  : "No receipt attached"}
                )
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                color: duplicateClaimId
                  ? "var(--red)"
                  : "var(--green)",
              }}
            >
              <ShieldCheck size={16} />

              <span>
                Duplicate Claim Detection:{" "}
                {duplicateClaimId
                  ? `Potential duplicate of claim ${duplicateClaimId}`
                  : "Zero duplicate submissions found"}
              </span>
            </div>
          </div>

          {/* Policy violations */}
          {policyViolations.length > 0 && (
            <div
              style={{
                marginTop: "12px",
                paddingTop: "10px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--subtext)",
                  textTransform: "uppercase",
                }}
              >
                Policy Violations
              </span>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  marginTop: "6px",
                }}
              >
                {policyViolations.map((violation, index) => (
                  <span
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "12px",
                      color: "var(--amber)",
                    }}
                  >
                    <AlertTriangle size={12} />
                    {String(violation)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Receipt Attachment */}
        {receiptAttached && (
          <div
            style={{
              padding: "14px 16px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              background: "var(--background)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <FileText
                size={20}
                style={{ color: "var(--primary)" }}
              />

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  {claim.receiptFileName ||
                    claim.receipts?.[0]?.fileName ||
                    "Receipt attached"}
                </p>

                <span
                  style={{
                    fontSize: "11.5px",
                    color: "var(--subtext)",
                  }}
                >
                  Original merchant receipt
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onViewReceipt?.(claim)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--primary)",
                cursor: "pointer",
              }}
            >
              <Download size={13} />
              View Invoice
            </button>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid var(--border)",
            paddingTop: "16px",
          }}
        >
          <div>
            {isApprover && !locked && (
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onApprove(claim);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 18px",
                    background: "var(--green)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  <Check size={14} />
                  Approve Claim
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onReject(claim);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    background: "var(--red-light)",
                    color: "var(--red)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  <X size={14} />
                  Reject Claim
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 18px",
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--label)",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Submit Claim Modal                                                         */
/* -------------------------------------------------------------------------- */

function SubmitClaimModal({
  isOpen,
  onClose,
  onSubmitted,
}) {
  const [form, setForm] = useState({
    category: "",
    amount: "",
    expenseDate: "",
    businessPurpose: "",
    receiptFileName: "",
    receiptFile: null,
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const policy = form.category
    ? EXPENSE_POLICY[form.category]
    : null;

  const amountNum = Number(form.amount) || 0;

  const validate = () => {
    const e = {};

    if (!form.category) {
      e.category = "Select a category";
    }

    if (!form.amount || amountNum <= 0) {
      e.amount = "Enter a valid amount";
    }

    if (!form.expenseDate) {
      e.expenseDate = "Required";
    }

    if (!form.businessPurpose.trim()) {
      e.businessPurpose =
        "Please provide a business purpose";
    } else if (form.businessPurpose.trim().length < 10) {
      e.businessPurpose =
        "Business purpose must be at least 10 characters";
    }

    setErrors(e);

    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);

    try {
      const draft = await createDraft({
        category: form.category,
        amount: amountNum,
        expenseDate: form.expenseDate,
        businessPurpose: form.businessPurpose.trim(),
      });

      if (!draft?.id) {
        throw new Error("Expense draft was not created");
      }

      if (form.receiptFile) {
        const fileHash = await calculateFileHash(form.receiptFile);

        await uploadExpenseReceipt(
          draft.id,
          form.receiptFile,
          fileHash
        );
      }

      await submitExpenseClaim(draft.id);

      onSubmitted();
      onClose();

      setForm({
        category: "",
        amount: "",
        expenseDate: "",
        businessPurpose: "",
        receiptFileName: "",
        receiptFile: null,
      });

      setErrors({});
    } catch (err) {
      console.error(
        "Failed to submit expense claim:",
        err
      );

      alert(
        err?.response?.data?.message ||
          "Failed to submit claim. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = (key) => ({
    width: "100%",
    height: "38px",
    padding: "0 12px",
    border: `1px solid ${
      errors[key]
        ? "var(--red)"
        : "var(--border)"
    }`,
    borderRadius: "var(--radius-sm)",
    fontSize: "13.5px",
    color: "var(--text)",
    outline: "none",
    background: "var(--card)",
  });

  return (
    <Modal
      isOpen={isOpen}
      title="Submit Expense Claim (Indian IT Corporate)"
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Category */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          <label
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--label)",
            }}
          >
            Category *
          </label>

          <select
            value={form.category}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                category: e.target.value,
              }))
            }
            style={inputStyle("category")}
          >
            <option value="">Select category</option>

            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}{" "}
                (limit{" "}
                {fmtAmount(
                  EXPENSE_POLICY[category].limit
                )}
                )
              </option>
            ))}
          </select>

          {errors.category && (
            <span
              style={{
                fontSize: "11px",
                color: "var(--red)",
              }}
            >
              {errors.category}
            </span>
          )}
        </div>

        {/* Amount + Date */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            <label
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--label)",
              }}
            >
              Amount (₹) *
            </label>

            <input
              type="number"
              min="0"
              value={form.amount}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  amount: e.target.value,
                }))
              }
              style={inputStyle("amount")}
            />

            {policy && (
              <span
                style={{
                  fontSize: "10.5px",
                  color: "var(--subtext)",
                }}
              >
                Policy limit:{" "}
                {fmtAmount(policy.limit)}
              </span>
            )}

            {errors.amount && (
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--red)",
                }}
              >
                {errors.amount}
              </span>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            <label
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--label)",
              }}
            >
              Expense Date *
            </label>

            <input
              type="date"
              value={form.expenseDate}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  expenseDate: e.target.value,
                }))
              }
              style={inputStyle("expenseDate")}
            />

            {errors.expenseDate && (
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--red)",
                }}
              >
                {errors.expenseDate}
              </span>
            )}
          </div>
        </div>

        {/* Business Purpose */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          <label
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--label)",
            }}
          >
            Business Purpose *
          </label>

          <textarea
            value={form.businessPurpose}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                businessPurpose: e.target.value,
              }))
            }
            rows={3}
            placeholder="E.g. Client lunch with Infosys stakeholders at Outer Ring Road, Bengaluru"
            style={{
              width: "100%",
              padding: "10px 12px",
              border: `1px solid ${
                errors.businessPurpose
                  ? "var(--red)"
                  : "var(--border)"
              }`,
              borderRadius: "var(--radius-sm)",
              fontSize: "13.5px",
              color: "var(--text)",
              outline: "none",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />

          {errors.businessPurpose && (
            <span
              style={{
                fontSize: "11px",
                color: "var(--red)",
              }}
            >
              {errors.businessPurpose}
            </span>
          )}
        </div>

        {/* Receipt */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          <label
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--label)",
            }}
          >
            Attach Tax Invoice / Receipt (PDF, JPG, PNG)
          </label>

          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;

              setForm((p) => ({
                ...p,
                receiptFile: file,
                receiptFileName: file?.name || "",
              }));
            }}
            style={{
              fontSize: "12.5px",
              color: "var(--subtext)",
            }}
          />

          {form.receiptFileName && (
            <span
              style={{
                fontSize: "11.5px",
                color: "var(--primary)",
                fontWeight: 600,
              }}
            >
              Attached: {form.receiptFileName}
            </span>
          )}

          <span
            style={{
              fontSize: "10.5px",
              color: "var(--subtext)",
            }}
          >
            Receipt is uploaded securely to MinIO when
            you submit the claim.
          </span>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
            marginTop: "8px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 20px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background: "none",
              color: "var(--label)",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            id="submit-claim-btn"
            type="submit"
            disabled={saving}
            style={{
              padding: "9px 20px",
              border: "none",
              borderRadius: "var(--radius-sm)",
              background: "var(--primary)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "13px",
              cursor: saving
                ? "not-allowed"
                : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving
              ? "Submitting…"
              : "Submit Claim"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Violation Flags                                                            */
/* -------------------------------------------------------------------------- */

function ViolationFlags({ claim }) {
  const violations = Array.isArray(
    claim?.policyViolations
  )
    ? claim.policyViolations
    : Array.isArray(claim?.violations)
      ? claim.violations
      : [];

  const possibleDuplicateOf =
    claim?.possibleDuplicateOf ||
    claim?.duplicateWarning?.claimId ||
    null;

  if (
    violations.length === 0 &&
    !possibleDuplicateOf
  ) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "3px",
        marginTop: "4px",
      }}
    >
      {violations.map((violation, index) => (
        <span
          key={index}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "11.5px",
            color: "var(--amber)",
          }}
        >
          <AlertTriangle size={11} />
          {String(violation)}
        </span>
      ))}

      {possibleDuplicateOf && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "11.5px",
            color: "var(--red)",
          }}
        >
          <Copy size={11} />
          Possible duplicate of{" "}
          {possibleDuplicateOf}
        </span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Reject Modal                                                               */
/* -------------------------------------------------------------------------- */

function RejectModal({
  claim,
  onClose,
  onRejected,
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleReject = async () => {
    if (!reason.trim() || !claim) return;

    setSaving(true);

    try {
      await rejectClaim(
        claim.id,
        claim.approvalStage,
        reason.trim()
      );

      onRejected();
      onClose();
      setReason("");
    } catch (err) {
      console.error(
        "Failed to reject claim:",
        err
      );

      alert(
        err?.response?.data?.message ||
          "Failed to reject claim."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={!!claim}
      title={`Reject Claim: ${getClaimDisplayId(claim)}`}
      onClose={onClose}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          <label
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--label)",
            }}
          >
            Rejection Reason *
          </label>

          <textarea
            value={reason}
            onChange={(e) =>
              setReason(e.target.value)
            }
            rows={3}
            placeholder="Let the employee know why this claim was rejected…"
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13.5px",
              color: "var(--text)",
              outline: "none",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 20px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background: "none",
              color: "var(--label)",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleReject}
            disabled={
              saving || !reason.trim()
            }
            style={{
              padding: "9px 20px",
              border: "none",
              borderRadius: "var(--radius-sm)",
              background: "var(--red)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "13px",
              cursor: saving
                ? "not-allowed"
                : "pointer",
              opacity:
                saving || !reason.trim()
                  ? 0.6
                  : 1,
            }}
          >
            {saving
              ? "Rejecting…"
              : "Reject Claim"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Expense Page                                                          */
/* -------------------------------------------------------------------------- */

export default function Expenses() {
  const {
    user,
    role,
    permissions,
  } = useAuth();

  const canApprove =
    role === "MANAGER" ||
    role === "ADMIN" ||
    role === "HR" ||
    Boolean(
      permissions?.includes(
        "expenses:approve"
      )
    );

  /*
   * IMPORTANT:
   * Do not send this employee ID to GET /expense/claims.
   * Backend already identifies the logged-in employee.
   */
  const currentEmpId =
    user?.employeeCode ||
    user?.employeeId ||
    user?.id ||
    "";

  const currentEmpName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : user?.name || "Current Employee";

  const [tab, setTab] = useState("mine");

  const [myClaims, setMyClaims] = useState([]);
  const [approvals, setApprovals] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showSubmit, setShowSubmit] =
    useState(false);

  const [selectedClaim, setSelectedClaim] =
    useState(null);

  const [rejectTarget, setRejectTarget] =
    useState(null);

  /* ---------------------------------------------------------------------- */
  /* Load claims                                                            */
  /* ---------------------------------------------------------------------- */

  const loadAll = async () => {
    setLoading(true);

    try {
      /*
       * getMyExpenseClaims() already returns:
       * res.data.data
       *
       * Therefore DO NOT use mineRes.data here.
       */
      const minePromise =
        getMyExpenseClaims();

      if (!canApprove) {
        const mineRes = await minePromise;

        setMyClaims(
          Array.isArray(mineRes)
            ? mineRes
            : []
        );

        setApprovals([]);
        return;
      }

      const [
        mineRes,
        managerRes,
        financeRes,
      ] = await Promise.all([
        minePromise,
        getPendingApprovals("Manager"),
        getPendingApprovals("Finance"),
      ]);

      setMyClaims(
        Array.isArray(mineRes)
          ? mineRes
          : []
      );

      setApprovals([
        ...(Array.isArray(managerRes)
          ? managerRes
          : []),
        ...(Array.isArray(financeRes)
          ? financeRes
          : []),
      ]);
    } catch (err) {
      console.error(
        "Failed to load expense claims:",
        err
      );

      setMyClaims([]);
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    /*
     * Wait until authentication has supplied
     * the current user.
     */
    if (!user) return;

    loadAll();
  }, [user, canApprove]);

  useEffect(() => {
    if (!canApprove && tab === "approvals") {
      setTab("mine");
    }
  }, [canApprove, tab]);

  /* ---------------------------------------------------------------------- */
  /* Approval                                                                */
  /* ---------------------------------------------------------------------- */

  const handleApprove = async (claim) => {
    if (!canApprove || !claim) return;

    try {
      await approveClaim(
        claim.id,
        claim.approvalStage
      );

      await loadAll();
    } catch (err) {
      console.error(
        "Failed to approve claim:",
        err
      );

      alert(
        err?.response?.data?.message ||
          "Failed to approve claim."
      );
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Receipt viewer                                                          */
  /* ---------------------------------------------------------------------- */

  const handleViewReceipt = async (claim) => {
    const receipt = claim?.receipts?.[0] || null;

    if (!receipt?.id) {
      alert("Receipt file is not available.");
      return;
    }

    try {
      const result = await getReceiptSignedUrl(receipt.id);
      const url = result?.downloadUrl || result?.url;

      if (!url) {
        throw new Error("Receipt download URL was not returned");
      }

      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Failed to open expense receipt:", err);
      alert(
        err?.response?.data?.message ||
          "Unable to open the receipt. Please try again."
      );
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Tabs                                                                    */
  /* ---------------------------------------------------------------------- */

  const tabs = [
    {
      id: "mine",
      label: "My Claims",
    },

    ...(canApprove
      ? [
          {
            id: "approvals",
            label: `Approvals${
              approvals.length
                ? ` (${approvals.length})`
                : ""
            }`,
          },
        ]
      : []),
  ];

  const rows =
    tab === "mine"
      ? myClaims
      : approvals;

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <MainLayout>
      <div
        style={{
          maxWidth: "1480px",
          margin: "0 auto",
        }}
      >
        <PageHeader
          title="Expense Management"
          subtitle="Submit reimbursements, review GST receipts, and authorize claims"
        >
          <button
            id="submit-claim-trigger-btn"
            type="button"
            onClick={() =>
              setShowSubmit(true)
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 16px",
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius:
                "var(--radius-sm)",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            <Plus size={16} />
            Submit Claim
          </button>
        </PageHeader>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginBottom: "16px",
            borderBottom:
              "1px solid var(--border)",
          }}
        >
          {tabs.map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              onClick={() =>
                setTab(tabItem.id)
              }
              style={{
                padding: "10px 18px",
                background: "none",
                border: "none",
                borderBottom:
                  tab === tabItem.id
                    ? "2px solid var(--primary)"
                    : "2px solid transparent",
                color:
                  tab === tabItem.id
                    ? "var(--primary)"
                    : "var(--subtext)",
                fontWeight:
                  tab === tabItem.id
                    ? 700
                    : 500,
                fontSize: "13.5px",
                cursor: "pointer",
                marginBottom: "-1px",
              }}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        {/* Claims container */}
        <div
          style={{
            background: "var(--card)",
            borderRadius:
              "var(--radius-lg)",
            border:
              "1px solid var(--border)",
            boxShadow:
              "var(--shadow-sm)",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div
              style={{
                minHeight: "220px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Spinner />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title={
                tab === "mine"
                  ? "No expense claims yet"
                  : "Nothing pending approval"
              }
              subtitle={
                tab === "mine"
                  ? "Submit a claim using the button above."
                  : "You're all caught up."
              }
            />
          ) : (
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse:
                    "collapse",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background:
                        "var(--background)",
                      borderBottom:
                        "1px solid var(--border)",
                    }}
                  >
                    {[
                      "Claim ID",
                      tab === "approvals"
                        ? "Employee & ID"
                        : null,
                      "Category",
                      "Amount",
                      "Expense Date",
                      "Purpose",
                      "Status",
                      tab === "approvals"
                        ? "Actions"
                        : "Receipt",
                    ]
                      .filter(Boolean)
                      .map((header) => (
                        <th
                          key={header}
                          style={{
                            padding:
                              "11px 16px",
                            textAlign:
                              "left",
                            fontSize:
                              "11px",
                            fontWeight: 700,
                            color:
                              "var(--subtext)",
                            textTransform:
                              "uppercase",
                            letterSpacing:
                              "0.5px",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {header}
                        </th>
                      ))}
                  </tr>
                </thead>

                <tbody>
                  {rows.map(
                    (claim, index) => {
                      const meta =
                        expenseStatusMeta[
                          claim.status
                        ] ||
                        expenseStatusMeta.Draft;

                      const locked =
                        LOCKED_STATUSES.includes(
                          claim.status
                        );

                      const receiptAttached =
                        Boolean(
                          claim.receiptAttached
                        ) ||
                        Boolean(
                          claim.receiptPending ===
                            false
                        ) ||
                        Boolean(
                          claim.receipts?.length
                        );

                      return (
                        <tr
                          key={
                            claim.id ||
                            claim.claimNumber ||
                            index
                          }
                          onClick={() =>
                            setSelectedClaim(
                              claim
                            )
                          }
                          style={{
                            borderBottom:
                              index <
                              rows.length - 1
                                ? "1px solid var(--border)"
                                : "none",
                            cursor:
                              "pointer",
                            transition:
                              "background 0.12s",
                          }}
                          onMouseEnter={(
                            event
                          ) => {
                            event.currentTarget.style.background =
                              "var(--background)";
                          }}
                          onMouseLeave={(
                            event
                          ) => {
                            event.currentTarget.style.background =
                              "none";
                          }}
                        >
                          {/* Claim ID */}
                          <td
                            style={{
                              padding:
                                "13px 16px",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            <span
                              style={{
                                fontFamily:
                                  "monospace",
                                fontWeight: 700,
                                fontSize:
                                  "12px",
                                color:
                                  "var(--primary)",
                                background:
                                  "var(--primary-light)",
                                padding:
                                  "3px 8px",
                                borderRadius:
                                  "4px",
                              }}
                            >
                              {getClaimDisplayId(
                                claim
                              )}
                            </span>
                          </td>

                          {/* Employee */}
                          {tab ===
                            "approvals" && (
                            <td
                              style={{
                                padding:
                                  "13px 16px",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              <p
                                style={{
                                  margin: 0,
                                  fontSize:
                                    "13.5px",
                                  color:
                                    "var(--text)",
                                  fontWeight: 600,
                                }}
                              >
                                {claim.employeeName ||
                                  "—"}
                              </p>

                              <span
                                style={{
                                  fontSize:
                                    "11px",
                                  fontFamily:
                                    "monospace",
                                  color:
                                    "var(--subtext)",
                                }}
                              >
                                {claim.employeeId ||
                                  "—"}
                              </span>
                            </td>
                          )}

                          {/* Category */}
                          <td
                            style={{
                              padding:
                                "13px 16px",
                              fontSize:
                                "13.5px",
                              color:
                                "var(--text)",
                            }}
                          >
                            {claim.category ||
                              "—"}
                          </td>

                          {/* Amount */}
                          <td
                            style={{
                              padding:
                                "13px 16px",
                              fontSize:
                                "13.5px",
                              color:
                                "var(--text)",
                              fontWeight: 700,
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {fmtAmount(
                              claim.amount
                            )}
                          </td>

                          {/* Date */}
                          <td
                            style={{
                              padding:
                                "13px 16px",
                              fontSize:
                                "12.5px",
                              color:
                                "var(--subtext)",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {fmtDate(
                              claim.expenseDate
                            )}
                          </td>

                          {/* Purpose */}
                          <td
                            style={{
                              padding:
                                "13px 16px",
                              fontSize:
                                "13px",
                              color:
                                "var(--subtext)",
                              maxWidth:
                                "220px",
                            }}
                          >
                            <div
                              style={{
                                overflow:
                                  "hidden",
                                textOverflow:
                                  "ellipsis",
                                display:
                                  "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient:
                                  "vertical",
                              }}
                            >
                              {claim.businessPurpose ||
                                "—"}
                            </div>

                            <ViolationFlags
                              claim={claim}
                            />
                          </td>

                          {/* Status */}
                          <td
                            style={{
                              padding:
                                "13px 16px",
                            }}
                          >
                            <StatusBadge
                              label={
                                meta.label
                              }
                              color={
                                meta.color
                              }
                              bg={meta.bg}
                            />

                            {tab ===
                              "mine" &&
                              claim.status ===
                                "Rejected" &&
                              claim.rejectionReason && (
                                <p
                                  style={{
                                    fontSize:
                                      "11px",
                                    color:
                                      "var(--red)",
                                    marginTop:
                                      "4px",
                                    maxWidth:
                                      "220px",
                                  }}
                                >
                                  {
                                    claim.rejectionReason
                                  }
                                </p>
                              )}
                          </td>

                          {/* Actions / Receipt */}
                          {tab ===
                          "approvals" ? (
                            <td
                              style={{
                                padding:
                                  "13px 16px",
                                whiteSpace:
                                  "nowrap",
                              }}
                              onClick={(event) =>
                                event.stopPropagation()
                              }
                            >
                              <div
                                style={{
                                  display:
                                    "flex",
                                  gap: "6px",
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedClaim(
                                      claim
                                    )
                                  }
                                  title="Inspect Claim Details"
                                  style={{
                                    display:
                                      "flex",
                                    alignItems:
                                      "center",
                                    gap: "4px",
                                    padding:
                                      "6px 10px",
                                    background:
                                      "none",
                                    border:
                                      "1px solid var(--border)",
                                    borderRadius:
                                      "var(--radius-sm)",
                                    fontWeight: 600,
                                    fontSize:
                                      "12px",
                                    color:
                                      "var(--text)",
                                    cursor:
                                      "pointer",
                                  }}
                                >
                                  <Eye
                                    size={12}
                                  />
                                  Review
                                </button>

                                <button
                                  type="button"
                                  id={`approve-${claim.id}-btn`}
                                  onClick={() =>
                                    handleApprove(
                                      claim
                                    )
                                  }
                                  disabled={
                                    locked
                                  }
                                  style={{
                                    display:
                                      "flex",
                                    alignItems:
                                      "center",
                                    gap: "4px",
                                    padding:
                                      "6px 12px",
                                    background:
                                      "var(--green-light)",
                                    color:
                                      "var(--green)",
                                    border:
                                      "none",
                                    borderRadius:
                                      "var(--radius-sm)",
                                    fontWeight: 600,
                                    fontSize:
                                      "12px",
                                    cursor:
                                      locked
                                        ? "not-allowed"
                                        : "pointer",
                                  }}
                                >
                                  <Check
                                    size={13}
                                  />
                                  Approve
                                </button>

                                <button
                                  type="button"
                                  id={`reject-${claim.id}-btn`}
                                  onClick={() =>
                                    setRejectTarget(
                                      claim
                                    )
                                  }
                                  disabled={
                                    locked
                                  }
                                  style={{
                                    display:
                                      "flex",
                                    alignItems:
                                      "center",
                                    gap: "4px",
                                    padding:
                                      "6px 12px",
                                    background:
                                      "var(--red-light)",
                                    color:
                                      "var(--red)",
                                    border:
                                      "none",
                                    borderRadius:
                                      "var(--radius-sm)",
                                    fontWeight: 600,
                                    fontSize:
                                      "12px",
                                    cursor:
                                      locked
                                        ? "not-allowed"
                                        : "pointer",
                                  }}
                                >
                                  <X
                                    size={13}
                                  />
                                  Reject
                                </button>
                              </div>
                            </td>
                          ) : (
                            <td
                              style={{
                                padding:
                                  "13px 16px",
                              }}
                            >
                              {receiptAttached ? (
                                <span
                                  style={{
                                    display:
                                      "flex",
                                    alignItems:
                                      "center",
                                    gap: "5px",
                                    fontSize:
                                      "12px",
                                    color:
                                      "var(--primary)",
                                    fontWeight: 500,
                                  }}
                                >
                                  <Paperclip
                                    size={12}
                                  />

                                  {claim.receiptFileName ||
                                    claim
                                      .receipts?.[0]
                                      ?.fileName ||
                                    "Receipt attached"}
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize:
                                      "12px",
                                    color:
                                      "var(--subtext)",
                                  }}
                                >
                                  —
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Submit Modal */}
      <SubmitClaimModal
        isOpen={showSubmit}
        onClose={() =>
          setShowSubmit(false)
        }
        onSubmitted={loadAll}
        currentEmployee={{
          id: currentEmpId,
          name: currentEmpName,
        }}
      />

      {/* Reject Modal */}
      <RejectModal
        claim={rejectTarget}
        onClose={() =>
          setRejectTarget(null)
        }
        onRejected={loadAll}
      />

      {/* Detail Modal */}
      <ExpenseDetailModal
        claim={selectedClaim}
        isOpen={!!selectedClaim}
        onClose={() =>
          setSelectedClaim(null)
        }
        onApprove={handleApprove}
        onReject={(claim) =>
          setRejectTarget(claim)
        }
        onViewReceipt={handleViewReceipt}
        isApprover={
          canApprove &&
          tab === "approvals"
        }
      />
    </MainLayout>
  );
}