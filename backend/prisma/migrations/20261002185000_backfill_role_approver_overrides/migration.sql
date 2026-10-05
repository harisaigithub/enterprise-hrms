UPDATE "workflow_instance_steps" AS step
SET "role_approver_override" = true
FROM "employees" AS employee
JOIN "users" AS user_account ON user_account."id" = employee."user_id"
JOIN "roles" AS role ON role."id" = user_account."role_id"
WHERE step."acted_by" = employee."employee_code"
  AND step."approver_id" IN ('role-finance', 'role-hr')
  AND (
    (step."approver_id" = 'role-finance' AND role."name" <> 'FINANCE')
    OR (step."approver_id" = 'role-hr' AND role."name" <> 'HR')
  );