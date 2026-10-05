INSERT INTO "roles" ("id", "name", "description")
VALUES (gen_random_uuid(), 'FINANCE', 'Finance role')
ON CONFLICT ("name") DO NOTHING;

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
WHERE r."name" = 'FINANCE'
  AND p."code" IN ('travel:read', 'travel:write', 'travel:approve')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

DELETE FROM "role_permissions"
WHERE "role_id" = (SELECT "id" FROM "roles" WHERE "name" = 'HR')
  AND "permission_id" = (SELECT "id" FROM "permissions" WHERE "code" = 'travel:approve');
