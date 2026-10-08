import {
    Prisma,
    BGVCaseStatus,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";

import {
    validateCreateBgvCase,
    validateUpdateBgvCase,
} from "./bgv.validation";

import type {
    BgvCaseFilters,
    CreateBgvCaseInput,
    UpdateBgvCaseInput,
} from "./bgv.types";

/* =========================================================
   INCLUDE
   ========================================================= */

const BGV_CASE_INCLUDE = {
    candidate: {
        select: {
            id: true,
            candidateCode: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            gender: true,
            fatherName: true,
            motherName: true,
            address: true,
            city: true,
            state: true,
            country: true,
            postalCode: true,

            totalExperienceYears: true,
            highestEducation: true,
            degree: true,
            specialization: true,
            collegeName: true,
            passingYear: true,
            currentCompany: true,
            currentDesignation: true,
            noticePeriodDays: true,
            currentLocation: true,
        },
    },

    employee: {
        select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
        },
    },

    application: {
        select: {
            id: true,
            stage: true,
            approvalStatus: true,

            documents: {
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    },

    package: {
        include: {
            checks: true,
        },
    },

    vendor: true,

    assignedVerifier: {
        select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
        },
    },

    reviewedBy: {
        select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
        },
    },

    verifications: {
        orderBy: {
            createdAt: "asc",
        },
        include: {
            candidateDocument: true,
            fields: {
                orderBy: {
                    createdAt: "asc",
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

    audits: {
        orderBy: {
            createdAt: "desc",
        },
        include: {
            actor: {
                select: {
                    id: true,
                    employeeCode: true,
                    firstName: true,
                    lastName: true,
                },
            },
        },
    },

    reviews: {
        orderBy: {
            createdAt: "desc",
        },
    },

    statusHistory: {
        orderBy: {
            createdAt: "desc",
        },
    },

    assignmentHistory: {
        orderBy: {
            assignedAt: "desc",
        },
    },
} satisfies Prisma.BGVCaseInclude;

/* =========================================================
   HELPERS
   ========================================================= */

function normalizeDate(
    value: string | Date | undefined | null
) {
    if (value === undefined || value === null || value === "") {
        return value === null ? null : undefined;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw AppError.badRequest("Invalid date value");
    }

    return date;
}

async function assertEmployeeExists(
    employeeId: string,
    field = "Employee"
) {
    console.log("========== BGV EMPLOYEE CHECK ==========");
    console.log("employeeId JSON:", JSON.stringify(employeeId));
    console.log("employeeId TYPE:", typeof employeeId);
    console.log("employeeId LENGTH:", employeeId?.length);
    console.log("field:", field);

    const value = employeeId.trim();

    const UUID_RE =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const employee = UUID_RE.test(value)
        ? await prisma.employee.findUnique({
            where: {
                id: value,
            },
            select: {
                id: true,
                status: true,
            },
        })
        : await prisma.employee.findUnique({
            where: {
                employeeCode: value,
            },
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

async function assertCandidateExists(
    candidateId: string
) {
    const candidate =
        await prisma.candidate.findUnique({
            where: {
                id: candidateId,
            },
            select: {
                id: true,
            },
        });

    if (!candidate) {
        throw AppError.notFound(
            "Candidate not found"
        );
    }

    return candidate;
}

async function assertApplicationExists(
    applicationId: string
) {
    const application =
        await prisma.application.findUnique({
            where: {
                id: applicationId,
            },
            select: {
                id: true,
                candidateId: true,
            },
        });

    if (!application) {
        throw AppError.notFound(
            "Application not found"
        );
    }

    return application;
}

async function assertPackageExists(
    packageId: string
) {
    const pkg = await prisma.bGVPackage.findUnique({
        where: {
            id: packageId,
        },
        include: {
            checks: true,
        },
    });

    if (!pkg) {
        throw AppError.notFound(
            "BGV package not found"
        );
    }

    if (!pkg.active) {
        throw AppError.badRequest(
            "BGV package is inactive"
        );
    }

    return pkg;
}

async function assertVendorExists(
    vendorId: string
) {
    const vendor = await prisma.bGVVendor.findUnique({
        where: {
            id: vendorId,
        },
    });

    if (!vendor) {
        throw AppError.notFound(
            "BGV vendor not found"
        );
    }

    if (!vendor.active) {
        throw AppError.badRequest(
            "BGV vendor is inactive"
        );
    }

    return vendor;
}

/* =========================================================
   STATUS TRANSITIONS
   ========================================================= */

const ALLOWED_STATUS_TRANSITIONS: Record<
    string,
    readonly string[]
> = {
    DRAFT: ["INITIATED", "CANCELLED"],

    INITIATED: [
        "CANDIDATE_ACTION_REQUIRED",
        "IN_PROGRESS",
        "ON_HOLD",
        "CANCELLED",
    ],

    CANDIDATE_ACTION_REQUIRED: [
        "IN_PROGRESS",
        "ON_HOLD",
        "CANCELLED",
    ],

    IN_PROGRESS: [
        "CANDIDATE_ACTION_REQUIRED",
        "UNDER_REVIEW",
        "DISCREPANCY",
        "ESCALATED",
        "ON_HOLD",
        "CANCELLED",
    ],

    UNDER_REVIEW: [
        "IN_PROGRESS",
        "DISCREPANCY",
        "ESCALATED",
        "CLEARED",
        "CONCERN",
        "UNABLE_TO_VERIFY",
        "ON_HOLD",
        "CANCELLED",
    ],

    DISCREPANCY: [
        "CANDIDATE_ACTION_REQUIRED",
        "IN_PROGRESS",
        "UNDER_REVIEW",
        "ESCALATED",
        "CLEARED",
        "CONCERN",
        "CANCELLED",
    ],

    ESCALATED: [
        "IN_PROGRESS",
        "UNDER_REVIEW",
        "CLEARED",
        "CONCERN",
        "UNABLE_TO_VERIFY",
        "CANCELLED",
    ],

    CLEARED: ["CLOSED"],

    CONCERN: ["CLOSED"],

    UNABLE_TO_VERIFY: ["CLOSED"],

    ON_HOLD: [
        "IN_PROGRESS",
        "CANCELLED",
    ],

    CANCELLED: [],

    CLOSED: [],
};

function assertStatusTransition(
    currentStatus: string,
    nextStatus: string
) {
    if (currentStatus === nextStatus) {
        return;
    }

    const allowed =
        ALLOWED_STATUS_TRANSITIONS[
        currentStatus
        ] ?? [];

    if (!allowed.includes(nextStatus)) {
        throw AppError.badRequest(
            `Invalid BGV case status transition: ${currentStatus} → ${nextStatus}`
        );
    }
}

/* =========================================================
   FINAL DECISION GUARDS
   ========================================================= */

async function assertCaseReadyForClear(caseId: string) {
    const verifications = await prisma.bGVVerification.findMany({
        where: { caseId },
        select: {
            id: true,
            status: true,
            result: true,
            type: true,
        },
    });

    if (verifications.length === 0) {
        throw AppError.badRequest(
            "BGV case cannot be cleared before verification checks are created"
        );
    }

    const incomplete = verifications.filter(
        (verification) =>
            verification.status !== "COMPLETED" ||
            verification.result !== "CLEAR"
    );

    if (incomplete.length > 0) {
        throw AppError.badRequest(
            "BGV case cannot be cleared until every verification is completed with CLEAR result"
        );
    }

    return verifications;
}

async function assertNoOpenDiscrepancies(caseId: string) {
    const openDiscrepancies = await prisma.bGVDiscrepancy.count({
        where: {
            caseId,
            status: "OPEN",
        },
    });

    if (openDiscrepancies > 0) {
        throw AppError.badRequest(
            "Open discrepancies must be resolved before proceeding"
        );
    }
}

/* =========================================================
   GET CASE
   ========================================================= */

export async function getBgvCase(
    id: string,
    currentEmployeeId?: string,
    currentRole?: string
) {
    const isManager =
        currentRole === "ADMIN" ||
        currentRole === "HR";

    const where: Prisma.BGVCaseWhereInput = {
        id,
    };

    if (!isManager) {
        if (!currentEmployeeId) {
            throw AppError.notFound("BGV case not found");
        }

        where.OR = [
            {
                assignedVerifierId: currentEmployeeId,
            },
            {
                verifications: {
                    some: {
                        assignedToId: currentEmployeeId,
                    },
                },
            },
        ];
    }

    const bgvCase =
        await prisma.bGVCase.findFirst({
            where,
            include: BGV_CASE_INCLUDE,
        });

    if (!bgvCase) {
        throw AppError.notFound(
            "BGV case not found"
        );
    }

    return {
        data: bgvCase,
    };
}

/* =========================================================
   LIST CASES
   ========================================================= */

export async function listBgvCases(
    filters: BgvCaseFilters = {}
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

    const where: Prisma.BGVCaseWhereInput = {};

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.priority) {
        where.priority = filters.priority;
    }

    if (filters.candidateId) {
        where.candidateId =
            filters.candidateId;
    }

    if (filters.employeeId) {
        where.employeeId =
            filters.employeeId;
    }

    if (filters.applicationId) {
        where.applicationId =
            filters.applicationId;
    }

    if (filters.assignedVerifierId) {
        where.assignedVerifierId =
            filters.assignedVerifierId;
    }

    if (filters.vendorId) {
        where.vendorId =
            filters.vendorId;
    }

    if (filters.overdue === true) {
        where.dueAt = {
            lt: new Date(),
        };

        where.status = {
            notIn: [
                "CLEARED",
                "CLOSED",
                "CANCELLED",
            ],
        };
    }

    const isManager =
        filters.currentRole === "ADMIN" ||
        filters.currentRole === "HR";

    if (!isManager) {
        if (!filters.currentEmployeeId) {
            throw AppError.notFound("BGV cases not found");
        }

        where.AND = [
            {
                OR: [
                    {
                        assignedVerifierId:
                            filters.currentEmployeeId,
                    },
                    {
                        verifications: {
                            some: {
                                assignedToId:
                                    filters.currentEmployeeId,
                            },
                        },
                    },
                ],
            },
        ];
    }

    const [rows, total] =
        await Promise.all([
            prisma.bGVCase.findMany({
                where,
                include: BGV_CASE_INCLUDE,
                orderBy: {
                    createdAt: "desc",
                },
                skip,
                take: limit,
            }),

            prisma.bGVCase.count({
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
   CREATE CASE
   ========================================================= */

export async function createBgvCase(
    input: CreateBgvCaseInput
) {
    const validated =
        validateCreateBgvCase(
            input as Record<string, unknown>
        );

    /*
     * At least one business identity should exist.
     */
    if (
        !validated.candidateId &&
        !validated.employeeId &&
        !validated.applicationId
    ) {
        throw AppError.badRequest(
            "Candidate, employee or application is required"
        );
    }

    let resolvedCandidateId = validated.candidateId;

    if (validated.candidateId) {
        await assertCandidateExists(
            validated.candidateId
        );
    }

    if (validated.applicationId) {
        const application =
            await assertApplicationExists(
                validated.applicationId
            );

        /*
         * If both candidateId and applicationId
         * are supplied, make sure they belong together.
         *
         * If candidateId is omitted, derive it from
         * the application so every BGV case has a
         * canonical candidate profile for verification.
         */
        if (
            validated.candidateId &&
            application.candidateId &&
            application.candidateId !==
            validated.candidateId
        ) {
            throw AppError.badRequest(
                "Application does not belong to the selected candidate"
            );
        }

        if (!resolvedCandidateId && application.candidateId) {
            resolvedCandidateId = application.candidateId;
        }
    }

    if (!resolvedCandidateId && !validated.employeeId) {
        throw AppError.badRequest(
            "Candidate identity could not be resolved"
        );
    }

    if (validated.employeeId) {
        await assertEmployeeExists(
            validated.employeeId,
            "Employee"
        );
    }

    if (validated.assignedVerifierId) {
        await assertEmployeeExists(
            validated.assignedVerifierId,
            "Assigned verifier"
        );
    }

    if (validated.packageId) {
        await assertPackageExists(
            validated.packageId
        );
    }

    if (validated.vendorId) {
        await assertVendorExists(
            validated.vendorId
        );
    }

    /*
     * Prevent accidental duplicate active BGV cases
     * for the same application.
     */
    if (validated.applicationId) {
        const existing =
            await prisma.bGVCase.findFirst({
                where: {
                    applicationId:
                        validated.applicationId,

                    status: {
                        notIn: [
                            "CLOSED",
                            "CANCELLED",
                        ],
                    },
                },
                select: {
                    id: true,
                },
            });

        if (existing) {
            throw AppError.conflict(
                "An active BGV case already exists for this application"
            );
        }
    }

    const bgvCase =
        await prisma.bGVCase.create({
            data: {
                candidateId:
                    resolvedCandidateId,

                employeeId:
                    validated.employeeId,

                applicationId:
                    validated.applicationId,

                packageId:
                    validated.packageId,

                assignedVerifierId:
                    validated.assignedVerifierId,

                vendorId:
                    validated.vendorId,

                status:
                    validated.status ?? "DRAFT",

                priority:
                    validated.priority ?? "NORMAL",

                required:
                    validated.required ?? true,

                blocking:
                    validated.blocking ?? false,

                dueAt:
                    normalizeDate(
                        validated.dueAt
                    ),

                startedAt:
                    validated.status ===
                        "INITIATED"
                        ? new Date()
                        : undefined,
            },

            include: BGV_CASE_INCLUDE,
        });

    /*
     * Create initial status history.
     *
     * We intentionally use the BGVStatusHistory model
     * created in the BGV migration.
     */
    await prisma.bGVStatusHistory.create({
        data: {
            caseId: bgvCase.id,

            fromStatus: null,

            toStatus: bgvCase.status,

            changedById: null,
        },
    });

    return {
        data: bgvCase,
    };
}

/* =========================================================
   UPDATE CASE
   ========================================================= */

export async function updateBgvCase(
    id: string,
    input: UpdateBgvCaseInput
) {
    const existing =
        await prisma.bGVCase.findUnique({
            where: {
                id,
            },
        });

    if (!existing) {
        throw AppError.notFound(
            "BGV case not found"
        );
    }

    const validated =
        validateUpdateBgvCase(
            input as Record<string, unknown>
        );

    if (
        validated.assignedVerifierId &&
        validated.assignedVerifierId !==
        existing.assignedVerifierId
    ) {
        await assertEmployeeExists(
            validated.assignedVerifierId,
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
        assertStatusTransition(
            existing.status,
            validated.status
        );
    }

    if (validated.status === "CLEARED") {
        await assertCaseReadyForClear(id);
        await assertNoOpenDiscrepancies(id);
    }

    const updated =
        await prisma.bGVCase.update({
            where: {
                id,
            },

            data: {
                status:
                    validated.status as
                    | Prisma.BGVCaseUpdateInput["status"]
                    | undefined,

                priority:
                    validated.priority as
                    | Prisma.BGVCaseUpdateInput["priority"]
                    | undefined,

                required:
                    validated.required as
                    | boolean
                    | undefined,

                blocking:
                    validated.blocking as
                    | boolean
                    | undefined,

                assignedVerifierId:
                    validated.assignedVerifierId as
                    | string
                    | null
                    | undefined,

                vendorId:
                    validated.vendorId as
                    | string
                    | null
                    | undefined,

                dueAt:
                    validated.dueAt === null
                        ? null
                        : normalizeDate(
                            validated.dueAt as
                            | string
                            | Date
                            | undefined
                        ),

                finalResult:
                    validated.finalResult as
                    | Prisma.BGVCaseUpdateInput["finalResult"]
                    | undefined,

                finalDecision:
                    validated.finalDecision as
                    | Prisma.BGVCaseUpdateInput["finalDecision"]
                    | undefined,

                reviewRemarks:
                    validated.reviewRemarks as
                    | string
                    | null
                    | undefined,

                ...(validated.status ===
                    "INITIATED" &&
                    existing.status === "DRAFT"
                    ? {
                        startedAt:
                            new Date(),
                    }
                    : {}),

                ...(validated.status ===
                    "CLOSED"
                    ? {
                        closedAt:
                            new Date(),
                    }
                    : {}),

                ...(validated.status ===
                    "CLEARED" ||
                    validated.status ===
                    "CONCERN" ||
                    validated.status ===
                    "UNABLE_TO_VERIFY"
                    ? {
                        completedAt:
                            new Date(),
                    }
                    : {}),
            },

            include: BGV_CASE_INCLUDE,
        });

    if (
        validated.status &&
        validated.status !== existing.status
    ) {
        await prisma.bGVStatusHistory.create({
            data: {
                caseId: id,

                fromStatus:
                    existing.status,

                toStatus:
                    validated.status,

                changedById: null,
            },
        });
    }

    return {
        data: updated,
    };
}

/* =========================================================
   INITIATE CASE
   ========================================================= */

export async function initiateBgvCase(
    id: string
) {
    const existing =
        await prisma.bGVCase.findUnique({
            where: {
                id,
            },
            include: {
                package: {
                    include: {
                        checks: true,
                    },
                },
            },
        });

    if (!existing) {
        throw AppError.notFound(
            "BGV case not found"
        );
    }

    assertStatusTransition(
        existing.status,
        "INITIATED"
    );

    if (
        existing.package &&
        existing.package.checks.length === 0
    ) {
        throw AppError.badRequest(
            "BGV package has no verification checks"
        );
    }

    const updated =
        await prisma.$transaction(
            async (tx) => {
                const result =
                    await tx.bGVCase.update({
                        where: {
                            id,
                        },

                        data: {
                            status: "INITIATED",

                            startedAt:
                                new Date(),
                        },

                        include:
                            BGV_CASE_INCLUDE,
                    });

                await tx.bGVStatusHistory.create(
                    {
                        data: {
                            caseId: id,

                            fromStatus:
                                existing.status,

                            toStatus:
                                "INITIATED",

                            changedById: null,
                        },
                    }
                );

                return result;
            }
        );

    return {
        data: updated,
    };
}

/* =========================================================
   ASSIGN VERIFIER
   ========================================================= */

export async function assignBgvVerifier(
    caseId: string,
    assignedToId: string,
    assignedById: string
) {
    const existing =
        await prisma.bGVCase.findUnique({
            where: {
                id: caseId,
            },
        });

    if (!existing) {
        throw AppError.notFound(
            "BGV case not found"
        );
    }

    const assignedVerifier = await assertEmployeeExists(
        assignedToId,
        "Assigned verifier"
    );

    const assigningEmployee = await assertEmployeeExists(
        assignedById,
        "Assigning employee"
    );

    const updated =
        await prisma.$transaction(
            async (tx) => {
                const result =
                    await tx.bGVCase.update({
                        where: {
                            id: caseId,
                        },

                        data: {
                            assignedVerifierId:
                                assignedVerifier.id,

                            status:
                                existing.status ===
                                    "DRAFT"
                                    ? "INITIATED"
                                    : existing.status,

                            startedAt:
                                existing.startedAt ??
                                new Date(),
                        },

                        include:
                            BGV_CASE_INCLUDE,
                    });

                await tx.bGVAssignmentHistory.create({
                    data: {
                        caseId,

                        assignedToId:
                            assignedVerifier.id,

                        assignedById:
                            assigningEmployee.id,

                        vendorId:
                            existing.vendorId,
                    },
                });

                return result;
            }
        );

    return {
        data: updated,
    };
}

/* =========================================================
   UNASSIGN VERIFIER
   ========================================================= */

export async function unassignBgvVerifier(
    caseId: string,
    assignedById: string
) {
    const existing =
        await prisma.bGVCase.findUnique({
            where: {
                id: caseId,
            },
        });

    if (!existing) {
        throw AppError.notFound(
            "BGV case not found"
        );
    }

    if (!existing.assignedVerifierId) {
        throw AppError.badRequest(
            "BGV case is not currently assigned"
        );
    }

    await assertEmployeeExists(
        assignedById,
        "Assigning employee"
    );

    const previousAssignee =
        existing.assignedVerifierId;

    const updated =
        await prisma.$transaction(
            async (tx) => {
                const result =
                    await tx.bGVCase.update({
                        where: {
                            id: caseId,
                        },

                        data: {
                            assignedVerifierId:
                                null,
                        },

                        include:
                            BGV_CASE_INCLUDE,
                    });

                await tx.bGVAssignmentHistory.create(
                    {
                        data: {
                            caseId,

                            assignedToId:
                                null,

                            assignedById,

                            vendorId:
                                existing.vendorId,
                        },
                    }
                );

                return result;
            }
        );

    return {
        data: {
            ...updated,
            previousAssigneeId:
                previousAssignee,
        },
    };
}

/* =========================================================
   CHANGE STATUS
   ========================================================= */

export async function changeBgvCaseStatus(
    id: string,
    status: BGVCaseStatus,
    changedById?: string
) {
    const existing =
        await prisma.bGVCase.findUnique({
            where: {
                id,
            },
        });

    if (!existing) {
        throw AppError.notFound(
            "BGV case not found"
        );
    }

    if (!changedById) {
        throw AppError.badRequest(
            "Employee identity is required to change BGV case status"
        );
    }

    await assertEmployeeExists(
        changedById,
        "Changing employee"
    );

    assertStatusTransition(
        existing.status,
        status
    );

    if (status === "CLEARED") {
        await assertCaseReadyForClear(id);
        await assertNoOpenDiscrepancies(id);
    }

    const updated =
        await prisma.$transaction(
            async (tx) => {
                const result =
                    await tx.bGVCase.update({
                        where: {
                            id,
                        },

                        data: {
                            status,

                            ...(status ===
                                "INITIATED" &&
                                !existing.startedAt
                                ? {
                                    startedAt:
                                        new Date(),
                                }
                                : {}),

                            ...(status ===
                                "CLEARED" ||
                                status ===
                                "CONCERN" ||
                                status ===
                                "UNABLE_TO_VERIFY"
                                ? {
                                    completedAt:
                                        new Date(),
                                }
                                : {}),

                            ...(status ===
                                "CLOSED"
                                ? {
                                    closedAt:
                                        new Date(),
                                }
                                : {}),
                        },

                        include:
                            BGV_CASE_INCLUDE,
                    });

                await tx.bGVStatusHistory.create({
                    data: {
                        caseId: id,

                        fromStatus:
                            existing.status,

                        toStatus: status,

                        changedById:
                            changedById ?? null,
                    },
                });

                await tx.bGVAudit.create({
                    data: {
                        caseId: id,

                        action: "BGV_STATUS_CHANGED",

                        actorId: changedById,

                        oldValue: {
                            status: existing.status,
                        },

                        newValue: {
                            status,
                        },
                    },
                });

                return result;
            }
        );

    return {
        data: updated,
    };
}

/* =========================================================
   FINAL DECISION
   ========================================================= */

export async function setFinalBgvDecision(
    id: string,
    finalResult:
        | "CLEARED"
        | "CLEARED_WITH_DISCREPANCY"
        | "CONCERN"
        | "UNABLE_TO_VERIFY"
        | "EXCEPTION"
        | "REJECTED",

    finalDecision:
        | "PROCEED"
        | "HOLD"
        | "ESCALATE"
        | "CLOSE",

    reviewedById: string,
    reviewRemarks?: string
) {
    const existing =
        await prisma.bGVCase.findUnique({
            where: {
                id,
            },

            include: {
                verifications: true,
                discrepancies: {
                    where: {
                        status: "OPEN",
                    },
                },
            },
        });

    if (!existing) {
        throw AppError.notFound(
            "BGV case not found"
        );
    }

    await assertEmployeeExists(
        reviewedById,
        "Reviewer"
    );

    if (
        ![
            "UNDER_REVIEW",
            "DISCREPANCY",
            "ESCALATED",
        ].includes(existing.status)
    ) {
        throw AppError.badRequest(
            "BGV case is not ready for final decision"
        );
    }

    if (finalDecision === "PROCEED") {
        if (finalResult === "CLEARED") {
            await assertCaseReadyForClear(id);
            await assertNoOpenDiscrepancies(id);
        } else if (finalResult === "CLEARED_WITH_DISCREPANCY") {
            /*
             * Explicit reviewer exception. The open discrepancy is
             * intentionally preserved for auditability.
             */
        } else {
            throw AppError.badRequest(
                "PROCEED requires a CLEARED or CLEARED_WITH_DISCREPANCY final result"
            );
        }
    }

    const updated =
        await prisma.$transaction(
            async (tx) => {
                const result =
                    await tx.bGVCase.update({
                        where: {
                            id,
                        },

                        data: {
                            status:
                                finalDecision ===
                                    "PROCEED"
                                    ? "CLEARED"
                                    : finalDecision ===
                                        "CLOSE"
                                        ? "CLOSED"
                                        : finalDecision ===
                                            "ESCALATE"
                                            ? "ESCALATED"
                                            : "ON_HOLD",

                            finalResult,

                            finalDecision,

                            reviewedById,

                            reviewedAt:
                                new Date(),

                            reviewRemarks:
                                reviewRemarks ??
                                null,

                            ...(finalDecision ===
                                "PROCEED"
                                ? {
                                    completedAt:
                                        new Date(),
                                }
                                : {}),

                            ...(finalDecision ===
                                "CLOSE"
                                ? {
                                    closedAt:
                                        new Date(),
                                }
                                : {}),
                        },

                        include:
                            BGV_CASE_INCLUDE,
                    });

                await tx.bGVStatusHistory.create({
                    data: {
                        caseId: id,

                        fromStatus:
                            existing.status,

                        toStatus:
                            result.status,

                        changedById:
                            reviewedById,
                    },
                });

                await tx.bGVAudit.create({
                    data: {
                        caseId: id,

                        action:
                            "BGV_FINAL_DECISION",

                        actorId:
                            reviewedById,

                        oldValue: {
                            status:
                                existing.status,

                            finalResult:
                                existing.finalResult,

                            finalDecision:
                                existing.finalDecision,
                        },

                        newValue: {
                            status:
                                result.status,

                            finalResult,

                            finalDecision,
                        },
                    },
                });

                /*
                 * =====================================================
                 * RECRUITMENT LIFECYCLE SYNC
                 * =====================================================
                 *
                 * Employee creation becomes available only when
                 * the BGV has genuinely cleared:
                 *
                 *   status       = CLEARED
                 *   finalResult  = CLEARED
                 *   finalDecision = PROCEED
                 *
                 * A discrepancy, concern, hold, escalation, etc.
                 * must never unlock employee creation.
                 */
                if (
                    result.status === "CLEARED" &&
                    result.finalResult === "CLEARED" &&
                    result.finalDecision === "PROCEED" &&
                    result.applicationId
                ) {
                    await tx.application.update({
                        where: {
                            id: result.applicationId,
                        },
                        data: {
                            approvalStatus:
                                "Ready for Employee Creation",
                        },
                    });
                }

                return result;
            }
        );

    return {
        data: updated,
    };
}
