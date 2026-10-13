/**
 * Expense Management Page • Module 14
 * Indian IT Corporate standard with prominent Claim IDs,
 * Employee IDs, clickable approval inspection rows,
 * and in-modal approver review workflow.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
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
  Clock,
  CheckCircle2,
  Wallet,
  Search,
  RefreshCw,
} from "lucide-react";

import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import ConfirmDialog from "../../components/shared/ConfirmDialog";

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

/* Currency-aware money formatting. Defaults to Indian Rupee (en-IN grouping). */
const fmtMoney = (claim) => {
  const amount = Number(claim?.amount) || 0;
  const currency = claim?.currency || "INR";

  if (currency === "INR") return `₹${amount.toLocaleString("en-IN")}`;

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-IN")}`;
  }
};

/* Short, readable receipt label — keeps the extension, drops long hash prefixes. */
const shortFileName = (name, max = 26) => {
  if (!name) return "";
  const text = String(name);
  if (text.length <= max) return text;

  const dot = text.lastIndexOf(".");
  const ext = dot > 0 && text.length - dot <= 6 ? text.slice(dot) : "";
  const base = ext ? text.slice(0, dot) : text;

  return `${base.slice(0, max - ext.length - 1)}…${ext}`;
};

/* Employee code is far more readable than the raw UUID. */
const getEmployeeCode = (claim) =>
  claim?.employee?.employeeCode ||
  claim?.employeeCode ||
  (claim?.employeeId ? String(claim.employeeId).slice(0, 8) : "—");

/* Status groupings used by the summary cards. */
const PENDING_STATUSES = [
  "Submitted",
  "Manager Pending",
  "Pending Manager Approval",
  "Finance Pending",
  "Pending Finance Approval",
];

const APPROVED_STATUSES = [
  "Approved",
  "Approved for Reimbursement",
  "Queued for Payroll",
  "Paid",
];

/* <input type="date"> only accepts a bare YYYY-MM-DD value, but the API
   returns an ISO timestamp (2026-10-01T00:00:00.000Z). Without this the
   date control renders empty when editing a draft. The calendar date is
   taken from the UTC part so the browser timezone cannot shift the day. */
const toDateInputValue = (value) => {
  if (!value) return "";

  const text = String(value);
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (iso) return iso[1];
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isDraftClaim = (claim) =>
  Boolean(claim?.isDraft) || claim?.status === "Draft";

/*
 * Page styles are scoped to .exp-page so this module never leaks rules into
 * the rest of the app. All colours, radii and shadows come from
 * src/styles/variables.css.
 */
const EXPENSES_PAGE_CSS = `
.exp-page button:focus-visible,
.exp-page input:focus-visible,
.exp-page select:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

.exp-page .visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

/* ── Feedback banners ─────────────────────────────────────────────────── */
.exp-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  margin-bottom: 16px;
  border: 1px solid transparent;
  border-radius: var(--radius);
  font-size: 13px;
  animation: slideDown 0.2s ease;
}
.exp-banner > span { flex: 1; overflow-wrap: anywhere; }
.exp-banner-success {
  background: var(--green-light);
  border-color: rgba(5, 150, 105, 0.28);
  color: var(--green);
}
.exp-banner-error {
  background: var(--red-light);
  border-color: rgba(220, 38, 38, 0.28);
  color: var(--red);
}
.exp-banner-dismiss,
.exp-banner-retry {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  border: 1px solid transparent;
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  color: inherit;
}
.exp-banner-dismiss:hover { background: rgba(0, 0, 0, 0.05); }
.exp-banner-retry { border-color: currentColor; }

/* ── Summary cards ────────────────────────────────────────────────────── */
.exp-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(215px, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}
.exp-summary-card {
  display: flex;
  align-items: center;
  gap: 13px;
  text-align: left;
  padding: 15px 16px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}
.exp-summary-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.exp-summary-card.is-active {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary) inset, var(--shadow-md);
}
.exp-summary-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius);
  flex-shrink: 0;
}
.exp-summary-body { display: flex; flex-direction: column; min-width: 0; }
.exp-summary-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--subtext);
}
.exp-summary-value {
  font-size: 22px;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  margin-top: 2px;
}
.exp-summary-hint {
  font-size: 11.5px;
  color: var(--subtext);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Toolbar ──────────────────────────────────────────────────────────── */
.exp-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.exp-tabs {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
  padding: 4px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.exp-tab {
  padding: 7px 14px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  color: var(--subtext);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  white-space: nowrap;
}
.exp-tab:hover { color: var(--text); }
.exp-tab.is-active {
  background: var(--primary-light);
  color: var(--primary);
}
.exp-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.exp-search {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  min-width: 200px;
  padding: 0 10px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--subtext);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.exp-search:focus-within {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
}
.exp-search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--text);
}
.exp-select select {
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--card);
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  max-width: 200px;
}
.exp-clear {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 10px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--label);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.exp-clear:hover { border-color: var(--primary); color: var(--primary); }

/* ── Claims panel ─────────────────────────────────────────────────────── */
.exp-panel {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.exp-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}
.exp-panel-title { font-size: 14px; font-weight: 700; color: var(--text); }
.exp-panel-sub { font-size: 12.5px; color: var(--subtext); margin-top: 2px; }

.exp-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
}
.exp-skeleton-row { height: 42px; width: 100%; }

.exp-error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 56px 24px;
  text-align: center;
  color: var(--red);
}
.exp-error-title { font-size: 14px; font-weight: 700; color: var(--text); }
.exp-error-text { font-size: 13px; color: var(--subtext); max-width: 420px; }

/* ── Claims table ─────────────────────────────────────────────────────── */
.exp-table-wrap { overflow-x: auto; }
.exp-table {
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;
}
.exp-table thead th {
  padding: 10px 12px;
  text-align: left;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--subtext);
  background: var(--background);
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.exp-table tbody tr {
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.12s ease;
}
.exp-table tbody tr:last-child { border-bottom: none; }
.exp-table tbody tr:hover { background: var(--background); }
.exp-table tbody td {
  padding: 12px;
  vertical-align: top;
  font-size: 13px;
  color: var(--text);
}

.exp-claim-id {
  display: inline-block;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.2px;
  color: var(--primary);
  background: var(--primary-light);
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: var(--radius-xs);
  padding: 3px 8px;
  white-space: nowrap;
}
.exp-emp-name {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.exp-emp-code {
  display: block;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  color: var(--subtext);
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.exp-category {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--label);
  white-space: nowrap;
}
.exp-table td.exp-num { text-align: right; white-space: nowrap; }
.exp-table th.exp-num { text-align: right; }
.exp-amount {
  font-size: 13.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.exp-currency {
  display: block;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--subtext);
}
.exp-date { font-size: 12.5px; color: var(--subtext); white-space: nowrap; }
.exp-purpose { min-width: 150px; max-width: 240px; }
.exp-purpose-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text);
  overflow-wrap: anywhere;
}
.exp-reject-reason {
  font-size: 11px;
  line-height: 1.4;
  color: var(--red);
  margin-top: 5px;
  max-width: 160px;
}
.exp-receipt {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 128px;
  padding: 3px 7px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  color: var(--label);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.exp-receipt:hover { border-color: var(--primary); color: var(--primary); }
.exp-receipt > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.exp-muted { color: var(--subtext); }

/* ── Row actions ──────────────────────────────────────────────────────── */
.exp-table td.exp-actions { text-align: right; white-space: nowrap; }
.exp-table th.exp-actions { text-align: right; }
.exp-action-group { display: inline-flex; gap: 5px; justify-content: flex-end; }
.exp-btn-sm {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 27px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.exp-btn-sm:disabled { cursor: not-allowed; opacity: 0.55; }
.exp-btn-sm.tone-ghost {
  background: var(--card);
  border-color: var(--border);
  color: var(--text);
}
.exp-btn-sm.tone-ghost:hover { border-color: var(--primary); color: var(--primary); }
.exp-btn-sm.tone-warn { background: #fff7ed; color: #c2410c; border-color: #fed7aa; }
.exp-btn-sm.tone-warn:hover:not(:disabled) { background: #ffedd5; }
.exp-btn-sm.tone-success { background: var(--green-light); color: var(--green); }
.exp-btn-sm.tone-success:hover:not(:disabled) { background: #d1fae5; }
.exp-btn-sm.tone-danger { background: var(--red-light); color: var(--red); }
.exp-btn-sm.tone-danger:hover:not(:disabled) { background: #fee2e2; }
.exp-btn-sm.tone-danger-ghost { padding: 0 7px; }
.exp-btn-sm.tone-primary { background: var(--primary); color: #fff; }
.exp-btn-sm.tone-primary:hover:not(:disabled) { background: var(--primary-hover); }
.exp-btn-sm.tone-edit { background: var(--blue-light); color: var(--blue); border-color: rgba(37, 99, 235, 0.2); }
.exp-btn-sm.tone-edit:hover:not(:disabled) { background: #dbeafe; }

/* ── Responsive ───────────────────────────────────────────────────────── */
@media (max-width: 900px) {
  .exp-toolbar { align-items: stretch; }
  .exp-filters { width: 100%; }
  .exp-search { flex: 1 1 180px; }
  .exp-select select { max-width: none; width: 100%; }
  .exp-select { flex: 1 1 160px; }
}
@media (max-width: 640px) {
  .exp-summary { grid-template-columns: 1fr; }
  .exp-summary-card { padding: 13px 14px; }
  .exp-summary-value { font-size: 19px; }
  .exp-tabs { width: 100%; }
}
`;

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
      width="680px"
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
    expenseDate: toDateInputValue(initialDraft?.expenseDate) || "",
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

      onSubmitted({ action: isEditing ? "updated" : "saved" });
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

      onSubmitted({ action: "submitted" });
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
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "3px",
        marginTop: "6px",
      }}
    >
      {violations.map((violation, index) => (
        <span
          key={index}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "4px",
            fontSize: "10.5px",
            lineHeight: 1.4,
            color: "var(--amber)",
            background: "var(--amber-light)",
            borderRadius: "var(--radius-xs)",
            padding: "2px 5px",
            width: "fit-content",
            maxWidth: "100%",
          }}
        >
          <AlertTriangle
            size={10}
            aria-hidden="true"
            style={{ flexShrink: 0, marginTop: "2px" }}
          />
          <span style={{ overflowWrap: "anywhere" }}>
            {getViolationMessage(violation)}
          </span>
        </span>
      ))}

      {possibleDuplicateOf && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "10.5px",
            lineHeight: 1.4,
            color: "var(--red)",
            background: "var(--red-light)",
            borderRadius: "var(--radius-xs)",
            padding: "2px 5px",
            width: "fit-content",
            maxWidth: "100%",
          }}
        >
          <Copy size={10} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span style={{ overflowWrap: "anywhere" }}>
            Possible duplicate of {possibleDuplicateOf}
          </span>
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

  const [loadError, setLoadError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

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
    setLoadError(null);

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

      setLoadError(
        getApiErrorMessage(
          err,
          "Unable to load expense claims. Check your connection and try again."
        )
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

  /* Success feedback is informational — clear it on its own. */
  useEffect(() => {
    if (!notice) return undefined;

    const timeoutId = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

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

  const handleDeleteDraft = (claim) => {
    if (!claim?.id || !claim.isDraft) return;

    setDeleteTarget(claim);
  };

  const confirmDeleteDraft = async () => {
    const claim = deleteTarget;
    if (!claim?.id) return;

    setActionClaimId(claim.id);

    try {
      await deleteDraft(claim.id);
      setSelectedClaim(null);
      setDeleteTarget(null);
      setNotice(`Draft ${getClaimDisplayId(claim)} was deleted.`);
      await loadAll();
    } catch (err) {
      console.error("Failed to delete expense draft:", err);
      alert(getApiErrorMessage(err, "Failed to delete expense draft."));
      setDeleteTarget(null);
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

      setNotice(`Claim ${getClaimDisplayId(claim)} approved.`);

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
  /* Summary + client-side filtering                                         */
  /* ---------------------------------------------------------------------- */

  /*
   * Every figure below is derived from the claims the API already returned —
   * no demo data, no extra requests.
   */
  const summary = useMemo(() => {
    const list = Array.isArray(myClaims) ? myClaims : [];

    const drafts = list.filter(isDraftClaim);
    const pending = list.filter((c) => PENDING_STATUSES.includes(c.status));
    const approved = list.filter((c) => APPROVED_STATUSES.includes(c.status));

    const total = list.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    return [
      {
        id: "draft",
        icon: FileText,
        label: "Drafts",
        value: String(drafts.length),
        hint: drafts.length ? "Editable before submission" : "Nothing in progress",
        color: "var(--blue)",
        bg: "var(--blue-light)",
      },
      {
        id: "pending",
        icon: Clock,
        label: "Pending Approval",
        value: String(pending.length),
        hint: pending.length ? "With manager or finance" : "No claims in review",
        color: "var(--amber)",
        bg: "var(--amber-light)",
      },
      {
        id: "approved",
        icon: CheckCircle2,
        label: "Approved",
        value: String(approved.length),
        hint: approved.length ? "Approved for reimbursement" : "Nothing approved yet",
        color: "var(--green)",
        bg: "var(--green-light)",
      },
      {
        id: "total",
        icon: Wallet,
        label: "Total Claimed",
        value: `₹${total.toLocaleString("en-IN")}`,
        hint: `${list.length} claim${list.length === 1 ? "" : "s"} submitted to date`,
        color: "var(--primary)",
        bg: "var(--primary-light)",
      },
    ];
  }, [myClaims]);

  /* Only offer status values that actually exist in the current list. */
  const statusOptions = useMemo(() => {
    const seen = new Set();
    rows.forEach((claim) => {
      if (claim?.status) seen.add(claim.status);
    });
    return Array.from(seen).sort();
  }, [rows]);

  const SUMMARY_FILTERS = {
    draft: "Drafts",
    pending: "Pending Approval",
    approved: "Approved",
  };

  const statusSelectOptions = [
    { value: "all", label: "All statuses" },
    ...(SUMMARY_FILTERS[statusFilter]
      ? [{ value: statusFilter, label: SUMMARY_FILTERS[statusFilter] }]
      : []),
    ...statusOptions.map((status) => ({ value: status, label: status })),
  ];

  const hasActiveFilters = statusFilter !== "all" || query.trim().length > 0;

  const hasEmployeeColumn = ["team", "finance", "approvals"].includes(tab);

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return rows.filter((claim) => {
      if (statusFilter === "draft") return isDraftClaim(claim);
      if (statusFilter === "pending") return PENDING_STATUSES.includes(claim.status);
      if (statusFilter === "approved") return APPROVED_STATUSES.includes(claim.status);
      if (statusFilter !== "all" && claim.status !== statusFilter) return false;

      if (!needle) return true;

      return [
        getClaimDisplayId(claim),
        claim.category,
        claim.businessPurpose,
        claim.merchantName,
        getEmployeeName(claim),
        getEmployeeCode(claim),
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });
  }, [rows, statusFilter, query]);

  const handleSummarySelect = (id) => {
    if (id === "total") {
      setStatusFilter("all");
      setQuery("");
      return;
    }

    setStatusFilter((current) => (current === id ? "all" : id));
  };

  const activeTabLabel = tabs.find((item) => item.id === tab)?.label || "Claims";

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <MainLayout>
      <div className="exp-page" style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <style>{EXPENSES_PAGE_CSS}</style>

        <PageHeader
          title="Expense Management"
          subtitle="Create reimbursement claims, attach GST receipts, and follow every approval stage."
        >
          <button
            id="submit-claim-trigger-btn"
            type="button"
            className="btn btn-primary"
            onClick={() => setShowSubmit(true)}
          >
            <Plus size={16} aria-hidden="true" />
            New Expense Claim
          </button>
        </PageHeader>

        {notice && (
          <div className="exp-banner exp-banner-success" role="status">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{notice}</span>
            <button
              type="button"
              className="exp-banner-dismiss"
              aria-label="Dismiss notification"
              onClick={() => setNotice(null)}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}

        {loadError && (
          <div className="exp-banner exp-banner-error" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{loadError}</span>
            <button type="button" className="exp-banner-retry" onClick={() => loadAll()}>
              <RefreshCw size={13} aria-hidden="true" />
              Retry
            </button>
          </div>
        )}

        {/* Summary — every figure is derived from claims returned by the API */}
        <div className="exp-summary" aria-label="Your claim summary">
          {summary.map((card) => {
            const Icon = card.icon;
            const active = statusFilter === card.id;

            return (
              <button
                key={card.id}
                type="button"
                className={`exp-summary-card${active ? " is-active" : ""}`}
                aria-pressed={active}
                onClick={() => handleSummarySelect(card.id)}
              >
                <span
                  className="exp-summary-icon"
                  style={{ background: card.bg, color: card.color }}
                >
                  <Icon size={20} aria-hidden="true" />
                </span>

                <span className="exp-summary-body">
                  <span className="exp-summary-label">{card.label}</span>
                  <span className="exp-summary-value">{card.value}</span>
                  <span className="exp-summary-hint">{card.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Navigation + filters */}
        <div className="exp-toolbar">
          <div className="exp-tabs" role="tablist" aria-label="Claim views">
            {tabs.map((tabItem) => (
              <button
                key={tabItem.id}
                type="button"
                role="tab"
                aria-selected={tab === tabItem.id}
                aria-controls="exp-claims-panel"
                className={`exp-tab${tab === tabItem.id ? " is-active" : ""}`}
                onClick={() => setTab(tabItem.id)}
              >
                {tabItem.label}
              </button>
            ))}
          </div>

          <div className="exp-filters">
            <label className="exp-search">
              <Search size={14} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search claims"
                aria-label={`Search ${activeTabLabel}`}
              />
            </label>

            <label className="exp-select">
              <span className="visually-hidden">Filter by status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                {statusSelectOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {hasActiveFilters && (
              <button
                type="button"
                className="exp-clear"
                onClick={() => {
                  setStatusFilter("all");
                  setQuery("");
                }}
              >
                <X size={13} aria-hidden="true" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Claims */}
        <section
          className="exp-panel"
          id="exp-claims-panel"
          aria-labelledby="exp-claims-title"
        >
          <header className="exp-panel-head">
            <div>
              <h2 className="exp-panel-title" id="exp-claims-title">
                {activeTabLabel}
              </h2>
              <p className="exp-panel-sub">
                {loading
                  ? "Loading claims…"
                  : `${visibleRows.length} of ${rows.length} claim${
                      rows.length === 1 ? "" : "s"
                    }`}
                {!loading && hasActiveFilters ? " · filtered" : ""}
              </p>
            </div>
          </header>

          {loading ? (
            <div className="exp-skeleton" role="status" aria-live="polite">
              <span className="visually-hidden">Loading expense claims</span>
              {[0, 1, 2, 3, 4].map((row) => (
                <div key={row} className="exp-skeleton-row skeleton" />
              ))}
            </div>
          ) : loadError && rows.length === 0 ? (
            <div className="exp-error-state" role="alert">
              <AlertTriangle size={22} aria-hidden="true" />
              <p className="exp-error-title">Claims could not be loaded</p>
              <p className="exp-error-text">{loadError}</p>
              <button type="button" className="btn btn-ghost" onClick={() => loadAll()}>
                <RefreshCw size={14} aria-hidden="true" />
                Try again
              </button>
            </div>
          ) : visibleRows.length === 0 && rows.length > 0 ? (
            <EmptyState
              icon={Search}
              title="No claims match your filters"
              subtitle="Try a different status or clear the search to see the full list."
            />
          ) : visibleRows.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={tab === "mine" ? "No expense claims yet" : "Nothing pending approval"}
              subtitle={
                tab === "mine"
                  ? "Create your first claim with New Expense Claim. You can save it as a draft and edit it any time before submitting."
                  : "You're all caught up."
              }
            />
          ) : (
            <div className="exp-table-wrap">
              <table className="exp-table">
                <thead>
                  <tr>
                    <th scope="col">Claim ID</th>
                    {hasEmployeeColumn && <th scope="col">Employee</th>}
                    <th scope="col">Category</th>
                    <th scope="col" className="exp-num">
                      Amount
                    </th>
                    <th scope="col">Expense Date</th>
                    <th scope="col">Purpose</th>
                    <th scope="col">Status</th>
                    <th scope="col">Receipt</th>
                    <th scope="col" className="exp-actions">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleRows.map((claim, index) => {
                    const meta = expenseStatusMeta[claim.status] || expenseStatusMeta.Draft;
                    const locked = LOCKED_STATUSES.includes(claim.status);
                    const receipt = claim?.receipts?.[0] || null;
                    const receiptLabel = claim?.receiptFileName || receipt?.fileName || "";
                    const receiptAttached =
                      Boolean(claim?.receiptAttached) ||
                      Boolean(claim?.receiptPending === false) ||
                      Boolean(claim?.receipts?.length);
                    const canManageDraft = Boolean(claim?.isDraft) && isOwnClaim(claim);

                    return (
                      <tr
                        key={claim.id || claim.claimNumber || index}
                        onClick={() => setSelectedClaim(claim)}
                      >
                        <td>
                          <span className="exp-claim-id" title={claim.id || ""}>
                            {getClaimDisplayId(claim)}
                          </span>
                        </td>

                        {hasEmployeeColumn && (
                          <td>
                            <span className="exp-emp-name">{getEmployeeName(claim)}</span>
                            <span className="exp-emp-code">{getEmployeeCode(claim)}</span>
                          </td>
                        )}

                        <td>
                          <span className="exp-category">{claim.category || "—"}</span>
                        </td>

                        <td className="exp-num">
                          <span className="exp-amount">{fmtMoney(claim)}</span>
                          {claim.currency && claim.currency !== "INR" && (
                            <span className="exp-currency">{claim.currency}</span>
                          )}
                        </td>

                        <td className="exp-date">{fmtDate(claim.expenseDate)}</td>

                        <td className="exp-purpose">
                          <span className="exp-purpose-text" title={claim.businessPurpose || ""}>
                            {claim.businessPurpose || "—"}
                          </span>
                          <ViolationFlags claim={claim} />
                        </td>

                        <td>
                          <StatusBadge label={meta.label} color={meta.color} bg={meta.bg} />

                          {tab === "mine" &&
                            claim.status === "Rejected" &&
                            claim.rejectionReason && (
                              <p className="exp-reject-reason">{claim.rejectionReason}</p>
                            )}
                        </td>

                        <td onClick={(event) => event.stopPropagation()}>
                          {receiptAttached ? (
                            <button
                              type="button"
                              className="exp-receipt"
                              title={receiptLabel || "Receipt attached"}
                              aria-label={
                                receiptLabel ? `Open receipt ${receiptLabel}` : "Open receipt"
                              }
                              onClick={() => handleViewReceipt(claim)}
                            >
                              <Paperclip size={12} aria-hidden="true" />
                              <span>{shortFileName(receiptLabel) || "Receipt attached"}</span>
                            </button>
                          ) : (
                            <span className="exp-muted">—</span>
                          )}
                        </td>

                        <td
                          className="exp-actions"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {hasEmployeeColumn ? (
                            <div className="exp-action-group">
                              <button
                                type="button"
                                className="exp-btn-sm tone-ghost"
                                onClick={() => setSelectedClaim(claim)}
                                title="Inspect claim details"
                              >
                                <Eye size={12} aria-hidden="true" />
                                Review
                              </button>

                              {canApprove && SEND_BACKABLE_STATUSES.includes(claim.status) && (
                                <button
                                  type="button"
                                  id={`sendback-${claim.id}-btn`}
                                  className="exp-btn-sm tone-warn"
                                  onClick={() => setSendBackTarget(claim)}
                                  disabled={locked}
                                >
                                  <Send size={12} aria-hidden="true" />
                                  Send Back
                                </button>
                              )}

                              {canApprove && (tab === "approvals" || tab === "finance") && (
                                <>
                                  <button
                                    type="button"
                                    id={`approve-${claim.id}-btn`}
                                    className="exp-btn-sm tone-success"
                                    onClick={() => handleApprove(claim)}
                                    disabled={locked}
                                  >
                                    <Check size={13} aria-hidden="true" />
                                    Approve
                                  </button>

                                  <button
                                    type="button"
                                    id={`reject-${claim.id}-btn`}
                                    className="exp-btn-sm tone-danger"
                                    onClick={() => setRejectTarget(claim)}
                                    disabled={locked}
                                  >
                                    <X size={13} aria-hidden="true" />
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          ) : canManageDraft ? (
                            <div className="exp-action-group">
                              <button
                                type="button"
                                className="exp-btn-sm tone-edit"
                                onClick={() => handleEditDraft(claim)}
                                disabled={actionClaimId === claim.id}
                                title="Edit draft"
                              >
                                <Edit size={12} aria-hidden="true" />
                                Edit
                              </button>

                              <button
                                type="button"
                                className="exp-btn-sm tone-primary"
                                onClick={() => handleSubmitDraft(claim)}
                                disabled={actionClaimId === claim.id}
                                title="Submit draft for approval"
                              >
                                <Send size={12} aria-hidden="true" />
                                Submit
                              </button>

                              <button
                                type="button"
                                className="exp-btn-sm tone-danger tone-danger-ghost"
                                onClick={() => handleDeleteDraft(claim)}
                                disabled={actionClaimId === claim.id}
                                title="Delete draft"
                                aria-label={`Delete draft ${getClaimDisplayId(claim)}`}
                              >
                                <Trash2 size={12} aria-hidden="true" />
                              </button>
                            </div>
                          ) : (
                            <span className="exp-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Submit Modal */}
      <SubmitClaimModal
        key={editingDraft?.id ?? "new"}
        isOpen={showSubmit}
        onClose={() => {
          setShowSubmit(false);
          setEditingDraft(null);
        }}
        onSubmitted={(result) => {
          const wasEditing = Boolean(editingDraft);

          loadAll();
          setEditingDraft(null);

          if (result?.action === "submitted") {
            setNotice(
              wasEditing
                ? "Draft updated and submitted. It is now with the approver."
                : "Claim submitted for approval."
            );
            return;
          }

          setNotice(
            wasEditing
              ? "Draft updated. It stays editable until you submit it."
              : "Draft saved — it is in My Claims and you can edit it any time before submitting."
          );
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

      {/* Delete draft confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title={`Delete draft ${deleteTarget ? getClaimDisplayId(deleteTarget) : ""}?`}
        message="This removes the draft permanently. Receipts already attached will be discarded. This cannot be undone."
        confirmLabel="Delete draft"
        danger
        onConfirm={confirmDeleteDraft}
        onCancel={() => setDeleteTarget(null)}
      />
    </MainLayout>
  );
}
