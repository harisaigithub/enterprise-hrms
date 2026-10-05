INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT role."id", permission."id"
FROM "roles" AS role
CROSS JOIN "permissions" AS permission
WHERE role."name" IN ('HR', 'MANAGER')
  AND permission."code" = 'assets:read'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;