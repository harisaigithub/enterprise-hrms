INSERT INTO "permissions" ("id", "code", "description")
VALUES
  (gen_random_uuid(), 'travel:read', 'travel:read'),
  (gen_random_uuid(), 'travel:write', 'travel:write'),
  (gen_random_uuid(), 'travel:approve', 'travel:approve')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE
  (r."name" IN ('ADMIN', 'HR', 'MANAGER')
   AND p."code" IN ('travel:read', 'travel:write', 'travel:approve'))
  OR
  (r."name" = 'EMPLOYEE'
   AND p."code" IN ('travel:read', 'travel:write'))
ON CONFLICT ("role_id", "permission_id") DO NOTHING;