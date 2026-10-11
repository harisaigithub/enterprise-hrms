import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";

export interface CreateBgvAssignmentHistoryInput {
    caseId: string;
    assignedToId?: string | null;
    vendorId?: string | null;
    assignedById: string;
    reason?: string | null;
    assignedAt?: Date | string;
    endedAt?: Date | string | null;
}

export interface UpdateBgvAssignmentHistoryInput {
    reason?: string | null;
    endedAt?: Date | string | null;
}

export interface BgvAssignmentHistoryFilters {
    caseId?: string;
    assignedToId?: string;
    vendorId?: string;
    assignedById?: string;
    activeOnly?: boolean;
    page?: number;
    limit?: number;
}

const BGV_ASSIGNMENT_INCLUDE = {
    case: {
        select: {
            id: true,
            status: true,
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
    vendor: {
        select: {
            id: true,
            name: true,
            code: true,
            active: true,
        },
    },
    assignedBy: {
        select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
        },
    },
} as const;

function normalizeOptionalText(value?: string | null) {
    if (value === undefined || value === null) {
        return value;
    }

    const normalized = value.trim();
    return normalized || null;
}

function normalizeDate(
    value: Date | string | null | undefined,
    field: string
): Date | null | undefined {
    if (value === undefined || value === null) {
        return value;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw AppError.badRequest(`${field} must be a valid date`);
    }

    return date;
}

async function assertCaseExists(caseId: string) {
    const caseRecord = await prisma.bGVCase.findUnique({
        where: { id: caseId },
        select: {
            id: true,
            status: true,
        },
    });

    if (!caseRecord) {
        throw AppError.notFound("BGV case not found");
    }

    return caseRecord;
}

async function assertEmployeeExists(employeeId: string) {
    const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
        },
    });

    if (!employee) {
        throw AppError.notFound("Employee not found");
    }

    return employee;
}

async function assertVendorExists(vendorId: string) {
    const vendor = await prisma.bGVVendor.findUnique({
        where: { id: vendorId },
        select: {
            id: true,
            name: true,
            code: true,
            active: true,
        },
    });

    if (!vendor) {
        throw AppError.notFound("BGV vendor not found");
    }

    return vendor;
}

async function assertAssignmentHistoryExists(historyId: string) {
    const history = await prisma.bGVAssignmentHistory.findUnique({
        where: { id: historyId },
        include: BGV_ASSIGNMENT_INCLUDE,
    });

    if (!history) {
        throw AppError.notFound("BGV assignment history record not found");
    }

    return history;
}

export async function getBgvAssignmentHistory(historyId: string) {
    return assertAssignmentHistoryExists(historyId);
}

export async function listBgvAssignmentHistory(
    filters: BgvAssignmentHistoryFilters = {}
) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const where = {
        ...(filters.caseId && { caseId: filters.caseId }),
        ...(filters.assignedToId && { assignedToId: filters.assignedToId }),
        ...(filters.vendorId && { vendorId: filters.vendorId }),
        ...(filters.assignedById && { assignedById: filters.assignedById }),
        ...(filters.activeOnly && { endedAt: null }),
    };

    const [data, total] = await prisma.$transaction([
        prisma.bGVAssignmentHistory.findMany({
            where,
            include: BGV_ASSIGNMENT_INCLUDE,
            orderBy: {
                assignedAt: "desc",
            },
            skip,
            take: limit,
        }),
        prisma.bGVAssignmentHistory.count({ where }),
    ]);

    return {
        data,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

export async function getBgvCaseAssignmentHistory(caseId: string) {
    await assertCaseExists(caseId);

    return prisma.bGVAssignmentHistory.findMany({
        where: { caseId },
        include: BGV_ASSIGNMENT_INCLUDE,
        orderBy: {
            assignedAt: "asc",
        },
    });
}

export async function getActiveBgvAssignment(caseId: string) {
    await assertCaseExists(caseId);

    return prisma.bGVAssignmentHistory.findFirst({
        where: {
            caseId,
            endedAt: null,
        },
        include: BGV_ASSIGNMENT_INCLUDE,
        orderBy: {
            assignedAt: "desc",
        },
    });
}

export async function createBgvAssignmentHistory(
    input: CreateBgvAssignmentHistoryInput
) {
    await assertCaseExists(input.caseId);
    await assertEmployeeExists(input.assignedById);

    if (input.assignedToId) {
        await assertEmployeeExists(input.assignedToId);
    }

    if (input.vendorId) {
        await assertVendorExists(input.vendorId);
    }

    if (!input.assignedToId && !input.vendorId) {
        throw AppError.badRequest(
            "At least one of assignedToId or vendorId is required"
        );
    }

    const assignedAt = normalizeDate(input.assignedAt, "assignedAt");
    const endedAt = normalizeDate(input.endedAt, "endedAt");

    if (assignedAt && endedAt && endedAt < assignedAt) {
        throw AppError.badRequest("endedAt cannot be before assignedAt");
    }

    return prisma.bGVAssignmentHistory.create({
        data: {
            caseId: input.caseId,
            assignedToId: input.assignedToId ?? null,
            vendorId: input.vendorId ?? null,
            assignedById: input.assignedById,
            reason: normalizeOptionalText(input.reason),
            ...(assignedAt !== undefined &&
                assignedAt !== null && { assignedAt }),
            ...(endedAt !== undefined && { endedAt }),
        },
        include: BGV_ASSIGNMENT_INCLUDE,
    });
}

export async function closeBgvAssignmentHistory(
    historyId: string,
    endedAt?: Date | string,
    reason?: string | null
) {
    const history = await assertAssignmentHistoryExists(historyId);

    if (history.endedAt) {
        throw AppError.conflict("BGV assignment history is already closed");
    }

    const normalizedEndedAt =
        normalizeDate(endedAt, "endedAt") ?? new Date();

    if (normalizedEndedAt < history.assignedAt) {
        throw AppError.badRequest("endedAt cannot be before assignedAt");
    }

    return prisma.bGVAssignmentHistory.update({
        where: { id: historyId },
        data: {
            endedAt: normalizedEndedAt,
            ...(reason !== undefined && {
                reason: normalizeOptionalText(reason),
            }),
        },
        include: BGV_ASSIGNMENT_INCLUDE,
    });
}

export async function updateBgvAssignmentHistory(
    historyId: string,
    input: UpdateBgvAssignmentHistoryInput
) {
    const history = await assertAssignmentHistoryExists(historyId);

    const data: {
        reason?: string | null;
        endedAt?: Date | null;
    } = {};

    if (input.reason !== undefined) {
        data.reason = normalizeOptionalText(input.reason);
    }

    if (input.endedAt !== undefined) {
        const endedAt = normalizeDate(input.endedAt, "endedAt");

        if (endedAt && endedAt < history.assignedAt) {
            throw AppError.badRequest("endedAt cannot be before assignedAt");
        }

        data.endedAt = endedAt ?? null;
    }

    return prisma.bGVAssignmentHistory.update({
        where: { id: historyId },
        data,
        include: BGV_ASSIGNMENT_INCLUDE,
    });
}

export async function countBgvAssignments(caseId?: string) {
    return prisma.bGVAssignmentHistory.count({
        where: caseId ? { caseId } : undefined,
    });
}
