CREATE TABLE IF NOT EXISTS "security_state" (
  "key" VARCHAR(80) NOT NULL,
  "value" JSONB NOT NULL,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" UUID,
  CONSTRAINT "security_state_pkey" PRIMARY KEY ("key")
);

INSERT INTO "security_state" ("key", "value") VALUES
  ('security_config', '{"passwordPolicy":{"minLength":12,"requireUpper":true,"requireNumber":true,"requireSymbol":true,"expiryDays":90},"ssoConfig":{"enabled":false,"provider":"Not configured","metadataUrl":"","lastSyncedAt":null},"ipRestrictions":[{"id":"payroll-release","action":"Payroll Release","allowedCidrs":[],"enabled":false}],"sessionPolicy":{"tokenLifetimeMinutes":60,"maxConcurrentSessions":3}}'::jsonb),
  ('kms_config', '{"provider":"Application encryption key","keyRotationDays":90,"lastRotatedAt":null}'::jsonb),
  ('role_security', '{}'::jsonb),
  ('user_security', '{}'::jsonb),
  ('restore_requests', '[]'::jsonb),
  ('backup_jobs', '[]'::jsonb),
  ('user_display_names', '{}'::jsonb)
ON CONFLICT ("key") DO NOTHING;
