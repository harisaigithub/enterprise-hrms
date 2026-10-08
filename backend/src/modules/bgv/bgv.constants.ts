/**
 * Background Verification (BGV)
 * Domain constants
 *
 * IMPORTANT:
 * Keep these values synchronized with the Prisma BGV enums.
 */

/* =========================================================
   CASE
   ========================================================= */

export const BGV_CASE_STATUSES = [
    "DRAFT",
    "INITIATED",
    "CANDIDATE_ACTION_REQUIRED",
    "IN_PROGRESS",
    "UNDER_REVIEW",
    "DISCREPANCY",
    "ESCALATED",
    "CLEARED",
    "CONCERN",
    "UNABLE_TO_VERIFY",
    "ON_HOLD",
    "CANCELLED",
    "CLOSED",
] as const;

export const BGV_PRIORITIES = [
    "NORMAL",
    "HIGH",
    "CRITICAL",
] as const;

/* =========================================================
   VERIFICATION
   ========================================================= */

export const BGV_VERIFICATION_TYPES = [
    "IDENTITY",
    "ADDRESS",
    "EMPLOYMENT",
    "EDUCATION",
    "CRIMINAL",
    "REFERENCE",
    "DOCUMENT",
    "CUSTOM",
] as const;

export const BGV_VERIFICATION_STATUSES = [
    "PENDING",
    "ASSIGNED",
    "IN_PROGRESS",
    "CANDIDATE_ACTION_REQUIRED",
    "SUBMITTED",
    "UNDER_REVIEW",
    "COMPLETED",
    "DISCREPANCY",
    "FAILED",
    "UNABLE_TO_VERIFY",
    "ON_HOLD",
    "CANCELLED",
] as const;

export const BGV_VERIFICATION_RESULTS = [
    "CLEAR",
    "CONCERN",
    "DISCREPANCY",
    "FAILED",
    "UNABLE_TO_VERIFY",
] as const;

/* =========================================================
   DISCREPANCY
   ========================================================= */

export const BGV_DISCREPANCY_LEVELS = [
    "MINOR",
    "MAJOR",
    "CRITICAL",
] as const;

export const BGV_DISCREPANCY_STATUSES = [
    "OPEN",
    "UNDER_REVIEW",
    "RESOLVED",
    "ACCEPTED",
    "REJECTED",
] as const;

/* =========================================================
   DOCUMENT
   ========================================================= */

export const BGV_DOCUMENT_STATUSES = [
    "PENDING",
    "VERIFIED",
    "REJECTED",
    "EXPIRED",
] as const;

/* =========================================================
   REVIEW
   ========================================================= */

export const BGV_REVIEW_DECISIONS = [
    "APPROVE",
    "REJECT",
    "REQUEST_MORE_INFORMATION",
    "ESCALATE",
] as const;

/* =========================================================
   FINAL DECISION
   ========================================================= */

export const BGV_FINAL_RESULTS = [
    "CLEARED",
    "CLEARED_WITH_DISCREPANCY",
    "CONCERN",
    "UNABLE_TO_VERIFY",
    "EXCEPTION",
    "REJECTED",
] as const;

export const BGV_FINAL_DECISIONS = [
    "PROCEED",
    "HOLD",
    "ESCALATE",
    "CLOSE",
] as const;

/* =========================================================
   OPERATIONAL LIMITS
   ========================================================= */

export const BGV_LIMITS = {
    MAX_REMARKS_LENGTH: 5000,
    MAX_DESCRIPTION_LENGTH: 5000,
    MAX_RESOLUTION_LENGTH: 5000,
    MAX_REVIEW_REMARKS_LENGTH: 5000,

    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
} as const;

/* =========================================================
   FILES
   ========================================================= */

export const BGV_ALLOWED_DOCUMENT_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
] as const;

export const BGV_MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

/* =========================================================
   AUDIT ACTIONS
   ========================================================= */

export const BGV_AUDIT_ACTIONS = {
    CASE_CREATED: "BGV_CASE_CREATED",
    CASE_UPDATED: "BGV_CASE_UPDATED",
    CASE_ASSIGNED: "BGV_CASE_ASSIGNED",

    VERIFICATION_CREATED: "BGV_VERIFICATION_CREATED",
    VERIFICATION_ASSIGNED: "BGV_VERIFICATION_ASSIGNED",
    VERIFICATION_STARTED: "BGV_VERIFICATION_STARTED",
    VERIFICATION_SUBMITTED: "BGV_VERIFICATION_SUBMITTED",
    VERIFICATION_COMPLETED: "BGV_VERIFICATION_COMPLETED",

    DOCUMENT_UPLOADED: "BGV_DOCUMENT_UPLOADED",
    DOCUMENT_VERIFIED: "BGV_DOCUMENT_VERIFIED",
    DOCUMENT_REJECTED: "BGV_DOCUMENT_REJECTED",

    DISCREPANCY_RAISED: "BGV_DISCREPANCY_RAISED",
    DISCREPANCY_RESOLVED: "BGV_DISCREPANCY_RESOLVED",

    REVIEW_CREATED: "BGV_REVIEW_CREATED",
    FINAL_DECISION: "BGV_FINAL_DECISION",

    VENDOR_ASSIGNED: "BGV_VENDOR_ASSIGNED",
    STATUS_CHANGED: "BGV_STATUS_CHANGED",
} as const;
