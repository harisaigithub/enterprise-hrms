/**
 * Expense service — Module 14
 * Mirrors the async-delay + { data } shape of leaveService/attendanceService.
 */

import {
  EXPENSE_POLICY, SUBMISSION_WINDOW_DAYS, LOCKED_STATUSES,
  RAW_CLAIMS, generateClaimId,
} from "../mock/expenses";

const DELAY = 350;

function delay(value) {
  return new Promise((resolve) => setTimeout(() => resolve({ data: value }), DELAY));
}

let _claims = [...RAW_CLAIMS];

function daysBetween(dateStr, refStr) {
  return Math.round((new Date(refStr) - new Date(dateStr)) / 86400000);
}

/**
 * Runs the automated policy checks from 
 * Violations are ALWAYS surfaced for approver judgment, never used to
 * silently block or auto-reject a submission.
 */
function checkPolicyViolations(claim) {
  const violations = [];
  const policy = EXPENSE_POLICY[claim.category];

  if (policy && claim.amount > policy.limit) {
    violations.push(`Exceeds ${claim.category} category limit of ₹${policy.limit.toLocaleString()} by ₹${(claim.amount - policy.limit).toLocaleString()}`);
  }
  if (policy && claim.amount > policy.receiptThreshold && !claim.receiptAttached) {
    violations.push(`Receipt missing — required above ₹${policy.receiptThreshold.toLocaleString()} for ${claim.category}`);
  }
  const today = new Date().toISOString().slice(0, 10);
  const ageDays = daysBetween(claim.expenseDate, today);
  if (ageDays > SUBMISSION_WINDOW_DAYS) {
    violations.push(`Submitted ${ageDays - SUBMISSION_WINDOW_DAYS} day(s) after the ${SUBMISSION_WINDOW_DAYS}-day submission window`);
  }
  return violations;
}

/** Duplicate-receipt detection : same amount + date + category already on file. */
function findPossibleDuplicate(claim) {
  const match = _claims.find((c) =>
    c.id !== claim.id &&
    c.category === claim.category &&
    c.amount === claim.amount &&
    c.expenseDate === claim.expenseDate
  );
  return match ? match.id : null;
}

export function getMyExpenseClaims(employeeId) {
  return delay(_claims.filter((c) => c.employeeId === employeeId));
}

export function getAllExpenseClaims() {
  return delay(_claims);
}

/** Claims awaiting a given approval stage ("Manager" | "Finance") */
export function getPendingApprovals(stage) {
  return delay(_claims.filter((c) => c.approvalStage === stage));
}

export function getExpensePolicy() {
  return delay(EXPENSE_POLICY);
}

/**
 * Submits a new claim. Policy violations and possible duplicates are computed
 * and attached to the claim, but never block submission .
 */
export function submitExpenseClaim(input) {
  const claim = {
    id: generateClaimId(),
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    category: input.category,
    amount: input.amount,
    expenseDate: input.expenseDate,
    businessPurpose: input.businessPurpose,
    receiptAttached: input.receiptAttached,
    receiptFileName: input.receiptFileName || null,
    status: "Pending Manager Approval",
    approvalStage: "Manager",
    submittedOn: new Date().toISOString().slice(0, 10),
    violations: [],
    possibleDuplicateOf: null,
    rejectionReason: null,
  };
  claim.violations = checkPolicyViolations(claim);
  claim.possibleDuplicateOf = findPossibleDuplicate(claim);

  _claims = [claim, ..._claims];
  return delay(claim);
}

/**
 * Advances a claim through the approval chain :
 * Manager approval → Pending Finance Approval → Finance approval → Approved
 * for Reimbursement (locked, queues into next payroll cycle).
 */
export function approveClaim(claimId, stage) {
  const claim = _claims.find((c) => c.id === claimId);
  if (!claim || LOCKED_STATUSES.includes(claim.status)) return delay(claim || null);

  if (stage === "Manager") {
    claim.status = "Pending Finance Approval";
    claim.approvalStage = "Finance";
  } else if (stage === "Finance") {
    claim.status = "Approved for Reimbursement";
    claim.approvalStage = null;
  }
  return delay(claim);
}

/** Rejection at any stage  — employee can amend and resubmit. */
export function rejectClaim(claimId, stage, reason) {
  const claim = _claims.find((c) => c.id === claimId);
  if (!claim || LOCKED_STATUSES.includes(claim.status)) return delay(claim || null);

  claim.status = "Rejected";
  claim.approvalStage = null;
  claim.rejectionReason = reason;
  return delay(claim);
}