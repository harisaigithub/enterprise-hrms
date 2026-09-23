INSERT INTO "permissions" ("id", "code", "description")
VALUES (
  gen_random_uuid(),
  'onboarding:write',
  'Create and update employee onboarding checklists'
)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" IN ('ADMIN', 'HR')
  AND p."code" = 'onboarding:write'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
