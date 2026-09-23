INSERT INTO "permissions" ("id", "code", "description")
VALUES (
  gen_random_uuid(),
  'expenses:approve',
  'Approve or reject employee expense claims'
)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT role."id", permission."id"
FROM "roles" AS role
CROSS JOIN "permissions" AS permission
WHERE role."name" IN ('ADMIN', 'HR', 'MANAGER', 'FINANCE')
  AND permission."code" = 'expenses:approve'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
