import {
    BGVDiscrepancyLevel,
    BGVVerificationResult,
    BGVVerificationStatus,
    BGVVerificationType,
    Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";

import {
    validateCreateBgvVerification,
    validateUpdateBgvVerification,
} from "./bgv.validation";

/* =========================================================
   TYPES
   ========================================================= */

export interface CreateBgvVerificationInput {
    caseId: string;
    type: BGVVerificationType | string;
    candidateDocumentId?: string | null;
    assignedToId?: string | null;
    vendorId?: string | null;
    source?: string | null;
    dueAt?: string | Date | null;
}

export interface UpdateBgvVerificationInput {
    status?: BGVVerificationStatus | string;
    assignedToId?: string | null;
    vendorId?: string | null;
    source?: string | null;
    startedAt?: string | Date | null;
    dueAt?: string | Date | null;
    completedAt?: string | Date | null;
    result?: BGVVerificationResult | string | null;
    discrepancyLevel?: BGVDiscrepancyLevel | string | null;
    remarks?: string | null;
}

export interface BgvVerificationFilters {
    caseId?: string;
    status?: BGVVerificationStatus;
    type?: BGVVerificationType;
    assignedToId?: string;
    vendorId?: string;
    result?: BGVVerificationResult;
    overdue?: boolean;
    page?: number;
    limit?: number;

    currentEmployeeId?: string;
    currentRole?: string;
}

/* =========================================================
   INCLUDE
   ========================================================= */

const BGV_VERIFICATION_INCLUDE = {
    case: {
        select: {
            id: true,
            status: true,
            priority: true,
            candidateId: true,
            employeeId: true,
            applicationId: true,
            assignedVerifierId: true,
        },
    },
    assignedTo: {
        select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
        },
    },
    vendor: true,

    candidateDocument: {
        select: {
            id: true,
            documentType: true,
            fileName: true,
            fileUrl: true,
            status: true,
            verifiedAt: true,
            createdAt: true,
        },
    },

    documents: {
        orderBy: {
            createdAt: "desc",
        },
    },
    discrepancies: {
        orderBy: {
            createdAt: "desc",
        },
    },
} satisfies Prisma.BGVVerificationInclude;

/* =========================================================
   STATUS TRANSITIONS
   ========================================================= */

const ALLOWED_VERIFICATION_TRANSITIONS: Record<
    BGVVerificationStatus,
    readonly BGVVerificationStatus[]
> = {
    PENDING: ["ASSIGNED", "CANCELLED", "ON_HOLD"],
    ASSIGNED: ["IN_PROGRESS", "CANDIDATE_ACTION_REQUIRED", "ON_HOLD", "CANCELLED"],
    IN_PROGRESS: [
        "CANDIDATE_ACTION_REQUIRED",
        "SUBMITTED",
        "UNDER_REVIEW",
        "DISCREPANCY",
        "FAILED",
        "UNABLE_TO_VERIFY",
        "ON_HOLD",
        "CANCELLED",
    ],
    CANDIDATE_ACTION_REQUIRED: [
        "IN_PROGRESS",
        "SUBMITTED",
        "ON_HOLD",
        "CANCELLED",
    ],
    SUBMITTED: [
        "UNDER_REVIEW",
        "COMPLETED",
        "DISCREPANCY",
        "FAILED",
        "UNABLE_TO_VERIFY",
        "ON_HOLD",
    ],
    UNDER_REVIEW: [
        "IN_PROGRESS",
        "COMPLETED",
        "DISCREPANCY",
        "FAILED",
        "UNABLE_TO_VERIFY",
        "ON_HOLD",
    ],
    COMPLETED: [],
    DISCREPANCY: [
        "CANDIDATE_ACTION_REQUIRED",
        "IN_PROGRESS",
        "UNDER_REVIEW",
        "COMPLETED",
        "FAILED",
        "UNABLE_TO_VERIFY",
    ],
    FAILED: [],
    UNABLE_TO_VERIFY: [],
    ON_HOLD: ["IN_PROGRESS", "CANCELLED"],
    CANCELLED: [],
};

function assertVerificationTransition(
    currentStatus: BGVVerificationStatus,
    nextStatus: BGVVerificationStatus
) {
    if (currentStatus === nextStatus) {
        return;
    }

    const allowed =
        ALLOWED_VERIFICATION_TRANSITIONS[currentStatus] ?? [];

    if (!allowed.includes(nextStatus)) {
        throw AppError.badRequest(
            `Invalid BGV verification status transition: ${currentStatus} → ${nextStatus}`
        );
    }
}

/* =========================================================
   HELPERS
   ========================================================= */

function normalizeDate(
    value: string | Date | null | undefined
) {
    if (value === null || value === undefined) {
        return null;
    }

    const date =
        value instanceof Date
            ? value
            : new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw AppError.badRequest("Invalid date value");
    }

    return date;
}

async function assertEmployeeExists(
    employeeId: string,
    field = "Employee"
) {
    const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
            id: true,
            status: true,
        },
    });

    if (!employee) {
        throw AppError.notFound(`${field} not found`);
    }

    if (employee.status !== "Active") {
        throw AppError.badRequest(
            `${field} is not active`
        );
    }

    return employee;
}

async function assertVendorExists(vendorId: string) {
    const vendor = await prisma.bGVVendor.findUnique({
        where: { id: vendorId },
    });

    if (!vendor) {
        throw AppError.notFound("BGV vendor not found");
    }

    if (!vendor.active) {
        throw AppError.badRequest(
            "BGV vendor is inactive"
        );
    }

    return vendor;
}

async function assertCaseExists(caseId: string) {
    const bgvCase = await prisma.bGVCase.findUnique({
        where: { id: caseId },
        select: {
            id: true,
            status: true,
        },
    });

    if (!bgvCase) {
        throw AppError.notFound("BGV case not found");
    }

    return bgvCase;
}

async function assertVerificationExists(id: string) {
    const verification =
        await prisma.bGVVerification.findUnique({
            where: { id },
        });

    if (!verification) {
        throw AppError.notFound(
            "BGV verification not found"
        );
    }

    return verification;
}

function isBgvManagerRole(role?: string) {
    return role === "ADMIN" || role === "HR";
}

async function assertVerificationAccess(
    id: string,
    currentEmployeeId?: string,
    currentRole?: string
) {
    const verification = await assertVerificationExists(id);

    if (isBgvManagerRole(currentRole)) {
        return verification;
    }

    if (!currentEmployeeId) {
        throw AppError.notFound("BGV verification not found");
    }

    // An individually assigned verifier can operate only that
    // particular verification.
    if (verification.assignedToId === currentEmployeeId) {
        return verification;
    }

    // The case-level verifier can operate all verifications
    // belonging to that BGV case, including checks individually
    // assigned to another verifier.
    const bgvCase = await prisma.bGVCase.findUnique({
        where: { id: verification.caseId },
        select: {
            assignedVerifierId: true,
        },
    });

    if (bgvCase?.assignedVerifierId === currentEmployeeId) {
        return verification;
    }

    throw AppError.notFound("BGV verification not found");
}

/* =========================================================
   GET VERIFICATION
   ========================================================= */

export async function getBgvVerification(
    id: string,
    currentEmployeeId?: string,
    currentRole?: string
) {
    const isManager =
        currentRole === "ADMIN" ||
        currentRole === "HR";

    const where: Prisma.BGVVerificationWhereInput = {
        id,
    };

    if (!isManager) {
        if (!currentEmployeeId) {
            throw AppError.notFound(
                "BGV verification not found"
            );
        }

        where.OR = [
            { assignedToId: currentEmployeeId },
            {
                case: {
                    assignedVerifierId: currentEmployeeId,
                },
            },
        ];
    }

    const verification =
        await prisma.bGVVerification.findFirst({
            where,
            include: BGV_VERIFICATION_INCLUDE,
        });

    if (!verification) {
        throw AppError.notFound(
            "BGV verification not found"
        );
    }

    return {
        data: verification,
    };
}

/* =========================================================
   LIST VERIFICATIONS
   ========================================================= */

export async function listBgvVerifications(
    filters: BgvVerificationFilters = {}
) {
    const page = Math.max(
        Number(filters.page) || 1,
        1
    );

    const limit = Math.min(
        Math.max(
            Number(filters.limit) || 20,
            1
        ),
        100
    );

    const skip = (page - 1) * limit;

    const where: Prisma.BGVVerificationWhereInput = {};

    if (filters.caseId) {
        where.caseId = filters.caseId;
    }

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.type) {
        where.type = filters.type;
    }

    if (filters.assignedToId) {
        where.assignedToId = filters.assignedToId;
    }

    if (filters.vendorId) {
        where.vendorId = filters.vendorId;
    }

    if (filters.result) {
        where.result = filters.result;
    }

    if (filters.overdue === true) {
        where.dueAt = {
            lt: new Date(),
        };

        where.status = {
            notIn: [
                "COMPLETED",
                "FAILED",
                "UNABLE_TO_VERIFY",
                "CANCELLED",
            ],
        };
    }

    const isManager =
        filters.currentRole === "ADMIN" ||
        filters.currentRole === "HR";

    if (!isManager) {
        if (!filters.currentEmployeeId) {
            throw AppError.notFound(
                "BGV verifications not found"
            );
        }

        where.OR = [
            {
                assignedToId:
                    filters.currentEmployeeId,
            },
            {
                case: {
                    assignedVerifierId:
                        filters.currentEmployeeId,
                },
            },
        ];
    }

    const [rows, total] =
        await Promise.all([
            prisma.bGVVerification.findMany({
                where,
                include: BGV_VERIFICATION_INCLUDE,
                orderBy: {
                    createdAt: "desc",
                },
                skip,
                take: limit,
            }),
            prisma.bGVVerification.count({
                where,
            }),
        ]);

    return {
        data: rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(
            total / limit
        ),
    };
}

/* =========================================================
   CREATE VERIFICATION
   ========================================================= */

export async function createBgvVerification(
    input: CreateBgvVerificationInput
) {
    const validated =
        validateCreateBgvVerification(
            input as unknown as Record<string, unknown>
        );

    await assertCaseExists(validated.caseId);

    if (validated.candidateDocumentId) {
        const candidateDocument =
            await prisma.candidateDocument.findUnique({
                where: {
                    id: validated.candidateDocumentId,
                },
                select: {
                    id: true,
                    applicationId: true,
                    fileName: true,
                    status: true,
                },
            });

        if (!candidateDocument) {
            throw AppError.notFound(
                "Candidate document not found"
            );
        }

        const bgvCase =
            await prisma.bGVCase.findUnique({
                where: {
                    id: validated.caseId,
                },
                select: {
                    applicationId: true,
                },
            });

        if (
            !bgvCase ||
            bgvCase.applicationId !==
            candidateDocument.applicationId
        ) {
            throw AppError.badRequest(
                "Candidate document does not belong to this BGV case"
            );
        }
    }

    if (validated.assignedToId) {
        await assertEmployeeExists(
            validated.assignedToId,
            "Assigned verifier"
        );
    }

    if (validated.vendorId) {
        await assertVendorExists(
            validated.vendorId
        );
    }

    if (validated.dueAt) {
        const dueAt = normalizeDate(
            validated.dueAt
        );

        if (dueAt && dueAt < new Date()) {
            throw AppError.badRequest(
                "Verification due date cannot be in the past"
            );
        }
    }

    const duplicate =
        await prisma.bGVVerification.findFirst({
            where: {
                caseId: validated.caseId,
                type: validated.type,
                status: {
                    notIn: [
                        "COMPLETED",
                        "FAILED",
                        "UNABLE_TO_VERIFY",
                        "CANCELLED",
                    ],
                },
            },
            select: {
                id: true,
            },
        });

    if (duplicate) {
        throw AppError.conflict(
            "An active verification of this type already exists for this BGV case"
        );
    }

    const verification =
        await prisma.bGVVerification.create({
            data: {
                caseId: validated.caseId,
                type: validated.type,
                candidateDocumentId:
                    validated.candidateDocumentId,
                assignedToId:
                    validated.assignedToId,
                vendorId: validated.vendorId,
                source: validated.source,
                dueAt: normalizeDate(
                    validated.dueAt
                ),
                status:
                    validated.assignedToId
                        ? "ASSIGNED"
                        : "PENDING",
            },
            include: BGV_VERIFICATION_INCLUDE,
        });

    return {
        data: verification,
    };
}

/* =========================================================
   UPDATE VERIFICATION
   ========================================================= */

export async function updateBgvVerification(
    id: string,
    input: UpdateBgvVerificationInput
) {
    const existing =
        await assertVerificationExists(id);

    const validated =
        validateUpdateBgvVerification(
            input as unknown as Record<string, unknown>
        );

    if (
        validated.assignedToId &&
        validated.assignedToId !==
        existing.assignedToId
    ) {
        await assertEmployeeExists(
            validated.assignedToId,
            "Assigned verifier"
        );
    }

    if (
        validated.vendorId &&
        validated.vendorId !== existing.vendorId
    ) {
        await assertVendorExists(
            validated.vendorId
        );
    }

    if (
        validated.status &&
        validated.status !== existing.status
    ) {
        assertVerificationTransition(
            existing.status,
            validated.status
        );
    }

    if (validated.status === "COMPLETED" || validated.result === "CLEAR") {
        if (validated.result !== "CLEAR") {
            throw AppError.badRequest(
                "A completed BGV verification must have a CLEAR result"
            );
        }

        const fields = await prisma.bGVVerificationField.findMany({
            where: { verificationId: id },
            select: {
                matchStatus: true,
            },
        });

        if (!fields.length) {
            throw AppError.badRequest(
                "BGV verification cannot be cleared before document fields are verified"
            );
        }

        const invalidFields = fields.filter(
            (field) =>
                field.matchStatus === "MISMATCH" ||
                field.matchStatus === "MISSING" ||
                field.matchStatus === "NOT_CHECKED"
        );

        if (invalidFields.length > 0) {
            throw AppError.badRequest(
                "BGV verification cannot be cleared because one or more document fields are not matched"
            );
        }
    }

    if (
        validated.status === "DISCREPANCY" &&
        !validated.discrepancyLevel &&
        !existing.discrepancyLevel
    ) {
        throw AppError.badRequest(
            "Discrepancy level is required for a discrepancy verification"
        );
    }

    const startedAt =
        validated.startedAt !== undefined
            ? normalizeDate(validated.startedAt)
            : undefined;

    const dueAt =
        validated.dueAt !== undefined
            ? normalizeDate(validated.dueAt)
            : undefined;

    const completedAt =
        validated.completedAt !== undefined
            ? normalizeDate(validated.completedAt)
            : undefined;

    if (
        dueAt &&
        dueAt < existing.createdAt
    ) {
        throw AppError.badRequest(
            "Verification due date cannot be before verification creation"
        );
    }

    if (
        dueAt &&
        dueAt < new Date() &&
        existing.dueAt?.getTime() !== dueAt.getTime()
    ) {
        throw AppError.badRequest(
            "Verification due date cannot be in the past"
        );
    }

    if (
        completedAt &&
        startedAt &&
        completedAt < startedAt
    ) {
        throw AppError.badRequest(
            "Verification completion date cannot be before start date"
        );
    }

    const updated =
        await prisma.bGVVerification.update({
            where: { id },
            data: {
                status: validated.status,
                assignedToId:
                    validated.assignedToId,
                vendorId:
                    validated.vendorId,
                source: validated.source,
                startedAt,
                dueAt,
                completedAt,
                result: validated.result,
                discrepancyLevel:
                    validated.discrepancyLevel,
                remarks: validated.remarks,
            },
            include: BGV_VERIFICATION_INCLUDE,
        });

    return {
        data: updated,
    };
}

/* =========================================================
   ASSIGN VERIFIER
   ========================================================= */

export async function assignBgvVerification(
    id: string,
    assignedToId: string,
    actorId?: string
) {
    const existing =
        await assertVerificationExists(id);

    await assertEmployeeExists(
        assignedToId,
        "Assigned verifier"
    );

    if (
        existing.status === "COMPLETED" ||
        existing.status === "FAILED" ||
        existing.status === "UNABLE_TO_VERIFY" ||
        existing.status === "CANCELLED"
    ) {
        throw AppError.badRequest(
            "A terminal verification cannot be assigned"
        );
    }

    if (actorId) {
        await assertEmployeeExists(actorId, "Assigning employee");
    }

    const updated = await prisma.$transaction(async (tx) => {
        const result =
            await tx.bGVVerification.update({
                where: { id },
                data: {
                    assignedToId,
                    status:
                        existing.status === "PENDING"
                            ? "ASSIGNED"
                            : existing.status,
                },
                include: BGV_VERIFICATION_INCLUDE,
            });

        if (actorId) {
            await tx.bGVAudit.create({
                data: {
                    caseId: existing.caseId,
                    action: "VERIFICATION_ASSIGNED",
                    actorId,
                    oldValue: {
                        verificationId: id,
                        assignedToId: existing.assignedToId,
                    },
                    newValue: {
                        verificationId: id,
                        assignedToId,
                    },
                },
            });
        }

        return result;
    });

    return {
        data: updated,
    };
}

/* =========================================================
   UNASSIGN VERIFIER
   ========================================================= */

export async function unassignBgvVerification(
    id: string,
    actorId?: string
) {
    const existing =
        await assertVerificationExists(id);

    if (!existing.assignedToId) {
        throw AppError.badRequest(
            "BGV verification is not currently assigned"
        );
    }

    if (
        existing.status === "COMPLETED" ||
        existing.status === "FAILED" ||
        existing.status === "UNABLE_TO_VERIFY" ||
        existing.status === "CANCELLED"
    ) {
        throw AppError.badRequest(
            "A terminal verification cannot be unassigned"
        );
    }

    if (actorId) {
        await assertEmployeeExists(actorId, "Unassigning employee");
    }

    const updated = await prisma.$transaction(async (tx) => {
        const result =
            await tx.bGVVerification.update({
                where: { id },
                data: {
                    assignedToId: null,
                    status: "PENDING",
                },
                include: BGV_VERIFICATION_INCLUDE,
            });

        if (actorId) {
            await tx.bGVAudit.create({
                data: {
                    caseId: existing.caseId,
                    action: "VERIFICATION_UNASSIGNED",
                    actorId,
                    oldValue: {
                        verificationId: id,
                        assignedToId: existing.assignedToId,
                    },
                    newValue: {
                        verificationId: id,
                        assignedToId: null,
                    },
                },
            });
        }

        return result;
    });

    return {
        data: updated,
    };
}

/* =========================================================
   CHANGE STATUS
   ========================================================= */

export async function changeBgvVerificationStatus(
    id: string,
    status: BGVVerificationStatus,
    currentEmployeeId?: string,
    currentRole?: string
) {
    const existing =
        await assertVerificationAccess(
            id,
            currentEmployeeId,
            currentRole
        );

    assertVerificationTransition(
        existing.status,
        status
    );

    if (status === "COMPLETED") {
        if (existing.result !== "CLEAR") {
            throw AppError.badRequest(
                "Verification cannot be completed unless the result is CLEAR"
            );
        }

        const fields = await prisma.bGVVerificationField.findMany({
            where: { verificationId: id },
            select: {
                matchStatus: true,
            },
        });

        if (!fields.length) {
            throw AppError.badRequest(
                "BGV verification cannot be completed before document fields are verified"
            );
        }

        const invalidFields = fields.filter(
            (field) =>
                field.matchStatus === "MISMATCH" ||
                field.matchStatus === "MISSING" ||
                field.matchStatus === "NOT_CHECKED"
        );

        if (invalidFields.length > 0) {
            throw AppError.badRequest(
                "BGV verification cannot be completed because one or more document fields are not matched"
            );
        }
    }

    const now = new Date();

    const data: Prisma.BGVVerificationUpdateInput = {
        status,
    };

    if (
        status === "IN_PROGRESS" &&
        !existing.startedAt
    ) {
        data.startedAt = now;
    }

    if (
        status === "COMPLETED" ||
        status === "FAILED" ||
        status === "UNABLE_TO_VERIFY"
    ) {
        data.completedAt = now;
    }

    const updated = await prisma.$transaction(async (tx) => {
        const result =
            await tx.bGVVerification.update({
                where: { id },
                data,
                include: BGV_VERIFICATION_INCLUDE,
            });

        if (currentEmployeeId) {
            await tx.bGVAudit.create({
                data: {
                    caseId: existing.caseId,
                    action: "VERIFICATION_STATUS_CHANGED",
                    actorId: currentEmployeeId,
                    oldValue: {
                        verificationId: id,
                        status: existing.status,
                        result: existing.result,
                    },
                    newValue: {
                        verificationId: id,
                        status: result.status,
                        result: result.result,
                    },
                },
            });
        }

        return result;
    });

    return {
        data: updated,
    };
}

/* =========================================================
   START VERIFICATION
   ========================================================= */

export async function startBgvVerification(
    id: string,
    currentEmployeeId?: string,
    currentRole?: string
) {
    return changeBgvVerificationStatus(
        id,
        "IN_PROGRESS",
        currentEmployeeId,
        currentRole
    );
}

/* =========================================================
   SUBMIT VERIFICATION
   ========================================================= */

export async function submitBgvVerification(
    id: string,
    result: BGVVerificationResult,
    remarks?: string,
    currentEmployeeId?: string,
    currentRole?: string
) {
    const existing =
        await assertVerificationAccess(
            id,
            currentEmployeeId,
            currentRole
        );

    assertVerificationTransition(
        existing.status,
        "SUBMITTED"
    );

    if (result === "CLEAR") {
        const fields = await prisma.bGVVerificationField.findMany({
            where: { verificationId: id },
            select: {
                matchStatus: true,
            },
        });

        if (
            !fields.length ||
            fields.some(
                (field) =>
                    field.matchStatus === "MISMATCH" ||
                    field.matchStatus === "MISSING" ||
                    field.matchStatus === "NOT_CHECKED"
            )
        ) {
            throw AppError.badRequest(
                "Verification cannot be submitted as CLEAR until all document fields match"
            );
        }
    }

    const updated =
        await prisma.bGVVerification.update({
            where: { id },
            data: {
                status: "SUBMITTED",
                result,
                remarks:
                    remarks !== undefined
                        ? remarks
                        : existing.remarks,
            },
            include: BGV_VERIFICATION_INCLUDE,
        });

    return {
        data: updated,
    };
}

/* =========================================================
   COMPLETE VERIFICATION
   ========================================================= */

export async function completeBgvVerification(
    id: string,
    result: BGVVerificationResult,
    remarks?: string,
    currentEmployeeId?: string,
    currentRole?: string
) {
    const existing =
        await assertVerificationAccess(
            id,
            currentEmployeeId,
            currentRole
        );

    if (
        result === "DISCREPANCY" &&
        !existing.discrepancyLevel
    ) {
        throw AppError.badRequest(
            "Discrepancy level is required before completing a verification with a discrepancy"
        );
    }

    if (result === "CLEAR") {
        const fields = await prisma.bGVVerificationField.findMany({
            where: {
                verificationId: id,
            },
        });

        if (!fields.length) {
            throw AppError.badRequest(
                "BGV verification cannot be cleared before document fields are verified"
            );
        }

        const invalidFields = fields.filter(
            (field) =>
                field.matchStatus === "MISMATCH" ||
                field.matchStatus === "MISSING" ||
                field.matchStatus === "NOT_CHECKED"
        );

        if (invalidFields.length > 0) {
            throw AppError.badRequest(
                "BGV verification cannot be cleared because one or more document fields are not matched"
            );
        }
    }

    assertVerificationTransition(
        existing.status,
        "COMPLETED"
    );

    const updated = await prisma.$transaction(async (tx) => {
        const resultRecord =
            await tx.bGVVerification.update({
                where: { id },
                data: {
                    status: "COMPLETED",
                    result,
                    remarks:
                        remarks !== undefined
                            ? remarks
                            : existing.remarks,
                    completedAt: new Date(),
                },
                include: BGV_VERIFICATION_INCLUDE,
            });

        if (currentEmployeeId) {
            await tx.bGVAudit.create({
                data: {
                    caseId: existing.caseId,
                    action: "VERIFICATION_COMPLETED",
                    actorId: currentEmployeeId,
                    oldValue: {
                        verificationId: id,
                        status: existing.status,
                        result: existing.result,
                    },
                    newValue: {
                        verificationId: id,
                        status: "COMPLETED",
                        result,
                    },
                },
            });
        }

        return resultRecord;
    });

    return {
        data: updated,
    };
}

/* =========================================================
   MARK DISCREPANCY
   ========================================================= */

export async function markBgvVerificationDiscrepancy(
    id: string,
    discrepancyLevel: BGVDiscrepancyLevel,
    remarks?: string,
    actorId?: string,
    currentEmployeeId?: string,
    currentRole?: string
) {
    const existing =
        await assertVerificationAccess(
            id,
            currentEmployeeId,
            currentRole
        );

    assertVerificationTransition(
        existing.status,
        "DISCREPANCY"
    );

    if (!actorId) {
        throw AppError.badRequest(
            "Actor employee is required to mark a verification discrepancy"
        );
    }

    /*
     * BGVVerification -> BGVDiscrepancy -> BGVAudit
     * All three operations must succeed together.
     */
    const result = await prisma.$transaction(async (tx) => {

        // 1. Update verification
        const updated =
            await tx.bGVVerification.update({
                where: { id },
                data: {
                    status: "DISCREPANCY",
                    result: "DISCREPANCY",
                    discrepancyLevel,
                    remarks:
                        remarks !== undefined
                            ? remarks
                            : existing.remarks,
                },
                include: BGV_VERIFICATION_INCLUDE,
            });

        // 2. Create actual discrepancy record
        const discrepancy =
            await tx.bGVDiscrepancy.create({
                data: {
                    caseId: existing.caseId,
                    verificationId: existing.id,
                    level: discrepancyLevel,
                    description:
                        remarks?.trim() ||
                        "BGV verification discrepancy identified.",
                    raisedById: actorId,
                },
            });

        // 3. Create audit trail
        const audit =
            await tx.bGVAudit.create({
                data: {
                    caseId: existing.caseId,
                    action: "VERIFICATION_DISCREPANCY",
                    actorId,
                    oldValue: {
                        verificationId: existing.id,
                        status: existing.status,
                        result: existing.result,
                        discrepancyLevel:
                            existing.discrepancyLevel,
                        remarks: existing.remarks,
                    },
                    newValue: {
                        verificationId: updated.id,
                        status: updated.status,
                        result: updated.result,
                        discrepancyLevel:
                            updated.discrepancyLevel,
                        remarks: updated.remarks,
                        discrepancyId:
                            discrepancy.id,
                    },
                },
            });

        return {
            updated,
            discrepancy,
            audit,
        };
    });

    return {
        data: result.updated,
    };
}

/* =========================================================
   CANDIDATE ACTION REQUIRED
   ========================================================= */

export async function requestBgvVerificationCandidateAction(
    id: string,
    remarks?: string,
    currentEmployeeId?: string,
    currentRole?: string
) {
    const existing =
        await assertVerificationAccess(
            id,
            currentEmployeeId,
            currentRole
        );

    assertVerificationTransition(
        existing.status,
        "CANDIDATE_ACTION_REQUIRED"
    );

    if (
        existing.result !== "DISCREPANCY" &&
        existing.status !== "DISCREPANCY"
    ) {
        throw AppError.badRequest(
            "Candidate action can be requested only for a verification with a discrepancy"
        );
    }

    const updated =
        await prisma.bGVVerification.update({
            where: { id },
            data: {
                status:
                    "CANDIDATE_ACTION_REQUIRED",
                remarks:
                    remarks !== undefined
                        ? remarks
                        : existing.remarks,
            },
            include: BGV_VERIFICATION_INCLUDE,
        });

    return {
        data: updated,
    };
}

export const requestBgvCandidateAction = requestBgvVerificationCandidateAction;

/* =========================================================
   HOLD / CANCEL
   ========================================================= */

export async function holdBgvVerification(
    id: string,
    remarks?: string,
    currentEmployeeId?: string,
    currentRole?: string
) {
    const existing =
        await assertVerificationAccess(
            id,
            currentEmployeeId,
            currentRole
        );

    assertVerificationTransition(
        existing.status,
        "ON_HOLD"
    );

    const updated =
        await prisma.bGVVerification.update({
            where: { id },
            data: {
                status: "ON_HOLD",
                remarks:
                    remarks !== undefined
                        ? remarks
                        : existing.remarks,
            },
            include: BGV_VERIFICATION_INCLUDE,
        });

    return {
        data: updated,
    };
}

export async function cancelBgvVerification(
    id: string,
    remarks?: string,
    currentEmployeeId?: string,
    currentRole?: string
) {
    const existing =
        await assertVerificationAccess(
            id,
            currentEmployeeId,
            currentRole
        );

    assertVerificationTransition(
        existing.status,
        "CANCELLED"
    );

    const updated =
        await prisma.bGVVerification.update({
            where: { id },
            data: {
                status: "CANCELLED",
                remarks:
                    remarks !== undefined
                        ? remarks
                        : existing.remarks,
            },
            include: BGV_VERIFICATION_INCLUDE,
        });

    return {
        data: updated,
    };
}
