import assert from "node:assert/strict";
import test from "node:test";
import { getTravelApprovalStage } from "./travel.approval";

test("travel manager approval is available to the reporting manager and admin override", () => {
  assert.equal(getTravelApprovalStage("Pending Manager Approval", "MANAGER"), "manager");
  assert.equal(getTravelApprovalStage("Resubmitted", "MANAGER"), "manager");
  assert.equal(getTravelApprovalStage("Pending Manager Approval", "ADMIN"), "manager");
});

test("travel finance approval is available to Finance and admin override", () => {
  assert.equal(getTravelApprovalStage("Pending Finance Approval", "FINANCE"), "finance");
  assert.equal(getTravelApprovalStage("Pending Finance Approval", "ADMIN"), "finance");
});

test("travel approval stage rejects roles that cannot act at the current stage", () => {
  assert.equal(getTravelApprovalStage("Pending Manager Approval", "FINANCE"), null);
  assert.equal(getTravelApprovalStage("Pending Finance Approval", "MANAGER"), null);
  assert.equal(getTravelApprovalStage("Pending Manager Approval", "EMPLOYEE"), null);
  assert.equal(getTravelApprovalStage("Approved", "ADMIN"), null);
});
