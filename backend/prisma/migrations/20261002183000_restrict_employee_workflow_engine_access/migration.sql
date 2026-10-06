DELETE FROM "role_permissions" AS assignment
USING "roles" AS role, "permissions" AS permission
WHERE assignment."role_id" = role."id"
  AND assignment."permission_id" = permission."id"
  AND role."name" = 'EMPLOYEE'
  AND permission."code" IN ('workflows:read', 'workflows:approve');