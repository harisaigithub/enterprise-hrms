import type {
    BGVCaseStatus,
    BGVPriority,
    BGVVerificationType,
    BGVVerificationStatus,
    BGVVerificationResult,
    BGVDiscrepancyLevel,
    BGVDiscrepancyStatus,
    BGVDocumentStatus,
    BGVReviewDecision,
    BGVFinalResult,
    BGVFinalDecision,
} from "@prisma/client";

import type {
    BGV_CASE_STATUSES,
    BGV_PRIORITIES,
    BGV_VERIFICATION_TYPES,
    BGV_VERIFICATION_STATUSES,
    BGV_VERIFICATION_RESULTS,
    BGV_DISCREPANCY_LEVELS,
    BGV_DISCREPANCY_STATUSES,
    BGV_DOCUMENT_STATUSES,
    BGV_REVIEW_DECISIONS,
    BGV_FINAL_RESULTS,
    BGV_FINAL_DECISIONS,
} from "./bgv.constants";

/* =========================================================
   CONSTANT-DERIVED TYPES
   ========================================================= */

export type BgvCaseStatus =
    (typeof BGV_CASE_STATUSES)[number];

export type BgvPriority =
    (typeof BGV_PRIORITIES)[number];

export type BgvVerificationType =
    (typeof BGV_VERIFICATION_TYPES)[number];

export type BgvVerificationStatus =
    (typeof BGV_VERIFICATION_STATUSES)[number];

export type BgvVerificationResult =
    (typeof BGV_VERIFICATION_RESULTS)[number];

export type BgvDiscrepancyLevel =
    (typeof BGV_DISCREPANCY_LEVELS)[number];

export type BgvDiscrepancyStatus =
    (typeof BGV_DISCREPANCY_STATUSES)[number];

export type BgvDocumentStatus =
    (typeof BGV_DOCUMENT_STATUSES)[number];

export type BgvReviewDecision =
    (typeof BGV_REVIEW_DECISIONS)[number];

export type BgvFinalResult =
    (typeof BGV_FINAL_RESULTS)[number];

export type BgvFinalDecision =
    (typeof BGV_FINAL_DECISIONS)[number];

/* =========================================================
   PRISMA-COMPATIBLE TYPES
   ========================================================= */

export type BgvCaseStatusValue = BGVCaseStatus;
export type BgvPriorityValue = BGVPriority;

export type BgvVerificationTypeValue = BGVVerificationType;
export type BgvVerificationStatusValue = BGVVerificationStatus;
export type BgvVerificationResultValue = BGVVerificationResult;

export type BgvDiscrepancyLevelValue = BGVDiscrepancyLevel;
export type BgvDiscrepancyStatusValue = BGVDiscrepancyStatus;

export type BgvDocumentStatusValue = BGVDocumentStatus;

export type BgvReviewDecisionValue = BGVReviewDecision;

export type BgvFinalResultValue = BGVFinalResult;
export type BgvFinalDecisionValue = BGVFinalDecision;

/* =========================================================
   PAGINATION
   ========================================================= */

export interface BgvPaginationInput {
    page?: number;
    limit?: number;
}

/* =========================================================
   CASE
   ========================================================= */

export interface CreateBgvCaseInput {
    candidateId?: string;
    employeeId?: string;
    applicationId?: string;

    packageId?: string;
    assignedVerifierId?: string;
    vendorId?: string;

    status?: BgvCaseStatus;
    priority?: BgvPriority;

    required?: boolean;
    blocking?: boolean;

    dueAt?: string | Date;
}

export interface UpdateBgvCaseInput {
    status?: BgvCaseStatus;
    priority?: BgvPriority;

    required?: boolean;
    blocking?: boolean;

    assignedVerifierId?: string | null;
    vendorId?: string | null;

    dueAt?: string | Date | null;

    finalResult?: BgvFinalResult | null;
    finalDecision?: BgvFinalDecision | null;

    reviewRemarks?: string | null;
}

export interface BgvCaseFilters extends BgvPaginationInput {
    status?: BgvCaseStatus;
    priority?: BgvPriority;

    candidateId?: string;
    employeeId?: string;
    applicationId?: string;

    assignedVerifierId?: string;
    vendorId?: string;

    overdue?: boolean;

    currentEmployeeId?: string;
    currentRole?: string;
}

/* =========================================================
   VERIFICATION
   ========================================================= */

export interface CreateBgvVerificationInput {
    caseId: string;

    type: BgvVerificationType;

    assignedToId?: string;
    vendorId?: string;

    source?: string;

    dueAt?: string | Date;
}

export interface UpdateBgvVerificationInput {
    status?: BgvVerificationStatus;

    assignedToId?: string | null;
    vendorId?: string | null;

    source?: string | null;

    startedAt?: string | Date | null;
    dueAt?: string | Date | null;
    completedAt?: string | Date | null;

    result?: BgvVerificationResult | null;
    discrepancyLevel?: BgvDiscrepancyLevel | null;

    remarks?: string | null;
}

export interface BgvVerificationFilters
    extends BgvPaginationInput {
    caseId?: string;
    type?: BgvVerificationType;
    status?: BgvVerificationStatus;
    assignedToId?: string;
    vendorId?: string;
    result?: BGVVerificationResult;
    overdue?: boolean;

    currentEmployeeId?: string;
    currentRole?: string;
}

/* =========================================================
   DOCUMENT
   ========================================================= */

export interface CreateBgvDocumentInput {
    caseId: string;
    verificationId?: string;

    documentType: string;

    fileName: string;
    filePath: string;

    mimeType?: string;
    fileSize?: number;

    uploadedById: string;

    expiresAt?: string | Date;
}

export interface VerifyBgvDocumentInput {
    status: BgvDocumentStatus;

    verifiedById: string;

    rejectionReason?: string;
}

/* =========================================================
   DISCREPANCY
   ========================================================= */

export interface CreateBgvDiscrepancyInput {
    caseId: string;

    verificationId?: string;

    level: BgvDiscrepancyLevel;

    fieldName?: string;
    expectedValue?: string;
    actualValue?: string;

    description: string;

    raisedById: string;
}

export interface ResolveBgvDiscrepancyInput {
    status:
    | "RESOLVED"
    | "ACCEPTED"
    | "REJECTED";

    resolvedById: string;

    resolution: string;
}

/* =========================================================
   REVIEW
   ========================================================= */

export interface CreateBgvReviewInput {
    caseId: string;

    reviewerId: string;

    decision: BgvReviewDecision;

    remarks: string;
}

/* =========================================================
   ASSIGNMENT
   ========================================================= */

export interface AssignBgvCaseInput {
    caseId: string;

    assignedToId?: string | null;
    vendorId?: string | null;

    assignedById: string;

    reason?: string;
}

/* =========================================================
   FINAL DECISION
   ========================================================= */

export interface FinalBgvDecisionInput {
    caseId: string;

    finalResult: BgvFinalResult;
    finalDecision: BgvFinalDecision;

    reviewedById: string;

    reviewRemarks?: string;
}

/* =========================================================
   API RESPONSE TYPES
   ========================================================= */

export interface BgvListResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface BgvSingleResponse<T> {
    data: T;
}
