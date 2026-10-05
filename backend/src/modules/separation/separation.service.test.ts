import assert from "node:assert/strict";
import test from "node:test";
import { assertAssetReturnClearanceCanComplete } from "./separation.service";

test("asset-return clearance stays blocked while assigned assets remain", () => {
  assert.throws(() => assertAssetReturnClearanceCanComplete(1), /all assigned assets are returned/);
  assert.throws(() => assertAssetReturnClearanceCanComplete(2), /all assigned assets are returned/);
  assert.doesNotThrow(() => assertAssetReturnClearanceCanComplete(0));
});