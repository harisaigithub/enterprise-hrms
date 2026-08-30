INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r CROSS JOIN "permissions" p
WHERE r."name" IN ('ADMIN', 'HR') AND p."code" = 'reports:export'
ON CONFLICT DO NOTHING;
