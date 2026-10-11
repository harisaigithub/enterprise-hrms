import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";

export interface CreateBgvVendorInput {
    name: string;
    code: string;
    email?: string | null;
    phone?: string | null;
    active?: boolean;
    apiEnabled?: boolean;
    apiBaseUrl?: string | null;
    defaultSlaHours?: number | null;
}

export interface UpdateBgvVendorInput {
    name?: string;
    code?: string;
    email?: string | null;
    phone?: string | null;
    active?: boolean;
    apiEnabled?: boolean;
    apiBaseUrl?: string | null;
    defaultSlaHours?: number | null;
}

export interface BgvVendorFilters {
    active?: boolean;
    apiEnabled?: boolean;
    search?: string;
    page?: number;
    limit?: number;
}

const BGV_VENDOR_SELECT = {
    id: true,
    name: true,
    code: true,
    email: true,
    phone: true,
    active: true,
    apiEnabled: true,
    apiBaseUrl: true,
    defaultSlaHours: true,
    createdAt: true,
    updatedAt: true,
} as const;

function normalizeRequired(value: string, field: string): string {
    const normalized = value.trim();

    if (!normalized) {
        throw AppError.badRequest(`${field} is required`);
    }

    return normalized;
}

function normalizeOptional(value?: string | null): string | null | undefined {
    if (value === undefined || value === null) {
        return value;
    }

    const normalized = value.trim();
    return normalized || null;
}

function validateSlaHours(value?: number | null): number | null | undefined {
    if (value === undefined || value === null) {
        return value;
    }

    if (!Number.isInteger(value) || value < 1 || value > 8760) {
        throw AppError.badRequest(
            "defaultSlaHours must be an integer between 1 and 8760 hours"
        );
    }

    return value;
}

function validateApiBaseUrl(
    value?: string | null
): string | null | undefined {
    const normalized = normalizeOptional(value);

    if (normalized === null || normalized === undefined) {
        return normalized;
    }

    try {
        const url = new URL(normalized);

        if (!["http:", "https:"].includes(url.protocol)) {
            throw new Error();
        }
    } catch {
        throw AppError.badRequest("apiBaseUrl must be a valid HTTP or HTTPS URL");
    }

    return normalized;
}

async function assertVendorExists(vendorId: string) {
    const vendor = await prisma.bGVVendor.findUnique({
        where: { id: vendorId },
        select: BGV_VENDOR_SELECT,
    });

    if (!vendor) {
        throw AppError.notFound("BGV vendor not found");
    }

    return vendor;
}

async function assertCodeAvailable(code: string, excludeId?: string) {
    const existing = await prisma.bGVVendor.findUnique({
        where: { code },
        select: { id: true },
    });

    if (existing && existing.id !== excludeId) {
        throw AppError.conflict(`BGV vendor code "${code}" already exists`);
    }
}

export async function getBgvVendor(vendorId: string) {
    return assertVendorExists(vendorId);
}

export async function listBgvVendors(filters: BgvVendorFilters = {}) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const search = filters.search?.trim();

    const where = {
        ...(filters.active !== undefined && { active: filters.active }),
        ...(filters.apiEnabled !== undefined && {
            apiEnabled: filters.apiEnabled,
        }),
        ...(search && {
            OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { code: { contains: search, mode: "insensitive" as const } },
                { email: { contains: search, mode: "insensitive" as const } },
                { phone: { contains: search, mode: "insensitive" as const } },
            ],
        }),
    };

    const [data, total] = await prisma.$transaction([
        prisma.bGVVendor.findMany({
            where,
            select: BGV_VENDOR_SELECT,
            orderBy: { name: "asc" },
            skip,
            take: limit,
        }),
        prisma.bGVVendor.count({ where }),
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

export async function createBgvVendor(input: CreateBgvVendorInput) {
    const name = normalizeRequired(input.name, "name");
    const code = normalizeRequired(input.code, "code").toUpperCase();

    await assertCodeAvailable(code);

    const apiEnabled = input.apiEnabled ?? false;
    const apiBaseUrl = validateApiBaseUrl(input.apiBaseUrl);

    if (apiEnabled && !apiBaseUrl) {
        throw AppError.badRequest(
            "apiBaseUrl is required when apiEnabled is true"
        );
    }

    return prisma.bGVVendor.create({
        data: {
            name,
            code,
            email: normalizeOptional(input.email),
            phone: normalizeOptional(input.phone),
            active: input.active ?? true,
            apiEnabled,
            apiBaseUrl,
            defaultSlaHours: validateSlaHours(input.defaultSlaHours),
        },
        select: BGV_VENDOR_SELECT,
    });
}

export async function updateBgvVendor(
    vendorId: string,
    input: UpdateBgvVendorInput
) {
    await assertVendorExists(vendorId);

    const data: {
        name?: string;
        code?: string;
        email?: string | null;
        phone?: string | null;
        active?: boolean;
        apiEnabled?: boolean;
        apiBaseUrl?: string | null;
        defaultSlaHours?: number | null;
    } = {};

    if (input.name !== undefined) {
        data.name = normalizeRequired(input.name, "name");
    }

    if (input.code !== undefined) {
        data.code = normalizeRequired(input.code, "code").toUpperCase();
        await assertCodeAvailable(data.code, vendorId);
    }

    if (input.email !== undefined) {
        data.email = normalizeOptional(input.email);
    }

    if (input.phone !== undefined) {
        data.phone = normalizeOptional(input.phone);
    }

    if (input.active !== undefined) {
        data.active = input.active;
    }

    if (input.apiEnabled !== undefined) {
        data.apiEnabled = input.apiEnabled;
    }

    if (input.apiBaseUrl !== undefined) {
        data.apiBaseUrl = validateApiBaseUrl(input.apiBaseUrl);
    }

    if (input.defaultSlaHours !== undefined) {
        data.defaultSlaHours = validateSlaHours(input.defaultSlaHours);
    }

    const effectiveApiEnabled = data.apiEnabled ?? (await assertVendorExists(vendorId)).apiEnabled;
    const effectiveApiBaseUrl =
        data.apiBaseUrl !== undefined
            ? data.apiBaseUrl
            : (await assertVendorExists(vendorId)).apiBaseUrl;

    if (effectiveApiEnabled && !effectiveApiBaseUrl) {
        throw AppError.badRequest(
            "apiBaseUrl is required when apiEnabled is true"
        );
    }

    return prisma.bGVVendor.update({
        where: { id: vendorId },
        data,
        select: BGV_VENDOR_SELECT,
    });
}

export async function activateBgvVendor(vendorId: string) {
    await assertVendorExists(vendorId);

    return prisma.bGVVendor.update({
        where: { id: vendorId },
        data: { active: true },
        select: BGV_VENDOR_SELECT,
    });
}

export async function deactivateBgvVendor(vendorId: string) {
    await assertVendorExists(vendorId);

    return prisma.bGVVendor.update({
        where: { id: vendorId },
        data: { active: false },
        select: BGV_VENDOR_SELECT,
    });
}

export async function enableBgvVendorApi(vendorId: string) {
    const vendor = await assertVendorExists(vendorId);

    if (!vendor.apiBaseUrl) {
        throw AppError.badRequest(
            "apiBaseUrl must be configured before enabling vendor API"
        );
    }

    return prisma.bGVVendor.update({
        where: { id: vendorId },
        data: { apiEnabled: true },
        select: BGV_VENDOR_SELECT,
    });
}

export async function disableBgvVendorApi(vendorId: string) {
    await assertVendorExists(vendorId);

    return prisma.bGVVendor.update({
        where: { id: vendorId },
        data: { apiEnabled: false },
        select: BGV_VENDOR_SELECT,
    });
}

export async function deleteBgvVendor(vendorId: string) {
    await assertVendorExists(vendorId);

    const [caseCount, verificationCount] = await prisma.$transaction([
        prisma.bGVCase.count({ where: { vendorId } }),
        prisma.bGVVerification.count({ where: { vendorId } }),
    ]);

    if (caseCount > 0 || verificationCount > 0) {
        throw AppError.conflict(
            "BGV vendor cannot be deleted because it is referenced by existing cases or verifications"
        );
    }

    return prisma.bGVVendor.delete({
        where: { id: vendorId },
    });
}

export async function countBgvVendors(active?: boolean) {
    return prisma.bGVVendor.count({
        where: active === undefined ? undefined : { active },
    });
}
