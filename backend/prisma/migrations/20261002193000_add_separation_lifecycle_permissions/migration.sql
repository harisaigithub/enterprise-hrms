INSERT INTO "permissions" ("code", "description")
VALUES
  ('settlement:read', 'Read separation settlements'),
  ('settlement:write', 'Prepare separation settlements'),
  ('settlement:approve', 'Approve separation settlements'),
  ('alumni:read', 'Read alumni records'),
  ('alumni:write', 'Convert separated employees to alumni'),
  ('access:revoke', 'Revoke employee access during separation')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT role."id", permission."id"
FROM "roles" AS role
CROSS JOIN "permissions" AS permission
WHERE (role."name" IN ('ADMIN', 'HR') AND permission."code" IN (
    'settlement:read', 'settlement:write', 'settlement:approve',
    'alumni:read', 'alumni:write', 'access:revoke'
  ))
   OR (role."name" = 'MANAGER' AND permission."code" IN (
    'settlement:read', 'settlement:write', 'alumni:read', 'alumni:write'
  ))
ON CONFLICT ("role_id", "permission_id") DO NOTHING;