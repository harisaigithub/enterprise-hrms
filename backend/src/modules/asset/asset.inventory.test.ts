import assert from "node:assert/strict";
import test from "node:test";
import {
    buildInventoryOrderBy,
    buildInventoryWhere,
    INVENTORY_SORT_FIELDS,
} from "./asset.inventory";
import { listInventoryQuerySchema } from "./asset.validation";

test("empty filters produce an empty Prisma where clause", () => {
    assert.deepEqual(buildInventoryWhere({}), {});
    assert.deepEqual(buildInventoryWhere(), {});
});

test("valid status filters map to the Prisma enum, unknown statuses are ignored", () => {
    assert.deepEqual(buildInventoryWhere({ status: "ASSIGNED" }), { status: "ASSIGNED" });
    assert.deepEqual(buildInventoryWhere({ status: "SOMETHING_ELSE" }), {});
});

test("category filters match exactly", () => {
    assert.deepEqual(buildInventoryWhere({ category: "Laptop" }), { category: "Laptop" });
});

test("search matches asset fields and the current holder", () => {
    const where = buildInventoryWhere({ search: "  thinkpad  " });

    assert.ok(Array.isArray(where.OR));
    const serialized = JSON.stringify(where.OR);

    assert.match(serialized, /thinkpad/i);
    assert.match(serialized, /serial/);
    assert.match(serialized, /currentHolder/);
    assert.match(serialized, /employeeCode/);
});

test("blank search values are ignored", () => {
    assert.deepEqual(buildInventoryWhere({ search: "   " }), {});
});

test("search, status and category combine", () => {
    const where = buildInventoryWhere({ search: "mac", status: "IN_STOCK", category: "Laptop" });

    assert.equal(where.status, "IN_STOCK");
    assert.equal(where.category, "Laptop");
    assert.ok(where.OR);
});

test("order by defaults to newest first and honours whitelisted sorts", () => {
    assert.deepEqual(buildInventoryOrderBy(), { createdAt: "desc" });
    assert.deepEqual(buildInventoryOrderBy({ sort: "warrantyExpiry", order: "asc" }), { warrantyExpiry: "asc" });
    assert.deepEqual(buildInventoryOrderBy({ order: "asc" }), { createdAt: "asc" });
    assert.deepEqual(buildInventoryOrderBy({ sort: "purchaseCost", order: "asc" }), { createdAt: "asc" });
});

test("every whitelisted sort field keeps the default descending order safe", () => {
    for (const field of INVENTORY_SORT_FIELDS) {
        assert.deepEqual(buildInventoryOrderBy({ sort: field }), { [field]: "desc" });
    }
});

test("inventory query schema coerces pagination and rejects invalid values", () => {
    const parsed = listInventoryQuerySchema.parse({
        search: "laptop",
        status: "IN_STOCK",
        category: "Laptop",
        sort: "serial",
        order: "asc",
        page: "2",
        limit: "25",
    });

    assert.deepEqual(parsed, {
        search: "laptop",
        status: "IN_STOCK",
        category: "Laptop",
        sort: "serial",
        order: "asc",
        page: 2,
        limit: 25,
    });

    assert.equal(listInventoryQuerySchema.safeParse({ status: "BANANA" }).success, false);
    assert.equal(listInventoryQuerySchema.safeParse({ sort: "purchaseCost" }).success, false);
    assert.equal(listInventoryQuerySchema.safeParse({ page: "0" }).success, false);
    assert.equal(listInventoryQuerySchema.safeParse({ limit: "500" }).success, false);
    assert.deepEqual(listInventoryQuerySchema.parse({}), {});
});
