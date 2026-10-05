import assert from "node:assert/strict";
import test from "node:test";
import { assertDistinctParallelApprover, assertRequesterCannotApprove, canActOnNamedRoleStep, cancelPendingStepsAfterRejection, findEscalationCandidate, findNextLevelManager, syncWorkflowModuleState } from "./workflow.service";

test("self-approval escalation walks to the next distinct active manager", async () => {
  const managers = new Map([
    ["EMP001", { id: "EMP001", managerId: "EMP002" }],
  ]);

  const candidate = await findEscalationCandidate(
    "EMP001",
    "EMP001",
    async (employeeCode) => managers.get(employeeCode) ?? null
  );

  assert.equal(candidate, "EMP002");
});

test("self-approval escalation stops when manager data is missing or cyclic", async () => {
  const missing = await findEscalationCandidate("EMP001", "EMP001", async () => null);
  const cyclic = await findEscalationCandidate(
    "EMP001",
    "EMP001",
    async () => ({ id: "EMP001", managerId: "EMP001" })
  );

  assert.equal(missing, null);
  assert.equal(cyclic, null);
});

test("Next Level Manager resolves the manager's manager when that manager reports to the CEO", async () => {
  const employees = new Map([
    ["EMP005", { id: "EMP005", managerId: "EMP010", name: "Anjali Desai" }],
    ["EMP010", { id: "EMP010", managerId: null, name: "Rajesh Menon" }],
  ]);
  const result = await findNextLevelManager("EMP005", async (employeeCode) => employees.get(employeeCode) ?? null);

  assert.deepEqual(result, { approverId: "EMP010", approverName: "Rajesh Menon" });
});

test("parallel approval steps require distinct actors", () => {
  const group = [
    { id: "step-1", status: "Approved", actedBy: "EMP002" },
    { id: "step-2", status: "Pending", actedBy: null },
  ];

  assert.throws(() => assertDistinctParallelApprover(group, "step-2", "EMP002"), /different approver/);
  assert.doesNotThrow(() => assertDistinctParallelApprover(group, "step-2", "EMP003"));
});

test("requester cannot approve a named-role step even when role bypass is granted", () => {
  assert.throws(() => assertRequesterCannotApprove("EMP011", "EMP011"), /cannot approve or reject their own/);
  assert.doesNotThrow(() => assertRequesterCannotApprove("EMP011", "EMP015"));
});

test("named-role steps require the matching role unless an Admin explicitly overrides", () => {
  assert.equal(canActOnNamedRoleStep("role-finance", "FINANCE"), true);
  assert.equal(canActOnNamedRoleStep("role-finance", "HR"), false);
  assert.equal(canActOnNamedRoleStep("role-hr", "HR"), true);
  assert.equal(canActOnNamedRoleStep("role-hr", "FINANCE"), false);
  assert.equal(canActOnNamedRoleStep("role-finance", "ADMIN", true), true);
  assert.equal(canActOnNamedRoleStep("role-finance", "HR", true), false);
});

test("rejection cancels every other pending workflow step", async () => {
  const calls: any[] = [];
  const tx = {
    workflowInstanceStep: {
      updateMany: async (input: any) => {
        calls.push(input);
        return { count: 1 };
      },
    },
  };

  const count = await cancelPendingStepsAfterRejection(tx as any, "instance-1", "rejected-step");

  assert.equal(count, 1);
  assert.deepEqual(calls[0], {
    where: { instanceId: "instance-1", id: { not: "rejected-step" }, status: "Pending" },
    data: { status: "Cancelled" },
  });
});

test("policy workflow approval publishes only the approved version and carries acknowledgements", async () => {
  const policyVersionUpdates: any[] = [];
  const policyUpdates: any[] = [];
  const carriedAcknowledgements: any[] = [];
  const effectiveDate = new Date("2026-01-15T00:00:00.000Z");
  const tx = {
    policyVersion: {
      findUnique: async () => ({
        id: "version-2", policyId: "policy-1", versionNumber: 2, approvalStatus: "Pending Approval", effectiveDate,
        requiresReacknowledgement: false,
        policy: { reviewCycleMonths: 12, versions: [{ id: "version-1", versionNumber: 1 }] },
      }),
      update: async (input: any) => policyVersionUpdates.push(input),
    },
    policy: { update: async (input: any) => policyUpdates.push(input) },
    policyAcknowledgement: {
      findMany: async () => [{ employeeId: "employee-1", acknowledgedAt: effectiveDate, device: "web" }],
      createMany: async (input: any) => carriedAcknowledgements.push(input),
    },
  };

  await syncWorkflowModuleState(tx as any, { policyVersion: { id: "version-2" } }, {}, "approve", "Approved", undefined, "HR approver");

  assert.equal(policyUpdates[0].data.status, "Published");
  assert.equal(policyUpdates[0].data.nextReviewDate.toISOString(), "2027-01-15T00:00:00.000Z");
  assert.equal(policyVersionUpdates[0].data.approvalStatus, "Approved");
  assert.ok(policyVersionUpdates[0].data.publishedAt instanceof Date);
  assert.equal(carriedAcknowledgements[0].data[0].versionId, "version-2");
});

test("policy workflow rejection leaves the policy unpublished", async () => {
  const policyVersionUpdates: any[] = [];
  const policyUpdates: any[] = [];
  const tx = {
    policyVersion: {
      findUnique: async () => ({ id: "version-2", policyId: "policy-1" }),
      update: async (input: any) => policyVersionUpdates.push(input),
    },
    policy: { update: async (input: any) => policyUpdates.push(input) },
  };

  await syncWorkflowModuleState(tx as any, { policyVersion: { id: "version-2" } }, {}, "reject", "Rejected", "Needs revision", "HR approver");

  assert.equal(policyVersionUpdates[0].data.approvalStatus, "Rejected");
  assert.equal(policyUpdates[0].data.status, "Draft");
  assert.equal(policyUpdates[0].data.nextReviewDate, null);
});

test("compliance workflow approval marks filing complete only after engine approval", async () => {
  const obligationUpdates: any[] = [];
  const activities: any[] = [];
  const tx = {
    complianceObligation: {
      findUnique: async () => ({ id: "obligation-1", category: "POSH Training Review", title: "POSH review" }),
      update: async (input: any) => obligationUpdates.push(input),
    },
    employee: { findUnique: async () => ({ userId: "user-1" }) },
    complianceActivity: { create: async (input: any) => activities.push(input) },
  };

  await syncWorkflowModuleState(tx as any, { complianceObligation: { id: "obligation-1" } }, { actedBy: "EMP002" }, "approve", "Approved", undefined, "Finance approver");

  assert.equal(obligationUpdates[0].data.status, "Completed");
  assert.ok(obligationUpdates[0].data.filedAt instanceof Date);
  assert.equal(obligationUpdates[0].data.filedByUserId, "user-1");
  assert.equal(activities.length, 1);
});

test("compliance workflow rejection does not mark an obligation filed", async () => {
  const obligationUpdates: any[] = [];
  const activities: any[] = [];
  const tx = {
    complianceObligation: {
      findUnique: async () => ({ id: "obligation-1", category: "Annual Filing", title: "Annual filing" }),
      update: async (input: any) => obligationUpdates.push(input),
    },
    complianceActivity: { create: async (input: any) => activities.push(input) },
  };

  await syncWorkflowModuleState(tx as any, { complianceObligation: { id: "obligation-1" } }, {}, "reject", "Rejected", "Correction required", "HR approver");

  assert.equal(obligationUpdates[0].data.status, "Rejected");
  assert.equal(obligationUpdates[0].data.filedAt, null);
  assert.equal(obligationUpdates[0].data.filedByUserId, null);
  assert.equal(activities[0].data.severity, "warning");
});