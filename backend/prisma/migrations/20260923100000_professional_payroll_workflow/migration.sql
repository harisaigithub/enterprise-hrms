ALTER TABLE "payroll_runs"
  ADD COLUMN "prepared_by" UUID,
  ADD COLUMN "prepared_at" TIMESTAMP(6),
  ADD COLUMN "approved_at" TIMESTAMP(6),
  ADD COLUMN "released_by" UUID,
  ADD COLUMN "released_at" TIMESTAMP(6),
  ADD COLUMN "rejection_reason" TEXT;

ALTER TABLE "payroll_runs"
  ADD CONSTRAINT "payroll_runs_prepared_by_fkey"
  FOREIGN KEY ("prepared_by") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payroll_runs"
  ADD CONSTRAINT "payroll_runs_released_by_fkey"
  FOREIGN KEY ("released_by") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "payroll_runs_prepared_by_idx" ON "payroll_runs"("prepared_by");
CREATE INDEX "payroll_runs_released_by_idx" ON "payroll_runs"("released_by");

-- HR prepares payroll; Admin independently approves and releases it.
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."code" = 'payroll:write'
WHERE r."name" = 'HR'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
