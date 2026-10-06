import assert from "node:assert/strict";
import test from "node:test";
import { submitAndLinkWorkflow } from "./submission";

function fakeDatabase(definitionId: string | null) {
  const state = { committed: false, rolledBack: false };
  const tx = {
    workflowDefinition: {
      findFirst: async () => definitionId ? { id: definitionId } : null,
    },
  };
  const database = {
    $transaction: async <T>(operation: (transaction: typeof tx) => Promise<T>) => {
      try {
        const result = await operation(tx);
        state.committed = true;
        return result;
      } catch (error) {
        state.rolledBack = true;
        throw error;
      }
    },
  };
  return { database, state, tx };
}

const baseInput = {
  requestType: "Policy Publication",
  requesterCode: "EMP001",
  attributes: { affected_employee_count: 12 },
};

test("linked module submission attaches the engine instance within one transaction", async () => {
  const { database, state, tx } = fakeDatabase("definition-1");
  let linkedId: string | undefined;
  const result = await submitAndLinkWorkflow({
    ...baseInput,
    database: database as never,
    submitRequest: async (definitionId, requesterCode, attributes, transaction) => {
      assert.equal(definitionId, "definition-1");
      assert.equal(requesterCode, "EMP001");
      assert.deepEqual(attributes, baseInput.attributes);
      assert.equal(transaction, tx);
      return { data: { id: "instance-1" } };
    },
    linkOwner: async (transaction, workflowInstanceId) => {
      assert.equal(transaction, tx);
      linkedId = workflowInstanceId;
      return "owner-1";
    },
  });

  assert.equal(result, "owner-1");
  assert.equal(linkedId, "instance-1");
  assert.equal(state.committed, true);
  assert.equal(state.rolledBack, false);
});

test("missing active definition creates neither workflow nor owner link", async () => {
  const { database, state } = fakeDatabase(null);
  let submitted = false;
  let linked = false;

  await assert.rejects(submitAndLinkWorkflow({
    ...baseInput,
    database: database as never,
    submitRequest: async () => {
      submitted = true;
      return { data: { id: "instance-1" } };
    },
    linkOwner: async () => {
      linked = true;
      return null;
    },
  }), /workflow is not installed/);

  assert.equal(submitted, false);
  assert.equal(linked, false);
  assert.equal(state.committed, false);
  assert.equal(state.rolledBack, true);
});

test("engine submission failure rolls back before the owner record is linked", async () => {
  const { database, state } = fakeDatabase("definition-1");
  let linked = false;

  await assert.rejects(submitAndLinkWorkflow({
    ...baseInput,
    database: database as never,
    submitRequest: async () => { throw new Error("approver resolution failed"); },
    linkOwner: async () => {
      linked = true;
      return null;
    },
  }), /approver resolution failed/);

  assert.equal(linked, false);
  assert.equal(state.committed, false);
  assert.equal(state.rolledBack, true);
});

test("owner-link failure rejects the transaction instead of orphaning workflow data", async () => {
  const { database, state } = fakeDatabase("definition-1");

  await assert.rejects(submitAndLinkWorkflow({
    ...baseInput,
    database: database as never,
    submitRequest: async () => ({ data: { id: "instance-1" } }),
    linkOwner: async () => { throw new Error("owner link failed"); },
  }), /owner link failed/);

  assert.equal(state.committed, false);
  assert.equal(state.rolledBack, true);
});