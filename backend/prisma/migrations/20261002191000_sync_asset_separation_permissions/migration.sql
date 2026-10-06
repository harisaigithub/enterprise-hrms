INSERT INTO "permissions" ("code", "description")
VALUES ('clearance:write', 'Update separation clearance checklist items')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT role."id", permission."id"
FROM "roles" AS role
CROSS JOIN "permissions" AS permission
WHERE (role."name" IN ('HR', 'MANAGER') AND permission."code" = 'assets:write')
   OR (role."name" IN ('ADMIN', 'MANAGER') AND permission."code" = 'separation:write')
   OR (role."name" IN ('ADMIN', 'HR', 'MANAGER') AND permission."code" = 'clearance:write')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;