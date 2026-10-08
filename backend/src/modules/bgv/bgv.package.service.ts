import { BGVVerificationType, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";

export interface CreateBgvPackageInput {
    name: string;
    description?: string;
    active?: boolean;
}

export interface UpdateBgvPackageInput {
    name?: string;
    description?: string | null;
    active?: boolean;
}

export interface CreateBgvPackageCheckInput {
    packageId: string;
    type: BGVVerificationType;
    required?: boolean;
    blocking?: boolean;
    slaHours?: number | null;
}

export interface UpdateBgvPackageCheckInput {
    type?: BGVVerificationType;
    required?: boolean;
    blocking?: boolean;
    slaHours?: number | null;
}

const BGV_PACKAGE_INCLUDE = {
    checks: {
        orderBy: {
            type: "asc",
        },
    },
    _count: {
        select: {
            cases: true,
        },
    },
} satisfies Prisma.BGVPackageInclude;

const BGV_PACKAGE_CHECK_INCLUDE = {
    package: {
        select: {
            id: true,
            name: true,
            active: true,
        },
    },
} satisfies Prisma.BGVPackageCheckInclude;

function requiredText(value: string, field: string, maxLength = 200) {
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

function optionalText(
    value: string | null | undefined,
    field: string,
    maxLength = 2000
) {
    if (value === null || value === undefined) {
        return value;
    }

    const normalized = value.trim();

    if (normalized.length > maxLength) {
        throw AppError.badRequest(
            `${field} cannot exceed ${maxLength} characters`
        );
    }

    return normalized || null;
}

function validateSlaHours(value: number | null | undefined) {
    if (value === null || value === undefined) {
        return value;
    }

    if (!Number.isInteger(value) || value < 1 || value > 8760) {
        throw AppError.badRequest(
            "slaHours must be an integer between 1 and 8760"
        );
    }

    return value;
}

async function assertPackageExists(packageId: string) {
    const pkg = await prisma.bGVPackage.findUnique({
        where: { id: packageId },
        include: {
            checks: true,
        },
    });

    if (!pkg) {
        throw AppError.notFound("BGV package not found");
    }

    return pkg;
}

async function assertActivePackage(packageId: string) {
    const pkg = await assertPackageExists(packageId);

    if (!pkg.active) {
        throw AppError.badRequest("BGV package is inactive");
    }

    return pkg;
}

async function assertCheckExists(checkId: string) {
    const check = await prisma.bGVPackageCheck.findUnique({
        where: { id: checkId },
        include: BGV_PACKAGE_CHECK_INCLUDE,
    });

    if (!check) {
        throw AppError.notFound("BGV package check not found");
    }

    return check;
}

export async function getBgvPackage(packageId: string) {
    return prisma.bGVPackage.findUnique({
        where: { id: packageId },
        include: BGV_PACKAGE_INCLUDE,
    });
}

export async function listBgvPackages(active?: boolean) {
    return prisma.bGVPackage.findMany({
        where:
            active === undefined
                ? undefined
                : { active },
        include: BGV_PACKAGE_INCLUDE,
        orderBy: {
            createdAt: "desc",
        },
    });
}

export async function createBgvPackage(input: CreateBgvPackageInput) {
    const name = requiredText(input.name, "Package name", 200);
    const description = optionalText(
        input.description,
        "Package description",
        2000
    );

    return prisma.bGVPackage.create({
        data: {
            name,
            description,
            active: input.active ?? true,
        },
        include: BGV_PACKAGE_INCLUDE,
    });
}

export async function updateBgvPackage(
    packageId: string,
    input: UpdateBgvPackageInput
) {
    await assertPackageExists(packageId);

    const data: Prisma.BGVPackageUpdateInput = {};

    if (input.name !== undefined) {
        data.name = requiredText(input.name, "Package name", 200);
    }

    if (input.description !== undefined) {
        data.description = optionalText(
            input.description,
            "Package description",
            2000
        );
    }

    if (input.active !== undefined) {
        data.active = input.active;
    }

    if (Object.keys(data).length === 0) {
        throw AppError.badRequest("No package fields provided for update");
    }

    return prisma.bGVPackage.update({
        where: { id: packageId },
        data,
        include: BGV_PACKAGE_INCLUDE,
    });
}

export async function deactivateBgvPackage(packageId: string) {
    const pkg = await assertPackageExists(packageId);

    if (!pkg.active) {
        return pkg;
    }

    return prisma.bGVPackage.update({
        where: { id: packageId },
        data: { active: false },
        include: BGV_PACKAGE_INCLUDE,
    });
}

export async function activateBgvPackage(packageId: string) {
    await assertPackageExists(packageId);

    return prisma.bGVPackage.update({
        where: { id: packageId },
        data: { active: true },
        include: BGV_PACKAGE_INCLUDE,
    });
}

export async function deleteBgvPackage(packageId: string) {
    await assertPackageExists(packageId);

    const caseCount = await prisma.bGVCase.count({
        where: {
            packageId,
        },
    });

    if (caseCount > 0) {
        throw AppError.conflict(
            "BGV package cannot be deleted because it is used by existing cases"
        );
    }

    return prisma.bGVPackage.delete({
        where: { id: packageId },
    });
}

export async function listBgvPackageChecks(packageId: string) {
    await assertPackageExists(packageId);

    return prisma.bGVPackageCheck.findMany({
        where: { packageId },
        include: BGV_PACKAGE_CHECK_INCLUDE,
        orderBy: {
            type: "asc",
        },
    });
}

export async function getBgvPackageCheck(checkId: string) {
    return assertCheckExists(checkId);
}

export async function createBgvPackageCheck(
    input: CreateBgvPackageCheckInput
) {
    await assertActivePackage(input.packageId);

    const slaHours = validateSlaHours(input.slaHours);

    const existing = await prisma.bGVPackageCheck.findUnique({
        where: {
            packageId_type: {
                packageId: input.packageId,
                type: input.type,
            },
        },
    });

    if (existing) {
        throw AppError.conflict(
            `A ${input.type} check already exists in this BGV package`
        );
    }

    return prisma.bGVPackageCheck.create({
        data: {
            packageId: input.packageId,
            type: input.type,
            required: input.required ?? true,
            blocking: input.blocking ?? false,
            slaHours,
        },
        include: BGV_PACKAGE_CHECK_INCLUDE,
    });
}

export async function updateBgvPackageCheck(
    checkId: string,
    input: UpdateBgvPackageCheckInput
) {
    const existing = await assertCheckExists(checkId);

    const data: Prisma.BGVPackageCheckUpdateInput = {};

    if (input.type !== undefined && input.type !== existing.type) {
        const duplicate = await prisma.bGVPackageCheck.findUnique({
            where: {
                packageId_type: {
                    packageId: existing.packageId,
                    type: input.type,
                },
            },
        });

        if (duplicate) {
            throw AppError.conflict(
                `A ${input.type} check already exists in this BGV package`
            );
        }

        data.type = input.type;
    }

    if (input.required !== undefined) {
        data.required = input.required;
    }

    if (input.blocking !== undefined) {
        data.blocking = input.blocking;
    }

    if (input.slaHours !== undefined) {
        data.slaHours = validateSlaHours(input.slaHours);
    }

    if (Object.keys(data).length === 0) {
        throw AppError.badRequest(
            "No package check fields provided for update"
        );
    }

    return prisma.bGVPackageCheck.update({
        where: { id: checkId },
        data,
        include: BGV_PACKAGE_CHECK_INCLUDE,
    });
}

export async function deleteBgvPackageCheck(checkId: string) {
    await assertCheckExists(checkId);

    return prisma.bGVPackageCheck.delete({
        where: { id: checkId },
    });
}

export async function replaceBgvPackageChecks(
    packageId: string,
    checks: Array<{
        type: BGVVerificationType;
        required?: boolean;
        blocking?: boolean;
        slaHours?: number | null;
    }>
) {
    await assertActivePackage(packageId);

    const seen = new Set<BGVVerificationType>();

    for (const check of checks) {
        if (seen.has(check.type)) {
            throw AppError.conflict(
                `Duplicate ${check.type} check in package definition`
            );
        }

        seen.add(check.type);
        validateSlaHours(check.slaHours);
    }

    return prisma.$transaction(async (tx) => {
        await tx.bGVPackageCheck.deleteMany({
            where: { packageId },
        });

        if (checks.length > 0) {
            await tx.bGVPackageCheck.createMany({
                data: checks.map((check) => ({
                    packageId,
                    type: check.type,
                    required: check.required ?? true,
                    blocking: check.blocking ?? false,
                    slaHours: check.slaHours ?? null,
                })),
            });
        }

        return tx.bGVPackage.findUnique({
            where: { id: packageId },
            include: BGV_PACKAGE_INCLUDE,
        });
    });
}
