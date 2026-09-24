-- Employees need write permission to progress and log time against their own
-- assigned tasks. Service-level ownership checks continue to prevent access to
-- any other employee's tasks and management actions remain role-restricted.
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT role."id", permission."id"
FROM "roles" AS role
CROSS JOIN "permissions" AS permission
WHERE role."name" = 'EMPLOYEE'
  AND permission."code" = 'tasks:write'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
