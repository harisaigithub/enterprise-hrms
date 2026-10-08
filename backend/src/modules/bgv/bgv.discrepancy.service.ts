import {
    BGVDiscrepancyLevel,
    BGVDiscrepancyStatus,
    BGVVerificationStatus,
    Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";

import {
    validateCreateBgvDiscrepancy,
    validateResolveBgvDiscrepancy,
} from "./bgv.validation";

/* =========================================================
   TYPES
   ========================================================= */

export interface CreateBgvDiscrepancyInput {
    caseId: string;
    verificationId?: string | null;
    level: BGVDiscrepancyLevel | string;
    fieldName?: string | null;
    expectedValue?: string | null;
    actualValue?: string | null;
    description: string;
    raisedById: string;
}

export interface ResolveBgvDiscrepancyInput {
    status:
        | BGVDiscrepancyStatus
        | string;
    resolvedById: string;
    resolution: string;
}

export interface BgvDiscrepancyFilters {
    caseId?: string;
    verificationId?: string;
    level?: BGVDiscrepancyLevel;
    status?: BGVDiscrepancyStatus;
    raisedById?: string;
    resolvedById?: string;
    page?: number | string;
    limit?: number | string;
}

/* =========================================================
   INCLUDE
   ========================================================= */

const BGV_DISCREPANCY_INCLUDE = {
    case: {
        select: {
            id: true,
            status: true,
            priority: true,
            candidateId: true,
            employeeId: true,
            applicationId: true,
        },
    },
    verification: {
        select: {
            id: true,
            type: true,
            status: true,
            result: true,
            discrepancyLevel: true,
        },
    },
    raisedBy: {
        select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
        },
    },
    resolvedBy: {
        select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
        },
    },
} satisfies Prisma.BGVDiscrepancyInclude;

/* =========================================================
   HELPERS
   ========================================================= */

async function assertEmployeeExists(
    employeeId: string,
    field = "Employee"
) {
    const employee = await prisma.employee.findUnique({
        where: {
            id: employeeId,
        },
        select: {
            id: true,
            status: true,
        },
    });

    if (!employee) {
        throw AppError.notFound(
            `${field} not found`
        );
    }

    if (employee.status !== "Active") {
        throw AppError.badRequest(
            `${field} is not active`
        );
    }

    return employee;
}

async function assertCaseExists(caseId: string) {
    const bgvCase = await prisma.bGVCase.findUnique({
        where: {
            id: caseId,
        },
        select: {
            id: true,
            status: true,
        },
    });

    if (!bgvCase) {
        throw AppError.notFound(
            "BGV case not found"
        );
    }

    return bgvCase;
}

async function assertVerificationExists(
    verificationId: string
) {
    const verification =
        await prisma.bGVVerification.findUnique({
            where: {
                id: verificationId,
            },
            select: {
                id: true,
                caseId: true,
                status: true,
                discrepancyLevel: true,
            },
        });

    if (!verification) {
        throw AppError.notFound(
            "BGV verification not found"
        );
    }

    return verification;
}

async function assertDiscrepancyExists(id: string) {
    const discrepancy =
        await prisma.bGVDiscrepancy.findUnique({
            where: {
                id,
            },
        });

    if (!discrepancy) {
        throw AppError.notFound(
            "BGV discrepancy not found"
        );
    }

    return discrepancy;
}

function assertDiscrepancyCanBeResolved(
    status: BGVDiscrepancyStatus
) {
    if (
        status === "RESOLVED" ||
        status === "ACCEPTED" ||
        status === "REJECTED"
    ) {
        throw AppError.badRequest(
            "BGV discrepancy has already reached a final resolution"
        );
    }
}

/* =========================================================
   GET
   ========================================================= */

export async function getBgvDiscrepancy(
    id: string
) {
    const discrepancy =
        await prisma.bGVDiscrepancy.findUnique({
            where: {
                id,
            },
            include: BGV_DISCREPANCY_INCLUDE,
        });

    if (!discrepancy) {
        throw AppError.notFound(
            "BGV discrepancy not found"
        );
    }

    return {
        data: discrepancy,
    };
}

/* =========================================================
   LIST
   ========================================================= */

export async function listBgvDiscrepancies(
    filters: BgvDiscrepancyFilters = {}
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

    const where: Prisma.BGVDiscrepancyWhereInput = {};

    if (filters.caseId) {
        where.caseId = filters.caseId;
    }

    if (filters.verificationId) {
        where.verificationId =
            filters.verificationId;
    }

    if (filters.level) {
        where.level = filters.level;
    }

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.raisedById) {
        where.raisedById = filters.raisedById;
    }

    if (filters.resolvedById) {
        where.resolvedById =
            filters.resolvedById;
    }

    const [rows, total] =
        await Promise.all([
            prisma.bGVDiscrepancy.findMany({
                where,
                include: BGV_DISCREPANCY_INCLUDE,
                orderBy: {
                    createdAt: "desc",
                },
                skip,
                take: limit,
            }),

            prisma.bGVDiscrepancy.count({
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
   CREATE
   ========================================================= */

export async function createBgvDiscrepancy(
    input: CreateBgvDiscrepancyInput
) {
    const raw =
        validateCreateBgvDiscrepancy(
            input as unknown as Record<string, unknown>
        );

    const validated = raw as {
        caseId: string;
        verificationId?: string;
        level: BGVDiscrepancyLevel;
        fieldName?: string;
        expectedValue?: string;
        actualValue?: string;
        description: string;
        raisedById: string;
    };

    await assertCaseExists(
        validated.caseId
    );

    await assertEmployeeExists(
        validated.raisedById,
        "Discrepancy raiser"
    );

    if (validated.verificationId) {
        const verification =
            await assertVerificationExists(
                validated.verificationId
            );

        if (
            verification.caseId !==
            validated.caseId
        ) {
            throw AppError.badRequest(
                "Verification does not belong to the selected BGV case"
            );
        }
    }

    const existing =
        await prisma.bGVDiscrepancy.findFirst({
            where: {
                caseId: validated.caseId,
                verificationId:
                    validated.verificationId ??
                    null,
                status: {
                    in: [
                        "OPEN",
                        "UNDER_REVIEW",
                    ],
                },
                level: validated.level,
                description:
                    validated.description,
            },
            select: {
                id: true,
            },
        });

    if (existing) {
        throw AppError.conflict(
            "An equivalent open BGV discrepancy already exists"
        );
    }

    const discrepancy =
        await prisma.$transaction(
            async (tx) => {
                const created =
                    await tx.bGVDiscrepancy.create({
                        data: {
                            caseId:
                                validated.caseId,
                            verificationId:
                                validated.verificationId,
                            level:
                                validated.level,
                            fieldName:
                                validated.fieldName,
                            expectedValue:
                                validated.expectedValue,
                            actualValue:
                                validated.actualValue,
                            description:
                                validated.description,
                            raisedById:
                                validated.raisedById,
                        },
                        include:
                            BGV_DISCREPANCY_INCLUDE,
                    });

                if (
                    validated.verificationId
                ) {
                    const verification =
                        await tx.bGVVerification.findUnique(
                            {
                                where: {
                                    id: validated.verificationId,
                                },
                                select: {
                                    id: true,
                                    status: true,
                                },
                            }
                        );

                    if (verification) {
                        const activeStatuses:
                            BGVVerificationStatus[] =
                            [
                                "PENDING",
                                "ASSIGNED",
                                "IN_PROGRESS",
                                "CANDIDATE_ACTION_REQUIRED",
                                "SUBMITTED",
                                "UNDER_REVIEW",
                            ];

                        if (
                            activeStatuses.includes(
                                verification.status
                            )
                        ) {
                            await tx.bGVVerification.update(
                                {
                                    where: {
                                        id: verification.id,
                                    },
                                    data: {
                                        status:
                                            "DISCREPANCY",
                                        result:
                                            "DISCREPANCY",
                                        discrepancyLevel:
                                            validated.level,
                                    },
                                }
                            );
                        }
                    }
                }

                return created;
            }
        );

    return {
        data: discrepancy,
    };
}

/* =========================================================
   MOVE TO UNDER REVIEW
   ========================================================= */

export async function reviewBgvDiscrepancy(
    id: string
) {
    const existing =
        await assertDiscrepancyExists(id);

    if (existing.status !== "OPEN") {
        throw AppError.badRequest(
            "Only an open BGV discrepancy can be moved under review"
        );
    }

    const updated =
        await prisma.bGVDiscrepancy.update({
            where: {
                id,
            },
            data: {
                status: "UNDER_REVIEW",
            },
            include: BGV_DISCREPANCY_INCLUDE,
        });

    return {
        data: updated,
    };
}

/* =========================================================
   RESOLVE
   ========================================================= */

export async function resolveBgvDiscrepancy(
    id: string,
    input: ResolveBgvDiscrepancyInput
) {
    const existing =
        await assertDiscrepancyExists(id);

    assertDiscrepancyCanBeResolved(
        existing.status
    );

    const raw =
        validateResolveBgvDiscrepancy(
            input as unknown as Record<string, unknown>
        );

    const validated = raw as {
        status:
            | "RESOLVED"
            | "ACCEPTED"
            | "REJECTED";
        resolvedById: string;
        resolution: string;
    };

    await assertEmployeeExists(
        validated.resolvedById,
        "Discrepancy resolver"
    );

    if (
        existing.status !== "OPEN" &&
        existing.status !== "UNDER_REVIEW"
    ) {
        throw AppError.badRequest(
            "Only an open or under-review discrepancy can be resolved"
        );
    }

    const updated =
        await prisma.$transaction(
            async (tx) => {
                const discrepancy =
                    await tx.bGVDiscrepancy.update(
                        {
                            where: {
                                id,
                            },
                            data: {
                                status:
                                    validated.status,
                                resolvedById:
                                    validated.resolvedById,
                                resolvedAt:
                                    new Date(),
                                resolution:
                                    validated.resolution,
                            },
                            include:
                                BGV_DISCREPANCY_INCLUDE,
                        }
                    );

                if (
                    existing.verificationId
                ) {
                    const remaining =
                        await tx.bGVDiscrepancy.count(
                            {
                                where: {
                                    verificationId:
                                        existing.verificationId,
                                    status: {
                                        in: [
                                            "OPEN",
                                            "UNDER_REVIEW",
                                        ],
                                    },
                                    id: {
                                        not: id,
                                    },
                                },
                            }
                        );

                    if (remaining === 0) {
                        await tx.bGVVerification.update(
                            {
                                where: {
                                    id: existing.verificationId,
                                },
                                data: {
                                    status:
                                        "UNDER_REVIEW",
                                },
                            }
                        );
                    }
                }

                return discrepancy;
            }
        );

    return {
        data: updated,
    };
}

/* =========================================================
   REOPEN
   ========================================================= */

export async function reopenBgvDiscrepancy(
    id: string
) {
    const existing =
        await assertDiscrepancyExists(id);

    if (
        existing.status !== "RESOLVED" &&
        existing.status !== "ACCEPTED" &&
        existing.status !== "REJECTED"
    ) {
        throw AppError.badRequest(
            "Only a resolved BGV discrepancy can be reopened"
        );
    }

    const updated =
        await prisma.bGVDiscrepancy.update({
            where: {
                id,
            },
            data: {
                status: "OPEN",
                resolvedById: null,
                resolvedAt: null,
                resolution: null,
            },
            include: BGV_DISCREPANCY_INCLUDE,
        });

    return {
        data: updated,
    };
}

/* =========================================================
   DELETE
   ========================================================= */

export async function deleteBgvDiscrepancy(
    id: string
) {
    const existing =
        await assertDiscrepancyExists(id);

    if (
        existing.status !== "OPEN"
    ) {
        throw AppError.badRequest(
            "Only an open BGV discrepancy can be deleted"
        );
    }

    await prisma.bGVDiscrepancy.delete({
        where: {
            id,
        },
    });

    return {
        data: {
            id,
            deleted: true,
        },
    };
}
