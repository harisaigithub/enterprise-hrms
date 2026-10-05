import assert from "node:assert/strict";
import test from "node:test";
import { requiresAssetApproval } from "./asset.approval";
import { ASSET_ALLOCATION_APPROVAL_THRESHOLD, WORKFLOW_BLUEPRINTS } from "../workflow/workflow.service";

test("laptop and desktop requests always require manager review", () => {
  assert.equal(requiresAssetApproval("Laptop", 20_000), true);
  assert.equal(requiresAssetApproval("Desktop", 20_000), true);
  assert.equal(requiresAssetApproval("laptop", 20_000), true);
});

test("other approval-controlled categories use the configured cost threshold", () => {
  assert.equal(requiresAssetApproval("Mobile Phone", 24_999), false);
  assert.equal(requiresAssetApproval("Mobile Phone", 25_000), false);
  assert.equal(requiresAssetApproval("Mobile Phone", 25_001), true);
  assert.equal(requiresAssetApproval("Mobile Phone", null), true);
  assert.equal(requiresAssetApproval("Laptop", 25_001), true);
  assert.equal(requiresAssetApproval("Monitor", 50_000), false);
});

test("Asset Allocation always requires manager review and conditionally adds Finance above threshold", () => {
  const definition = WORKFLOW_BLUEPRINTS.find((blueprint) => blueprint.key === "asset-allocation");
  assert.ok(definition);
  const managerStep = definition.steps.find((step) => step.name === "Manager Need Approval");
  const financeStep = definition.steps.find((step) => step.name === "Finance Purchase Approval");
  assert.ok(managerStep);
  assert.equal(managerStep.condition, undefined);
  assert.ok(financeStep);
  assert.deepEqual(financeStep.condition, {
    field: "asset_value",
    operator: ">",
    value: ASSET_ALLOCATION_APPROVAL_THRESHOLD,
  });
});