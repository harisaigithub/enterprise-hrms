CREATE TABLE "compliance_obligations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title" VARCHAR(180) NOT NULL,
  "category" VARCHAR(80) NOT NULL,
  "due_date" DATE NOT NULL,
  "owner" VARCHAR(160) NOT NULL,
  "recurrence" VARCHAR(30) NOT NULL DEFAULT 'One-off',
  "status" VARCHAR(30) NOT NULL DEFAULT 'Pending',
  "filed_at" TIMESTAMP(6),
  "filed_by_user_id" UUID,
  "created_by_user_id" UUID,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compliance_obligations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "compliance_cases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "case_number" VARCHAR(40) NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'Under Investigation',
  "summary" TEXT NOT NULL,
  "investigator_employee_ids" JSONB NOT NULL DEFAULT '[]',
  "opened_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" DATE,
  "retention_until" DATE NOT NULL,
  "legal_hold" BOOLEAN NOT NULL DEFAULT false,
  "legal_hold_reason" TEXT,
  "legal_hold_by" VARCHAR(160),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compliance_cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "compliance_retention_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source_module" VARCHAR(120) NOT NULL,
  "record_type" VARCHAR(160) NOT NULL,
  "label" VARCHAR(220) NOT NULL,
  "retention_expires_at" DATE NOT NULL,
  "classification" VARCHAR(40) NOT NULL DEFAULT 'Recognized',
  "legal_hold" BOOLEAN NOT NULL DEFAULT false,
  "legal_hold_reason" TEXT,
  "legal_hold_by" VARCHAR(160),
  "job_status" VARCHAR(80),
  "purged_at" DATE,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compliance_retention_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "compliance_activities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actor_name" VARCHAR(160) NOT NULL,
  "action" VARCHAR(100) NOT NULL,
  "category" VARCHAR(80) NOT NULL,
  "details" TEXT NOT NULL,
  "severity" VARCHAR(20) NOT NULL DEFAULT 'info',
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compliance_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "compliance_obligations_status_due_date_idx" ON "compliance_obligations"("status", "due_date");
CREATE UNIQUE INDEX "compliance_cases_case_number_key" ON "compliance_cases"("case_number");
CREATE INDEX "compliance_cases_status_idx" ON "compliance_cases"("status");
CREATE INDEX "compliance_cases_legal_hold_idx" ON "compliance_cases"("legal_hold");
CREATE INDEX "compliance_retention_records_retention_expires_at_idx" ON "compliance_retention_records"("retention_expires_at");
CREATE INDEX "compliance_retention_records_legal_hold_idx" ON "compliance_retention_records"("legal_hold");
CREATE INDEX "compliance_activities_created_at_idx" ON "compliance_activities"("created_at");

INSERT INTO "permissions" ("id", "code", "description")
VALUES (gen_random_uuid(), 'compliance:write', 'Manage compliance obligations, cases, legal holds and retention')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r CROSS JOIN "permissions" p
WHERE r."name" IN ('ADMIN', 'HR') AND p."code" IN ('compliance:read', 'compliance:write')
ON CONFLICT DO NOTHING;

INSERT INTO "compliance_obligations" ("title", "category", "due_date", "owner", "recurrence", "status") VALUES
('Monthly PF Filing', 'PF Filing', '2026-09-15', 'Sunita Reddy', 'Monthly', 'Pending'),
('Quarterly TDS Filing', 'TDS Filing', '2026-08-31', 'Sunita Reddy', 'Quarterly', 'Pending'),
('Annual POSH Training Review', 'POSH Training Review', '2026-10-01', 'Sunita Reddy', 'Annual', 'Pending');

INSERT INTO "compliance_cases" ("case_number", "category", "status", "summary", "investigator_employee_ids", "opened_at", "retention_until")
SELECT 'CC-2026-001', 'Workplace Conduct', 'Under Investigation',
       'Confidential workplace-conduct case. Detailed access is restricted to named investigators.',
       jsonb_build_array(e."id"::text), '2026-08-20', '2034-08-20'
FROM "employees" e WHERE e."employee_code" = 'EMP011';

INSERT INTO "compliance_retention_records" ("source_module", "record_type", "label", "retention_expires_at", "classification") VALUES
('Recruitment', 'Rejected candidate application', 'Candidate application archive - 2025 batch', '2026-08-01', 'Recognized'),
('Employee Master', 'Separated employee documents', 'Exit document archive - legal review', '2026-07-15', 'Recognized'),
('Assets', 'Custom asset note', 'Unclassified custom asset field', '2026-07-01', 'Unclassified');
