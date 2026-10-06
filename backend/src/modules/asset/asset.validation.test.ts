import assert from "node:assert/strict";
import test from "node:test";
import {
    addInventorySchema,
    fulfillRequestSchema,
    rejectAssetRequestSchema,
    raiseRequestSchema,
    returnAssetSchema,
} from "./asset.validation";

test("return payload requires a valid condition and boolean wipe flag", () => {
    assert.deepEqual(
        returnAssetSchema.parse({ condition: "Damaged", wipeCompleted: false }),
        { condition: "Damaged", wipeCompleted: false }
    );
    assert.equal(returnAssetSchema.safeParse({ condition: "Good", wipeCompleted: "false" }).success, false);
    assert.equal(returnAssetSchema.safeParse({ condition: "Lost", wipeCompleted: false }).success, false);
});

test("asset lifecycle schemas reject unexpected fields and malformed asset IDs", () => {
    assert.equal(returnAssetSchema.safeParse({ condition: "Good", wipeCompleted: true, approved: true }).success, false);
    assert.equal(fulfillRequestSchema.safeParse({ assetId: "not-a-uuid" }).success, false);
    assert.deepEqual(fulfillRequestSchema.parse({ assetId: null }), { assetId: null });
});

test("request and inventory payloads accept the richer operational metadata required by the asset spec", () => {
    assert.deepEqual(
        raiseRequestSchema.parse({
            category: "Laptop",
            justification: "For design work",
            assetType: "Ultrabook",
            model: "ThinkPad X1",
            quantity: 2,
            neededBy: "2026-10-15",
            requestType: "New",
            deliveryLocation: "Bengaluru office",
            costCenter: "IT-101",
        }),
        {
            category: "Laptop",
            justification: "For design work",
            assetType: "Ultrabook",
            model: "ThinkPad X1",
            quantity: 2,
            neededBy: "2026-10-15",
            requestType: "New",
            deliveryLocation: "Bengaluru office",
            costCenter: "IT-101",
        }
    );

    assert.deepEqual(
        addInventorySchema.parse({
            serial: "LP-1001",
            category: "Laptop",
            make: "Lenovo",
            model: "ThinkPad X1",
            purchaseDate: "2026-10-01",
            purchaseCost: 140000,
            location: "Bengaluru",
            warrantyExpiry: "2028-10-01",
            vendor: "Lenovo India",
            status: "IN_STOCK",
        }),
        {
            serial: "LP-1001",
            category: "Laptop",
            make: "Lenovo",
            model: "ThinkPad X1",
            purchaseDate: "2026-10-01",
            purchaseCost: 140000,
            location: "Bengaluru",
            warrantyExpiry: "2028-10-01",
            vendor: "Lenovo India",
            status: "IN_STOCK",
        }
    );
});

test("asset rejection requires a non-empty reason", () => {
    assert.deepEqual(rejectAssetRequestSchema.parse({ reason: "Budget not approved" }), { reason: "Budget not approved" });
    assert.equal(rejectAssetRequestSchema.safeParse({ reason: "  " }).success, false);
    assert.equal(rejectAssetRequestSchema.safeParse({ reason: "Rejected", extra: true }).success, false);
});