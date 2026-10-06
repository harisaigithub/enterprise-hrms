import assert from "node:assert/strict";
import test from "node:test";
import { assertActiveTaskAssignee, assertForceCloseAllowed, assertNoTaskDependencyCycle, assertTaskReopenAllowed, TASK_PRIORITIES, TASK_STATUSES, getTaskDoneBlockers, normalizeTaskUpdateInput, validatePriority, validateStatus } from "./task.service";

test("task lifecycle status validation accepts the supported business states", () => {
  for (const status of TASK_STATUSES) {
    assert.doesNotThrow(() => validateStatus(status));
  }

  assert.throws(() => validateStatus("Archived"), /Invalid task status/);
});

test("task priority validation accepts the defined business priorities", () => {
  for (const priority of TASK_PRIORITIES) {
    assert.doesNotThrow(() => validatePriority(priority));
  }

  assert.throws(() => validatePriority("Critical"), /Invalid task priority/);
});

test("task update payload validation accepts editable metadata and comments", () => {
  const payload = normalizeTaskUpdateInput({
    title: "Ship rollout checklist",
    priority: "Urgent",
    comments: "QA sign-off is complete.",
    dueDate: "2026-10-15",
  });

  assert.deepEqual(payload, {
    title: "Ship rollout checklist",
    priority: "Urgent",
    comments: "QA sign-off is complete.",
    dueDate: new Date("2026-10-15T00:00:00.000Z"),
  });

  assert.throws(() => normalizeTaskUpdateInput({ priority: "Critical" }), /Invalid task priority/);
});

test("task completion blockers include pending checklist items as well as unresolved blockers", () => {
  const blockers = getTaskDoneBlockers({
    dependencies: [
      { blocker: { id: "b1", title: "Final procurement", status: "In Progress" } },
      { blocker: { id: "b2", title: "Sign-off", status: "Done" } },
    ],
    subtasks: JSON.stringify([
      { id: "s1", title: "Collect invoice", done: false },
      { id: "s2", title: "Confirm asset tag", done: true },
    ]),
  });

  assert.deepEqual(blockers, {
    openBlockers: [{ id: "b1", title: "Final procurement", status: "In Progress" }],
    openSubtasks: ["Collect invoice"],
  });
});

test("force-close requires the project lead, a reason, and no open checklist items", () => {
  const task = { project: { projectLeadId: "lead-1" } };
  const blocker = [{ id: "blocker-1" }];

  assert.throws(() => assertForceCloseAllowed(task, { employeeId: "manager-1" } as any, blocker, [], "reason"), /Only the Project Lead/);
  assert.throws(() => assertForceCloseAllowed(task, { employeeId: "lead-1" } as any, blocker, [], " "), /reason is required/);
  assert.throws(() => assertForceCloseAllowed(task, { employeeId: "lead-1" } as any, blocker, ["open checklist"], "reason"), /checklist items must be completed/);
  assert.doesNotThrow(() => assertForceCloseAllowed(task, { employeeId: "lead-1" } as any, blocker, [], "documented exception"));
  assert.doesNotThrow(() => assertForceCloseAllowed(task, { employeeId: "manager-1" } as any, [], [], undefined));
});

test("task status changes require an active assignee", () => {
  assert.doesNotThrow(() => assertActiveTaskAssignee("Active"));
  assert.throws(() => assertActiveTaskAssignee("Inactive"), /Reassign this task/);
  assert.throws(() => assertActiveTaskAssignee(null), /Reassign this task/);
});

test("dependency replacement rejects a cycle where A blocks B and B blocks A", () => {
  assert.throws(
    () => assertNoTaskDependencyCycle("task-a", ["task-b"], [{ taskId: "task-b", blockerId: "task-a" }]),
    /cannot contain a cycle/
  );
  assert.doesNotThrow(() =>
    assertNoTaskDependencyCycle("task-a", ["task-b"], [{ taskId: "task-c", blockerId: "task-a" }])
  );
});

test("reopening a completed task is limited to its lead or an admin", () => {
  const task = { project: { projectLeadId: "lead-1" } };
  assert.throws(() => assertTaskReopenAllowed(task, { role: "EMPLOYEE", employeeId: "assignee-1" } as any), /Project Lead or an Admin/);
  assert.doesNotThrow(() => assertTaskReopenAllowed(task, { role: "MANAGER", employeeId: "lead-1" } as any));
  assert.doesNotThrow(() => assertTaskReopenAllowed(task, { role: "ADMIN" } as any));
});
