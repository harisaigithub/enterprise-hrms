/**
 * Expense Management Page • Module 14
 * Indian IT Corporate standard with prominent Claim IDs,
 * Employee IDs, clickable approval inspection rows,
 * and in-modal approver review workflow.
 */

import { useState, useEffect, useCallback } from "react";
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
  Send,
  Trash2,
  Edit,
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
  updateDraft,
  uploadExpenseReceipt,
  getReceiptSignedUrl,
  deleteDraft,
  sendBackClaim,
  checkDuplicates,
} from "../../services/expenseService";

import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  EXPENSE_POLICY,
  expenseStatusMeta,
  LOCKED_STATUSES,
  SEND_BACKABLE_STATUSES,
} from "../../constants/expenses";

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

const getEmployeeName = (claim) => {
  if (claim?.employeeName) return claim.employeeName;

  const firstName = claim?.employee?.firstName || "";
  const lastName = claim?.employee?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || "—";
};

const getApprovalStage = (claim) => {
  if (claim?.isDraft || claim?.status === "Draft") return "Not submitted";
  return claim?.approvalStage || "Pending review";
};

const getViolationMessage = (violation) => {
  if (typeof violation === "string") return violation;
  if (!violation || typeof violation !== "object") return "Policy check requires attention";

  return (
    violation.message ||
    violation.description ||
    violation.code ||
    "Policy check requires attention"
  );
};

const getApiErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

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
  onSubmitDraft,
  onDeleteDraft,
  onEditDraft,
  actionClaimId,
  canManageDraft,
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
                {getApprovalStage(claim)}
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
              {getEmployeeName(claim)}
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
                    {getViolationMessage(violation)}
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
            {claim.isDraft && canManageDraft && (
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => onEditDraft?.(claim)}
                  disabled={actionClaimId === claim.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 18px",
                    background: "var(--blue)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: actionClaimId === claim.id ? "not-allowed" : "pointer",
                    opacity: actionClaimId === claim.id ? 0.7 : 1,
                  }}
                >
                  <Edit size={14} />
                  {actionClaimId === claim.id ? "Editing…" : "Edit Draft"}
                </button>

                <button
                  type="button"
                  onClick={() => onSubmitDraft?.(claim)}
                  disabled={actionClaimId === claim.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 18px",
                    background: "var(--primary)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: actionClaimId === claim.id ? "not-allowed" : "pointer",
                    opacity: actionClaimId === claim.id ? 0.7 : 1,
                  }}
                >
                  <Send size={14} />
                  {actionClaimId === claim.id ? "Submitting…" : "Submit Draft"}
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteDraft?.(claim)}
                  disabled={actionClaimId === claim.id}
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
                    cursor: actionClaimId === claim.id ? "not-allowed" : "pointer",
                  }}
                >
                  <Trash2 size={14} />
                  Delete Draft
                </button>
              </div>
            )}
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
  initialDraft = null,
}) {
  const isEditing = Boolean(initialDraft);
  const [form, setForm] = useState({
    category: initialDraft?.category || "",
    amount: initialDraft?.amount ? String(initialDraft.amount) : "",
    currency: initialDraft?.currency || "INR",
    expenseDate: initialDraft?.expenseDate || "",
    businessPurpose: initialDraft?.businessPurpose || "",
    merchantName: initialDraft?.merchantName || "",
    paymentMethod: initialDraft?.paymentMethod || "",
    gstApplicable: initialDraft?.gstApplicable || false,
    gstRate: initialDraft?.gstRate ? String(initialDraft.gstRate) : "",
    gstAmount: initialDraft?.gstAmount ? String(initialDraft.gstAmount) : "",
    costCenterId: initialDraft?.costCenterId || "",
    projectId: initialDraft?.projectId || "",
    notes: initialDraft?.notes || "",
    receiptFileName: initialDraft?.receipts?.[0]?.fileName || "",
    receiptFile: null,
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

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

    if (!form.merchantName.trim()) {
      e.merchantName = "Merchant name is required";
    }

    if (!form.paymentMethod) {
      e.paymentMethod = "Select a payment method";
    }

    if (form.gstApplicable && (!form.gstRate || Number(form.gstRate) <= 0)) {
      e.gstRate = "GST rate is required when GST is applicable";
    }

    setErrors(e);

    return Object.keys(e).length === 0;
  };

  const checkDuplicatesAsync = async () => {
    if (!form.category || !form.amount || !form.expenseDate || !form.merchantName) return;
    try {
      const result = await checkDuplicates({
        category: form.category,
        amount: amountNum,
        expenseDate: form.expenseDate,
        merchantName: form.merchantName,
      });
      if (result.exactDuplicate || result.nearDuplicate) {
        setDuplicateWarning({
          type: result.exactDuplicate ? "exact" : "near",
          claimId: result.exactDuplicate?.claimId || result.nearDuplicate?.claimId,
          claimNumber: result.exactDuplicate?.claimNumber || result.nearDuplicate?.claimNumber,
          similarity: result.nearDuplicate?.similarity,
        });
      } else {
        setDuplicateWarning(null);
      }
    } catch (err) {
      console.error("Duplicate check failed:", err);
    }
  };

  const handleSaveDraft = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);

    try {
      let draft;
      if (isEditing && initialDraft?.id) {
        // Update existing draft
        draft = await updateDraft(initialDraft.id, {
          category: form.category,
          amount: amountNum,
          currency: form.currency,
          expenseDate: form.expenseDate,
          businessPurpose: form.businessPurpose.trim(),
          merchantName: form.merchantName.trim(),
          paymentMethod: form.paymentMethod,
          gstApplicable: form.gstApplicable,
          gstRate: form.gstRate ? Number(form.gstRate) : undefined,
          gstAmount: form.gstAmount ? Number(form.gstAmount) : undefined,
          costCenterId: form.costCenterId || undefined,
          projectId: form.projectId || undefined,
          notes: form.notes || undefined,
        });
      } else {
        // Create new draft
        draft = await createDraft({
          category: form.category,
          amount: amountNum,
          currency: form.currency,
          expenseDate: form.expenseDate,
          businessPurpose: form.businessPurpose.trim(),
          merchantName: form.merchantName.trim(),
          paymentMethod: form.paymentMethod,
          gstApplicable: form.gstApplicable,
          gstRate: form.gstRate ? Number(form.gstRate) : undefined,
          gstAmount: form.gstAmount ? Number(form.gstAmount) : undefined,
          costCenterId: form.costCenterId || undefined,
          projectId: form.projectId || undefined,
          notes: form.notes || undefined,
        });
      }

      if (!draft?.id) {
        throw new Error("Expense draft was not created");
      }

      if (form.receiptFile) {
        try {
          const fileHash = await calculateFileHash(form.receiptFile);

          await uploadExpenseReceipt(
            draft.id,
            form.receiptFile,
            fileHash
          );
        } catch (receiptErr) {
          console.warn("Receipt upload failed (MinIO may not be available), continuing without receipt:", receiptErr);
          alert("Receipt upload failed (storage service unavailable). Claim will be submitted without receipt. You can add it later.");
        }
      }

      onSubmitted();
      onClose();

      setForm({
        category: "",
        amount: "",
        currency: "INR",
        expenseDate: "",
        businessPurpose: "",
        merchantName: "",
        paymentMethod: "",
        gstApplicable: false,
        gstRate: "",
        gstAmount: "",
        costCenterId: "",
        projectId: "",
        notes: "",
        receiptFileName: "",
        receiptFile: null,
      });

      setErrors({});
      setDuplicateWarning(null);
    } catch (err) {
      console.error(
        "Failed to save expense draft:",
        err
      );

      alert(
        err?.response?.data?.message ||
          "Failed to save draft. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);

    try {
      let draft;
      if (isEditing && initialDraft?.id) {
        // Update existing draft first, then submit
        draft = await updateDraft(initialDraft.id, {
          category: form.category,
          amount: amountNum,
          currency: form.currency,
          expenseDate: form.expenseDate,
          businessPurpose: form.businessPurpose.trim(),
          merchantName: form.merchantName.trim(),
          paymentMethod: form.paymentMethod,
          gstApplicable: form.gstApplicable,
          gstRate: form.gstRate ? Number(form.gstRate) : undefined,
          gstAmount: form.gstAmount ? Number(form.gstAmount) : undefined,
          costCenterId: form.costCenterId || undefined,
          projectId: form.projectId || undefined,
          notes: form.notes || undefined,
        });
      } else {
        // Create new draft
        draft = await createDraft({
          category: form.category,
          amount: amountNum,
          currency: form.currency,
          expenseDate: form.expenseDate,
          businessPurpose: form.businessPurpose.trim(),
          merchantName: form.merchantName.trim(),
          paymentMethod: form.paymentMethod,
          gstApplicable: form.gstApplicable,
          gstRate: form.gstRate ? Number(form.gstRate) : undefined,
          gstAmount: form.gstAmount ? Number(form.gstAmount) : undefined,
          costCenterId: form.costCenterId || undefined,
          projectId: form.projectId || undefined,
          notes: form.notes || undefined,
        });
      }

      if (!draft?.id) {
        throw new Error("Expense draft was not created");
      }

      if (form.receiptFile) {
        try {
          const fileHash = await calculateFileHash(form.receiptFile);

          await uploadExpenseReceipt(
            draft.id,
            form.receiptFile,
            fileHash
          );
        } catch (receiptErr) {
          console.warn("Receipt upload failed (MinIO may not be available), continuing without receipt:", receiptErr);
          alert("Receipt upload failed (storage service unavailable). Claim will be submitted without receipt. You can add it later.");
        }
      }

      await submitExpenseClaim(draft.id);

      onSubmitted();
      onClose();

      setForm({
        category: "",
        amount: "",
        currency: "INR",
        expenseDate: "",
        businessPurpose: "",
        merchantName: "",
        paymentMethod: "",
        gstApplicable: false,
        gstRate: "",
        gstAmount: "",
        costCenterId: "",
        projectId: "",
        notes: "",
        receiptFileName: "",
        receiptFile: null,
      });

      setErrors({});
      setDuplicateWarning(null);
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

  const modalTitle = isEditing
      ? `Edit Draft — ${initialDraft?.claimNumber || initialDraft?.id?.slice(0, 8)}`
      : "Submit Expense Claim (Indian IT Corporate)";

  return (
    <Modal
      isOpen={isOpen}
      title={modalTitle}
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

        {/* Currency + Merchant */}
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
              Currency *
            </label>
            <input
              type="text"
              value={form.currency}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  currency: e.target.value,
                }))
              }
              style={inputStyle("currency")}
            />
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
              Merchant / Vendor Name *
            </label>
            <input
              type="text"
              value={form.merchantName}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  merchantName: e.target.value,
                }))
              }
              style={inputStyle("merchantName")}
              onBlur={checkDuplicatesAsync}
            />

            {errors.merchantName && (
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--red)",
                }}
              >
                {errors.merchantName}
              </span>
            )}
          </div>
        </div>

        {/* Payment Method + GST */}
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
              Payment Method *
            </label>
            <select
              value={form.paymentMethod}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  paymentMethod: e.target.value,
                }))
              }
              style={inputStyle("paymentMethod")}
            >
              <option value="">Select payment method</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>

            {errors.paymentMethod && (
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--red)",
                }}
              >
                {errors.paymentMethod}
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
              GST Applicable
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.gstApplicable}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    gstApplicable: e.target.checked,
                    gstRate: e.target.checked ? "18" : "",
                    gstAmount: e.target.checked ? "" : "",
                  }))
                }
              />
              <span style={{ fontSize: "13px", color: "var(--text)" }}>Yes, this expense includes GST</span>
            </label>
          </div>
        </div>

        {form.gstApplicable && (
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
                GST Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={form.gstRate}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    gstRate: e.target.value,
                  }))
                }
                style={inputStyle("gstRate")}
              />
              {errors.gstRate && (
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--red)",
                  }}
                >
                  {errors.gstRate}
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
                GST Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.gstAmount}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    gstAmount: e.target.value,
                  }))
                }
                style={inputStyle("gstAmount")}
              />
            </div>
          </div>
        )}

        {/* Cost Center / Project */}
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
              Cost Center
            </label>
            <input
              type="text"
              value={form.costCenterId}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  costCenterId: e.target.value,
                }))
              }
              style={inputStyle("costCenterId")}
              placeholder="Cost center code (optional)"
            />
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
              Project / Client
            </label>
            <input
              type="text"
              value={form.projectId}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  projectId: e.target.value,
                }))
              }
              style={inputStyle("projectId")}
              placeholder="Project or client code (optional)"
            />
          </div>
        </div>

        {/* Notes */}
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
            Notes (Optional)
          </label>
          <textarea
            value={form.notes}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                notes: e.target.value,
              }))
            }
            rows={2}
            placeholder="Any additional notes..."
            style={{
              width: "100%",
              padding: "10px 12px",
              border: `1px solid ${"var(--border)"}`,
              borderRadius: "var(--radius-sm)",
              fontSize: "13.5px",
              color: "var(--text)",
              outline: "none",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Duplicate Warning */}
        {duplicateWarning && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px",
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              borderRadius: "var(--radius)",
              color: "#c2410c",
            }}
          >
            <AlertTriangle size={16} />
            <span style={{ fontSize: "13px" }}>
              <strong>Possible duplicate detected:</strong> Claim {duplicateWarning.claimNumber} 
              {duplicateWarning.type === "exact" ? "matches exactly" : `has ${duplicateWarning.similarity}% similarity`}. 
              Please review before submitting.
            </span>
          </div>
        )}

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

          {/* Show existing receipt when editing a draft */}
          {isEditing && initialDraft?.receipts?.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                marginBottom: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FileText size={20} style={{ color: "var(--primary)" }} />
                <div>
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>
                    {initialDraft.receipts[0].fileName}
                  </p>
                  <span style={{ fontSize: "11.5px", color: "var(--subtext)" }}>
                    Existing receipt — will be kept if you don't upload a new one
                  </span>
                </div>
              </div>
              <span style={{ fontSize: "11px", color: "var(--primary)", fontWeight: 600 }}>
                Receipt preserved
              </span>
            </div>
          )}

          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;

              setForm((p) => ({
                ...p,
                receiptFile: file,
                receiptFileName: file?.name || (isEditing && initialDraft?.receipts?.length > 0 ? initialDraft.receipts[0].fileName : ""),
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
              {isEditing && !form.receiptFile && initialDraft?.receipts?.length > 0
                ? `Keeping existing: ${form.receiptFileName}`
                : `Attached: ${form.receiptFileName}`}
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
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            style={{
              padding: "9px 20px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background: "none",
              color: "var(--primary)",
              fontWeight: 600,
              fontSize: "13px",
              cursor: saving
                ? "not-allowed"
                : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving
              ? "Saving…"
              : isEditing
              ? "Update Draft"
              : "Save as Draft"}
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
          {getViolationMessage(violation)}
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
/* Send Back Modal                                                            */
/* -------------------------------------------------------------------------- */

function SendBackModal({
  claim,
  onClose,
  onSentBack,
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSendBack = async () => {
    if (!reason.trim() || !claim) return;

    setSaving(true);

    try {
      await sendBackClaim(claim.id, reason.trim());

      onSentBack();
      onClose();
      setReason("");
    } catch (err) {
      console.error(
        "Failed to send back claim:",
        err
      );

      alert(
        err?.response?.data?.message ||
          "Failed to send back claim."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={!!claim}
      title={`Send Back Claim: ${getClaimDisplayId(claim)}`}
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
            Send Back Reason *
          </label>

          <textarea
            value={reason}
            onChange={(e) =>
              setReason(e.target.value)
            }
            rows={3}
            placeholder="Explain what needs to be corrected or clarified…"
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
            onClick={handleSendBack}
            disabled={
              saving || !reason.trim()
            }
            style={{
              padding: "9px 20px",
              border: "none",
              borderRadius: "var(--radius-sm)",
              background: "#f97316",
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
              ? "Sending Back…"
              : "Send Back"}
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
    role === "FINANCE" ||
    Boolean(user?.isDepartmentHead) ||
    Boolean(user?.isManager) ||
    Boolean(
      permissions?.includes(
        "expenses:approve"
      )
    );

  const canManageTeam = canApprove && (role === "MANAGER" || role === "ADMIN" || role === "HR" || user?.isDepartmentHead || user?.isManager);
  const canFinanceReview = role === "FINANCE" || role === "ADMIN" || role === "HR" || permissions?.includes("expenses:approve");

  /*
   * IMPORTANT:
   * Do not send this employee ID to GET /expense/claims.
   * Backend already identifies the logged-in employee.
   */
  const currentEmpId =
    user?.employeeId ||
    user?.employeeCode ||
    user?.id ||
    "";

  const authenticatedEmployeeId = user?.employeeId;
  const authenticatedEmployeeCode = user?.employeeCode;

  const isOwnClaim = useCallback(
    (claim) =>
      Boolean(
        claim &&
          ((authenticatedEmployeeId && claim.employeeId === authenticatedEmployeeId) ||
            (authenticatedEmployeeCode &&
              claim.employee?.employeeCode === authenticatedEmployeeCode))
      ),
    [authenticatedEmployeeId, authenticatedEmployeeCode]
  );

  const currentEmpName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : user?.name || "Current Employee";

  const [tab, setTab] = useState("mine");

  const [myClaims, setMyClaims] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [teamClaims, setTeamClaims] = useState([]);
  const [financeClaims, setFinanceClaims] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showSubmit, setShowSubmit] =
    useState(false);

  const [editingDraft, setEditingDraft] =
    useState(null);

  const [selectedClaim, setSelectedClaim] =
    useState(null);

  const [rejectTarget, setRejectTarget] =
    useState(null);

  const [sendBackTarget, setSendBackTarget] =
    useState(null);

  const [actionClaimId, setActionClaimId] =
    useState(null);

  /* ---------------------------------------------------------------------- */
  /* Load claims                                                            */
  /* ---------------------------------------------------------------------- */

  const loadAll = useCallback(async () => {
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
        setTeamClaims([]);
        setFinanceClaims([]);
        return;
      }

      const approvalPromises = [];
      if (["MANAGER", "ADMIN", "HR"].includes(role)) {
        approvalPromises.push(getPendingApprovals("Manager"));
      }
      if (["FINANCE", "ADMIN", "HR"].includes(role)) {
        approvalPromises.push(getPendingApprovals("Finance"));
      }

      // Load team claims for managers
      const teamPromise = canManageTeam
        ? getMyExpenseClaims() // This will be filtered by backend based on role
        : Promise.resolve([]);

      // Load finance review claims for finance/HR
      const financePromise = canFinanceReview
        ? getPendingApprovals("Finance")
        : Promise.resolve([]);

      const [mineRes, ...approvalResults] = await Promise.all([
        minePromise,
        ...approvalPromises,
        teamPromise,
        financePromise,
      ]);

      setMyClaims(
        Array.isArray(mineRes)
          ? mineRes
          : []
      );

      const rawApprovals = approvalResults.flatMap((result) =>
        Array.isArray(result) ? result : []
      );
      const uniqueApprovals = Array.from(
        new Map(rawApprovals.map((item) => [item.id, item])).values()
      );
      setApprovals(uniqueApprovals);

      // Team claims are in the second to last result
      const teamRes = approvalResults[approvalResults.length - 2];
      setTeamClaims(Array.isArray(teamRes) ? teamRes : []);

      // Finance claims are in the last result
      const financeRes = approvalResults[approvalResults.length - 1];
      setFinanceClaims(Array.isArray(financeRes) ? financeRes : []);
    } catch (err) {
      console.error(
        "Failed to load expense claims:",
        err
      );

      setMyClaims([]);
      setApprovals([]);
      setTeamClaims([]);
      setFinanceClaims([]);
    } finally {
      setLoading(false);
    }
  }, [canApprove, canManageTeam, canFinanceReview, role]);

  useEffect(() => {
    /*
     * Wait until authentication has supplied
     * the current user.
     */
    if (!user) return;

    const timeoutId = window.setTimeout(() => {
      void loadAll();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [user, loadAll]);

  useEffect(() => {
    if (!canApprove && (tab === "approvals" || tab === "team" || tab === "finance")) {
      const timeoutId = window.setTimeout(() => setTab("mine"), 0);
      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [canApprove, canManageTeam, canFinanceReview, tab]);

  /* handleSendBack removed - not used (SendBackModal handles it) */

  /* ---------------------------------------------------------------------- */
  /* Submit Draft                                                              */
  /* ---------------------------------------------------------------------- */

  const handleSubmitDraft = async (claim) => {
    if (!claim?.id || !claim.isDraft) return;

    setActionClaimId(claim.id);
    try {
      await submitExpenseClaim(claim.id);
      setSelectedClaim(null);
      await loadAll();
    } catch (err) {
      console.error("Failed to submit expense draft:", err);
      alert(getApiErrorMessage(err, "Failed to submit expense draft."));
    } finally {
      setActionClaimId(null);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Delete Draft                                                              */
  /* ---------------------------------------------------------------------- */

  const handleDeleteDraft = async (claim) => {
    if (!claim?.id || !claim.isDraft) return;

    const confirmed = window.confirm(
      `Delete draft ${getClaimDisplayId(claim)}? This cannot be undone.`
    );
    if (!confirmed) return;

    setActionClaimId(claim.id);
    try {
      await deleteDraft(claim.id);
      setSelectedClaim(null);
      await loadAll();
    } catch (err) {
      console.error("Failed to delete expense draft:", err);
      alert(getApiErrorMessage(err, "Failed to delete expense draft."));
    } finally {
      setActionClaimId(null);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Edit Draft                                                                */
  /* ---------------------------------------------------------------------- */

  const handleEditDraft = (claim) => {
    if (!claim?.id || !claim.isDraft) return;
    setEditingDraft(claim);
    setSelectedClaim(null);
    setShowSubmit(true);
  };

  /* ---------------------------------------------------------------------- */
  /* Receipt viewer                                                            */
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

      alert(getApiErrorMessage(err, "Failed to approve claim."));
    }
  };

  /* handleReject removed - not used (setRejectTarget called directly in JSX) */

  /* ---------------------------------------------------------------------- */
  /* Send Back                                                                */
  /* ---------------------------------------------------------------------- */

  /* handleSendBackClick removed - not used */

  /* ---------------------------------------------------------------------- */
  /* Tabs                                                                    */
  /* ---------------------------------------------------------------------- */

  const tabs = [
    {
      id: "mine",
      label: ["ADMIN", "HR"].includes(role) ? "All Claims" : "My Claims",
    },

    ...(canManageTeam
      ? [
          {
            id: "team",
            label: `Team Claims${teamClaims.length ? ` (${teamClaims.length})` : ""}`,
          },
        ]
      : []),

    ...(canApprove
      ? [
          {
            id: "approvals",
            label: `My Approvals${approvals.length ? ` (${approvals.length})` : ""}`,
          },
        ]
      : []),

    ...(canFinanceReview
      ? [
          {
            id: "finance",
            label: `Finance Review${financeClaims.length ? ` (${financeClaims.length})` : ""}`,
          },
        ]
      : []),
  ];

  const rows =
    tab === "mine"
      ? myClaims
      : tab === "team"
      ? teamClaims
      : tab === "approvals"
      ? approvals
      : financeClaims;

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
                      ["team", "finance", "approvals"].includes(tab)
                        ? "Employee & ID"
                        : null,
                      "Category",
                      "Amount",
                      "Expense Date",
                      "Purpose",
                      "Status",
                      ["team", "finance", "approvals"].includes(tab)
                        ? "Actions"
                        : "Receipt / Actions",
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
                          {["team", "finance", "approvals"].includes(tab) && (
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
                                {getEmployeeName(claim)}
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
                          {["team", "finance", "approvals"].includes(tab) ? (
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

                                {canApprove && SEND_BACKABLE_STATUSES.includes(claim.status) && (
                                  <button
                                    type="button"
                                    id={`sendback-${claim.id}-btn`}
                                    onClick={() =>
                                      setSendBackTarget(
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
                                        "#fff7ed",
                                      color:
                                        "#f97316",
                                      border:
                                        "1px solid #fed7aa",
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
                                    <Send
                                      size={13}
                                    />
                                    Send Back
                                  </button>
                                )}

                                {canApprove && (tab === "approvals" || tab === "finance") && (
                                  <>
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
                                  </>
                                )}
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

                              {claim.isDraft && isOwnClaim(claim) && (
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "6px",
                                    marginTop: "8px",
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleEditDraft(claim)}
                                    disabled={actionClaimId === claim.id}
                                    title="Edit draft"
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      padding: "6px 10px",
                                      background: "var(--blue-light)",
                                      color: "var(--blue)",
                                      border: "none",
                                      borderRadius: "var(--radius-sm)",
                                      fontWeight: 600,
                                      fontSize: "12px",
                                      cursor: actionClaimId === claim.id ? "not-allowed" : "pointer",
                                    }}
                                  >
                                    <Edit size={12} /> Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleSubmitDraft(claim)}
                                    disabled={actionClaimId === claim.id}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      padding: "6px 10px",
                                      background: "var(--primary)",
                                      color: "#fff",
                                      border: "none",
                                      borderRadius: "var(--radius-sm)",
                                      fontWeight: 600,
                                      fontSize: "12px",
                                      cursor: actionClaimId === claim.id ? "not-allowed" : "pointer",
                                    }}
                                  >
                                    <Send size={12} /> Submit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDraft(claim)}
                                    disabled={actionClaimId === claim.id}
                                    title="Delete draft"
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      padding: "6px 8px",
                                      background: "var(--red-light)",
                                      color: "var(--red)",
                                      border: "none",
                                      borderRadius: "var(--radius-sm)",
                                      cursor: actionClaimId === claim.id ? "not-allowed" : "pointer",
                                    }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
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
        onClose={() => {
          setShowSubmit(false);
          setEditingDraft(null);
        }}
        onSubmitted={() => {
          loadAll();
          setEditingDraft(null);
        }}
        initialDraft={editingDraft}
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

      {/* Send Back Modal */}
      <SendBackModal
        claim={sendBackTarget}
        onClose={() =>
          setSendBackTarget(null)
        }
        onSentBack={loadAll}
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
        onSubmitDraft={handleSubmitDraft}
        onDeleteDraft={handleDeleteDraft}
        onEditDraft={handleEditDraft}
        actionClaimId={actionClaimId}
        canManageDraft={isOwnClaim(selectedClaim)}
        isApprover={
          canApprove &&
          tab === "approvals"
        }
      />
    </MainLayout>
  );
}
