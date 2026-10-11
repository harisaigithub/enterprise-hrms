import {
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
    BGV_LIMITS,
} from "./bgv.constants";

import {
    BGVCaseStatus,
    BGVPriority,
    BGVFinalResult,
    BGVFinalDecision,
    BGVVerificationType,
    BGVVerificationStatus,
    BGVVerificationResult,
    BGVDiscrepancyLevel,
} from "@prisma/client";

/**
 * Lightweight validation layer.
 *
 * This project already uses AppError inside services.
 * Therefore these validators return normalized input and throw
 * regular Error objects for now. The controller/service adapter
 * can map validation errors to the project's existing AppError.
 */

export class BgvValidationError extends Error {
    public readonly statusCode = 400;

    constructor(message: string) {
        super(message);
        this.name = "BgvValidationError";
    }
}

function requiredString(
    value: unknown,
    field: string
): string {
    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {
        throw new BgvValidationError(
            `${field} is required`
        );
    }

    return value.trim();
}

function optionalString(
    value: unknown,
    field: string,
    maxLength?: number
): string | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    if (typeof value !== "string") {
        throw new BgvValidationError(
            `${field} must be a string`
        );
    }

    const normalized = value.trim();

    if (maxLength && normalized.length > maxLength) {
        throw new BgvValidationError(
            `${field} cannot exceed ${maxLength} characters`
        );
    }

    return normalized || undefined;
}

function uuid(
    value: unknown,
    field: string,
    optional = false
): string | undefined {
    if (
        optional &&
        (value === undefined || value === null || value === "")
    ) {
        return undefined;
    }

    const normalized = requiredString(value, field);

    // UUID validation without adding another runtime dependency.
    const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(normalized)) {
        throw new BgvValidationError(
            `${field} must be a valid UUID`
        );
    }

    return normalized;
}

function enumValue<T extends readonly string[]>(
    value: unknown,
    allowed: T,
    field: string,
    optional = false
): T[number] | undefined {
    if (
        optional &&
        (value === undefined || value === null || value === "")
    ) {
        return undefined;
    }

    if (
        typeof value !== "string" ||
        !allowed.includes(value)
    ) {
        throw new BgvValidationError(
            `${field} has an invalid value`
        );
    }

    return value as T[number];
}

function booleanValue(
    value: unknown,
    field: string,
    optional = false
): boolean | undefined {
    if (
        optional &&
        (value === undefined || value === null)
    ) {
        return undefined;
    }

    if (typeof value !== "boolean") {
        throw new BgvValidationError(
            `${field} must be a boolean`
        );
    }

    return value;
}

function dateValue(
    value: unknown,
    field: string,
    optional = false
): Date | undefined {
    if (
        optional &&
        (value === undefined || value === null || value === "")
    ) {
        return undefined;
    }

    const date =
        value instanceof Date
            ? value
            : new Date(String(value));

    if (Number.isNaN(date.getTime())) {
        throw new BgvValidationError(
            `${field} must be a valid date`
        );
    }

    return date;
}

/* =========================================================
   CASE
   ========================================================= */

export function validateCreateBgvCase(
    input: Record<string, unknown>
) {
    return {
        candidateId: uuid(
            input.candidateId,
            "candidateId",
            true
        ),

        employeeId: uuid(
            input.employeeId,
            "employeeId",
            true
        ),

        applicationId: uuid(
            input.applicationId,
            "applicationId",
            true
        ),

        packageId: uuid(
            input.packageId,
            "packageId",
            true
        ),

        assignedVerifierId: uuid(
            input.assignedVerifierId,
            "assignedVerifierId",
            true
        ),

        vendorId: uuid(
            input.vendorId,
            "vendorId",
            true
        ),

        status: enumValue(
            input.status,
            BGV_CASE_STATUSES,
            "status",
            true
        ),

        priority: enumValue(
            input.priority,
            BGV_PRIORITIES,
            "priority",
            true
        ),

        required: booleanValue(
            input.required,
            "required",
            true
        ),

        blocking: booleanValue(
            input.blocking,
            "blocking",
            true
        ),

        dueAt: dateValue(
            input.dueAt,
            "dueAt",
            true
        ),
    };
}

type ValidatedUpdateBgvCase = {
    status?: BGVCaseStatus;
    priority?: BGVPriority;
    required?: boolean;
    blocking?: boolean;
    assignedVerifierId?: string | null;
    vendorId?: string | null;
    dueAt?: string | Date | null;
    finalResult?: BGVFinalResult | null;
    finalDecision?: BGVFinalDecision | null;
    reviewRemarks?: string | null;
};

export function validateUpdateBgvCase(
    input: Record<string, unknown>
) {
    const output: ValidatedUpdateBgvCase = {};

    if ("status" in input) {
        output.status = enumValue(
            input.status,
            BGV_CASE_STATUSES,
            "status"
        );
    }

    if ("priority" in input) {
        output.priority = enumValue(
            input.priority,
            BGV_PRIORITIES,
            "priority"
        );
    }

    if ("required" in input) {
        output.required = booleanValue(
            input.required,
            "required"
        );
    }

    if ("blocking" in input) {
        output.blocking = booleanValue(
            input.blocking,
            "blocking"
        );
    }

    if ("assignedVerifierId" in input) {
        output.assignedVerifierId =
            input.assignedVerifierId === null
                ? null
                : uuid(
                    input.assignedVerifierId,
                    "assignedVerifierId"
                );
    }

    if ("vendorId" in input) {
        output.vendorId =
            input.vendorId === null
                ? null
                : uuid(input.vendorId, "vendorId");
    }

    if ("dueAt" in input) {
        output.dueAt =
            input.dueAt === null
                ? null
                : dateValue(input.dueAt, "dueAt");
    }

    if ("finalResult" in input) {
        output.finalResult =
            input.finalResult === null
                ? null
                : enumValue(
                    input.finalResult,
                    BGV_FINAL_RESULTS,
                    "finalResult"
                );
    }

    if ("finalDecision" in input) {
        output.finalDecision =
            input.finalDecision === null
                ? null
                : enumValue(
                    input.finalDecision,
                    BGV_FINAL_DECISIONS,
                    "finalDecision"
                );
    }

    if ("reviewRemarks" in input) {
        output.reviewRemarks =
            input.reviewRemarks === null
                ? null
                : optionalString(
                    input.reviewRemarks,
                    "reviewRemarks",
                    BGV_LIMITS.MAX_REVIEW_REMARKS_LENGTH
                );
    }

    return output;
}

/* =========================================================
   VERIFICATION
   ========================================================= */
export interface ValidatedCreateBgvVerification {
    caseId: string;
    type: BGVVerificationType;
    candidateDocumentId?: string | null;
    assignedToId?: string;
    vendorId?: string;
    source?: string;
    dueAt?: Date;
}

export interface ValidatedUpdateBgvVerification {
    status?: BGVVerificationStatus;
    assignedToId?: string | null;
    vendorId?: string | null;
    source?: string | null;
    startedAt?: Date | null;
    dueAt?: Date | null;
    completedAt?: Date | null;
    result?: BGVVerificationResult | null;
    discrepancyLevel?: BGVDiscrepancyLevel | null;
    remarks?: string | null;
}

export function validateCreateBgvVerification(
    input: Record<string, unknown>
): ValidatedCreateBgvVerification {
    const type = enumValue(
        input.type,
        BGV_VERIFICATION_TYPES,
        "type"
    );

    if (!type) {
        throw new BgvValidationError(
            "type is required"
        );
    }

    return {
        caseId: uuid(input.caseId, "caseId")!,
        type: type as BGVVerificationType,

        candidateDocumentId: uuid(
            input.candidateDocumentId,
            "candidateDocumentId",
            true
        ),

        assignedToId: uuid(
            input.assignedToId,
            "assignedToId",
            true
        ),

        vendorId: uuid(
            input.vendorId,
            "vendorId",
            true
        ),

        source: optionalString(
            input.source,
            "source",
            500
        ),

        dueAt: dateValue(
            input.dueAt,
            "dueAt",
            true
        ),
    };
}

export function validateUpdateBgvVerification(
    input: Record<string, unknown>
): ValidatedUpdateBgvVerification {

    const output: ValidatedUpdateBgvVerification = {};

    if ("status" in input) {
        const status = enumValue(
            input.status,
            BGV_VERIFICATION_STATUSES,
            "status"
        );

        if (!status) {
            throw new BgvValidationError(
                "status is required"
            );
        }

        output.status =
            status as BGVVerificationStatus;
    }

    if ("assignedToId" in input) {
        output.assignedToId =
            input.assignedToId === null
                ? null
                : uuid(
                    input.assignedToId,
                    "assignedToId"
                );
    }

    if ("vendorId" in input) {
        output.vendorId =
            input.vendorId === null
                ? null
                : uuid(
                    input.vendorId,
                    "vendorId"
                );
    }

    if ("source" in input) {
        output.source =
            input.source === null
                ? null
                : optionalString(
                    input.source,
                    "source",
                    500
                ) ?? null;
    }

    if ("startedAt" in input) {
        output.startedAt =
            input.startedAt === null
                ? null
                : dateValue(
                    input.startedAt,
                    "startedAt"
                ) ?? null;
    }

    if ("dueAt" in input) {
        output.dueAt =
            input.dueAt === null
                ? null
                : dateValue(
                    input.dueAt,
                    "dueAt"
                ) ?? null;
    }

    if ("completedAt" in input) {
        output.completedAt =
            input.completedAt === null
                ? null
                : dateValue(
                    input.completedAt,
                    "completedAt"
                ) ?? null;
    }

    if ("result" in input) {
        output.result =
            input.result === null
                ? null
                : enumValue(
                    input.result,
                    BGV_VERIFICATION_RESULTS,
                    "result"
                ) as BGVVerificationResult;
    }

    if ("discrepancyLevel" in input) {
        output.discrepancyLevel =
            input.discrepancyLevel === null
                ? null
                : enumValue(
                    input.discrepancyLevel,
                    BGV_DISCREPANCY_LEVELS,
                    "discrepancyLevel"
                ) as BGVDiscrepancyLevel;
    }

    if ("remarks" in input) {
        output.remarks =
            input.remarks === null
                ? null
                : optionalString(
                    input.remarks,
                    "remarks",
                    BGV_LIMITS.MAX_REMARKS_LENGTH
                ) ?? null;
    }

    return output;
}

/* =========================================================
   DISCREPANCY
   ========================================================= */

export function validateCreateBgvDiscrepancy(
    input: Record<string, unknown>
) {
    return {
        caseId: uuid(input.caseId, "caseId"),

        verificationId: uuid(
            input.verificationId,
            "verificationId",
            true
        ),

        level: enumValue(
            input.level,
            BGV_DISCREPANCY_LEVELS,
            "level"
        ),

        fieldName: optionalString(
            input.fieldName,
            "fieldName",
            200
        ),

        expectedValue: optionalString(
            input.expectedValue,
            "expectedValue",
            2000
        ),

        actualValue: optionalString(
            input.actualValue,
            "actualValue",
            2000
        ),

        description: requiredString(
            input.description,
            "description"
        ),

        raisedById: uuid(
            input.raisedById,
            "raisedById"
        ),
    };
}

export function validateResolveBgvDiscrepancy(
    input: Record<string, unknown>
) {
    return {
        status: enumValue(
            input.status,
            BGV_DISCREPANCY_STATUSES.filter(
                (status) =>
                    status === "RESOLVED" ||
                    status === "ACCEPTED" ||
                    status === "REJECTED"
            ),
            "status"
        ),

        resolvedById: uuid(
            input.resolvedById,
            "resolvedById"
        ),

        resolution: requiredString(
            input.resolution,
            "resolution"
        ),
    };
}

/* =========================================================
   REVIEW
   ========================================================= */

export function validateCreateBgvReview(
    input: Record<string, unknown>
) {
    return {
        caseId: uuid(input.caseId, "caseId"),

        reviewerId: uuid(
            input.reviewerId,
            "reviewerId"
        ),

        decision: enumValue(
            input.decision,
            BGV_REVIEW_DECISIONS,
            "decision"
        ),

        remarks: requiredString(
            input.remarks,
            "remarks"
        ),
    };
}

/* =========================================================
   FINAL DECISION
   ========================================================= */

export function validateFinalBgvDecision(
    input: Record<string, unknown>
) {
    return {
        caseId: uuid(input.caseId, "caseId"),

        finalResult: enumValue(
            input.finalResult,
            BGV_FINAL_RESULTS,
            "finalResult"
        ),

        finalDecision: enumValue(
            input.finalDecision,
            BGV_FINAL_DECISIONS,
            "finalDecision"
        ),

        reviewedById: uuid(
            input.reviewedById,
            "reviewedById"
        ),

        reviewRemarks: optionalString(
            input.reviewRemarks,
            "reviewRemarks",
            BGV_LIMITS.MAX_REVIEW_REMARKS_LENGTH
        ),
    };
}
