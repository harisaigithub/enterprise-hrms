import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";

export interface CreateBgvAuditInput {
    caseId: string;
    action: string;
    actorId: string;
    oldValue?: Prisma.InputJsonValue;
    newValue?: Prisma.InputJsonValue;
    ipAddress?: string;
    userAgent?: string;
}

export interface BgvAuditFilters {
    caseId?: string;
    actorId?: string;
    action?: string;
    fromDate?: Date;
    toDate?: Date;
}

const BGV_AUDIT_INCLUDE = {
    case: {
        select: {
            id: true,
            status: true,
            priority: true,
        },
    },
    actor: {
        select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
        },
    },
} satisfies Prisma.BGVAuditInclude;

function normalizeRequired(value: string, field: string, maxLength = 500) {
    const normalized = value?.trim();

    if (!normalized) {
        throw AppError.badRequest(`${field} is required`);
    }

    if (normalized.length > maxLength) {
        throw AppError.badRequest(
            `${field} cannot exceed ${maxLength} characters`
        );
    }

    return normalized;
}

function normalizeOptional(
    value: string | undefined,
    field: string,
    maxLength: number
) {
    if (value === undefined || value === null) {
        return undefined;
    }

    const normalized = value.trim();

    if (!normalized) {
        return undefined;
    }

    if (normalized.length > maxLength) {
        throw AppError.badRequest(
            `${field} cannot exceed ${maxLength} characters`
        );
    }

    return normalized;
}

async function assertCaseExists(caseId: string) {
    const bgvCase = await prisma.bGVCase.findUnique({
        where: { id: caseId },
        select: {
            id: true,
            status: true,
            priority: true,
        },
    });

    if (!bgvCase) {
        throw AppError.notFound("BGV case not found");
    }

    return bgvCase;
}

async function assertActorExists(actorId: string) {
    const actor = await prisma.employee.findUnique({
        where: { id: actorId },
        select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
        },
    });

    if (!actor) {
        throw AppError.notFound("Audit actor employee not found");
    }

    return actor;
}

async function assertAuditExists(auditId: string) {
    const audit = await prisma.bGVAudit.findUnique({
        where: { id: auditId },
        include: BGV_AUDIT_INCLUDE,
    });

    if (!audit) {
        throw AppError.notFound("BGV audit record not found");
    }

    return audit;
}

export async function getBgvAudit(auditId: string) {
    return assertAuditExists(auditId);
}

export async function listBgvAudits(filters: BgvAuditFilters = {}) {
    const where: Prisma.BGVAuditWhereInput = {};

    if (filters.caseId) {
        where.caseId = filters.caseId;
    }

    if (filters.actorId) {
        where.actorId = filters.actorId;
    }

    if (filters.action) {
        where.action = {
            contains: filters.action.trim(),
            mode: "insensitive",
        };
    }

    if (filters.fromDate || filters.toDate) {
        where.createdAt = {};

        if (filters.fromDate) {
            where.createdAt.gte = filters.fromDate;
        }

        if (filters.toDate) {
            where.createdAt.lte = filters.toDate;
        }
    }

    return prisma.bGVAudit.findMany({
        where,
        include: BGV_AUDIT_INCLUDE,
        orderBy: {
            createdAt: "desc",
        },
    });
}

export async function createBgvAudit(input: CreateBgvAuditInput) {
    const action = normalizeRequired(input.action, "Audit action");
    const ipAddress = normalizeOptional(input.ipAddress, "IP address", 100);
    const userAgent = normalizeOptional(input.userAgent, "User agent", 1000);

    const [bgvCase, actor] = await Promise.all([
        assertCaseExists(input.caseId),
        assertActorExists(input.actorId),
    ]);

    return prisma.bGVAudit.create({
        data: {
            caseId: bgvCase.id,
            action,
            actorId: actor.id,
            oldValue: input.oldValue,
            newValue: input.newValue,
            ipAddress,
            userAgent,
        },
        include: BGV_AUDIT_INCLUDE,
    });
}

export async function getBgvCaseAuditTrail(caseId: string) {
    await assertCaseExists(caseId);

    return prisma.bGVAudit.findMany({
        where: { caseId },
        include: BGV_AUDIT_INCLUDE,
        orderBy: {
            createdAt: "desc",
        },
    });
}

export async function getLatestBgvAudit(caseId: string) {
    await assertCaseExists(caseId);

    return prisma.bGVAudit.findFirst({
        where: { caseId },
        include: BGV_AUDIT_INCLUDE,
        orderBy: {
            createdAt: "desc",
        },
    });
}

export async function countBgvAudits(caseId: string) {
    await assertCaseExists(caseId);

    return prisma.bGVAudit.count({
        where: { caseId },
    });
}

/**
 * Audit records are intended to be immutable.
 * There is deliberately no update/delete operation here.
 */
