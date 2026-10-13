import assert from "node:assert/strict";
import test from "node:test";
import {
  getDefaultLayout,
  getAllowedWidgets,
  sanitizeLayout,
  WIDGET_CATALOG,
  WIDGET_ID_PATTERN,
  layoutInputSchema,
} from "./dashboard.catalog";

const ADMIN = ["ADMIN", "dashboard:read", "employees:read", "recruitment:read", "payroll:read", "tasks:read"];
const EMPLOYEE = ["EMPLOYEE", "dashboard:read", "attendance:read", "leave:read", "payroll:read", "performance:read", "lms:read", "policies:read", "notifications:read"];
const MANAGER = ["MANAGER", "dashboard:read", "attendance:read", "leave:read", "leave:approve", "payroll:read", "performance:read", "employees:read"];
const FINANCE = ["FINANCE", "dashboard:read", "expenses:approve", "expenses:manage", "reports:read"];

test("widget ids are stable, namespaced and unique", () => {
  const ids = WIDGET_CATALOG.map((w) => w.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate widget ids in catalog");
  for (const id of ids) {
    assert.match(id, WIDGET_ID_PATTERN, `bad widget id: ${id}`);
  }
});

test("catalog is internally consistent (sizes, defaults)", () => {
  for (const widget of WIDGET_CATALOG) {
    assert.ok(widget.sizes.length > 0, `${widget.id} has no sizes`);
    assert.ok(widget.sizes.includes(widget.defaultSize), `${widget.id} defaultSize not in sizes`);
    assert.ok(widget.roles.length > 0, `${widget.id} has no roles`);
  }
});

test("role catalogs are disjoint along permission lines", () => {
  const employeeIds = new Set(getAllowedWidgets("EMPLOYEE", EMPLOYEE.slice(1)).map((w) => w.id));
  const adminIds = new Set(getAllowedWidgets("ADMIN", ADMIN.slice(1)).map((w) => w.id));
  // An employee must never see admin analytics widgets.
  for (const id of ["admin.orgKpis", "admin.payrollTrend", "admin.departmentHeadcount", "admin.hiringFunnel", "hr.payroll", "manager.teamRoster"]) {
    assert.equal(employeeIds.has(id), false, `employee must not see ${id}`);
    assert.equal(adminIds.has(id), true, `admin should see ${id}`);
  }
  // Manager team widgets need manager role even with broad permissions.
  assert.equal(employeeIds.has("manager.teamApprovals"), false);
});

test("permission gates are enforced when the role matches", () => {
  // A MANAGER without leave:approve / expenses:approve cannot get team approvals.
  const withoutApprove = ["MANAGER", "dashboard:read", "attendance:read", "employees:read"];
  const ids = getAllowedWidgets("MANAGER", withoutApprove).map((w) => w.id);
  assert.equal(ids.includes("manager.teamApprovals"), false);
  const withApprove = getAllowedWidgets("MANAGER", [...withoutApprove, "leave:approve"]);
  assert.equal(withApprove.map((w) => w.id).includes("manager.teamApprovals"), true);
});

test("sanitizeLayout drops unknown, unauthorized and duplicate widgets", () => {
  const result = sanitizeLayout("EMPLOYEE", EMPLOYEE.slice(1), {
    widgets: [
      { id: "attendance.today", size: "md" },
      { id: "admin.orgKpis" },            // unauthorized for employee
      { id: "not.a.real.widget" },        // unknown
      { id: "attendance.today" },         // duplicate
      { id: "leave.balances", size: "huge" }, // invalid size → default
    ],
  });
  const ids = result.widgets.map((w) => w.id);
  assert.deepEqual(ids, ["attendance.today", "leave.balances"]);
  assert.ok(result.dropped.includes("admin.orgKpis"));
  assert.ok(result.dropped.includes("not.a.real.widget"));
  assert.equal(result.widgets[1].size, "sm", "invalid size falls back to widget default");
});

test("sanitizeLayout falls back to defaults for empty or malformed input", () => {
  const empty = sanitizeLayout("EMPLOYEE", EMPLOYEE.slice(1), { widgets: [] });
  assert.deepEqual(empty.widgets, getDefaultLayout("EMPLOYEE", EMPLOYEE.slice(1)));

  const garbage = sanitizeLayout("EMPLOYEE", EMPLOYEE.slice(1), { widgets: "nope" });
  assert.deepEqual(garbage.widgets, getDefaultLayout("EMPLOYEE", EMPLOYEE.slice(1)));
  assert.ok(garbage.dropped.includes("*invalid-layout*"));

  const onlyUnauthorized = sanitizeLayout("EMPLOYEE", EMPLOYEE.slice(1), { widgets: [{ id: "admin.orgKpis" }] });
  assert.ok(onlyUnauthorized.widgets.length > 0, "must never return an empty layout");
});

test("finance role gets expense backlog but no admin analytics", () => {
  const ids = getAllowedWidgets("FINANCE", FINANCE.slice(1)).map((w) => w.id);
  assert.ok(ids.includes("finance.expenseBacklog"));
  assert.equal(ids.includes("admin.orgKpis"), false);
  assert.equal(ids.includes("manager.teamRoster"), false);
});

test("layoutInputSchema rejects oversized layouts and bad ids", () => {
  assert.equal(layoutInputSchema.safeParse({ widgets: [{ id: "Bad_ID" }] }).success, false);
  const tooMany = { widgets: Array.from({ length: 31 }, (_, i) => ({ id: `x.y${i}` })) };
  assert.equal(layoutInputSchema.safeParse(tooMany).success, false);
});
