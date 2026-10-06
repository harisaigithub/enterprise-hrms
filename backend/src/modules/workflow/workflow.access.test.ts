import assert from "node:assert/strict";
import test from "node:test";
import { workflowInstanceReadFilter } from "./workflow.access";

test("workflow read scope limits a read-only employee to their own requests", () => {
  assert.deepEqual(workflowInstanceReadFilter({ employeeCode: "EMP001", includeAssigned: false }), {
    OR: [{ requester: { is: { employeeCode: "EMP001" } } }],
  });
});

test("workflow approver scope includes requests assigned or escalated to them", () => {
  assert.deepEqual(workflowInstanceReadFilter({ employeeCode: "EMP005", includeAssigned: true }), {
    OR: [
      { requester: { is: { employeeCode: "EMP005" } } },
      { steps: { some: { OR: [{ approverId: "EMP005" }, { escalatedTo: "EMP005" }] } } },
    ],
  });
});

test("workflow writers receive the unfiltered listing", () => {
  assert.equal(workflowInstanceReadFilter(), undefined);
});