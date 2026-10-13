import { AssetStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

/**
 * Pure inventory query helpers. Kept free of Prisma client instances so they can
 * be unit-tested without a database connection.
 */

export interface InventoryFilters {
    search?: string;
    status?: string;
    category?: string;
    sort?: string;
    order?: string;
    page?: number;
    limit?: number;
}

export const INVENTORY_SORT_FIELDS = [
    "createdAt",
    "category",
    "serial",
    "status",
    "warrantyExpiry",
] as const;

export const INVENTORY_INCLUDE = {
    currentHolder: {
        select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
        },
    },
} satisfies Prisma.AssetInclude;

export function buildInventoryWhere(
    filters: InventoryFilters = {}
): Prisma.AssetWhereInput {
    const where: Prisma.AssetWhereInput = {};

    if (filters.status && (Object.values(AssetStatus) as string[]).includes(filters.status)) {
        where.status = filters.status as AssetStatus;
    }

    if (filters.category) {
        where.category = filters.category;
    }

    const search = (filters.search ?? "").trim();

    if (search) {
        where.OR = [
            { serial: { contains: search, mode: "insensitive" } },
            { make: { contains: search, mode: "insensitive" } },
            { model: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
            { location: { contains: search, mode: "insensitive" } },
            { vendor: { contains: search, mode: "insensitive" } },
            { currentHolder: { is: { firstName: { contains: search, mode: "insensitive" } } } },
            { currentHolder: { is: { lastName: { contains: search, mode: "insensitive" } } } },
            { currentHolder: { is: { employeeCode: { contains: search, mode: "insensitive" } } } },
        ];
    }

    return where;
}

export function buildInventoryOrderBy(
    filters: InventoryFilters = {}
): Prisma.AssetOrderByWithRelationInput {
    const sort = (INVENTORY_SORT_FIELDS as readonly string[]).includes(filters.sort ?? "")
        ? (filters.sort as keyof Prisma.AssetOrderByWithRelationInput)
        : "createdAt";
    const order = filters.order === "asc" ? "asc" : "desc";

    return { [sort]: order } as Prisma.AssetOrderByWithRelationInput;
}
