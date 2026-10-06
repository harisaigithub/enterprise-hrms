import assert from "node:assert/strict";
import test from "node:test";
import { countActiveLicenseAllocations, licenseAllocationKey } from "./asset.allocations";

test("one return preserves another license seat held by the same employee", () => {
    const counts = countActiveLicenseAllocations([
        { assetId: "license-1", employeeId: "employee-1", action: "ASSIGNED" },
        { assetId: "license-1", employeeId: "employee-1", action: "ASSIGNED" },
        { assetId: "license-1", employeeId: "employee-1", action: "RETURNED" },
    ]);

    assert.equal(counts.get(licenseAllocationKey("license-1", "employee-1")), 1);
});