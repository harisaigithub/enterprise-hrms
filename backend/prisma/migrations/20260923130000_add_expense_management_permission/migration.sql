-- Expense policy administration uses a distinct permission from claim approval.
INSERT INTO "permissions" ("id", "code", "description")
VALUES (gen_random_uuid(), 'expenses:manage', 'Manage expense policies and correcting entries')
ON CONFLICT ("code") DO NOTHING;

-- Policy management is available only to ADMIN and HR roles in the current
-- role model. MANAGER retains claim-approval access but cannot change policy.
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" IN ('ADMIN', 'HR')
  AND p."code" = 'expenses:manage'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
