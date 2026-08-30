CREATE TABLE "policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title" VARCHAR(180) NOT NULL,
  "category" VARCHAR(50) NOT NULL,
  "scope" VARCHAR(150) NOT NULL DEFAULT 'Company-wide',
  "mandatory_acknowledgement" BOOLEAN NOT NULL DEFAULT true,
  "review_cycle_months" INTEGER,
  "status" VARCHAR(20) NOT NULL DEFAULT 'Draft',
  "next_review_date" DATE,
  "created_by_user_id" UUID,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "policy_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "policy_id" UUID NOT NULL,
  "version_number" INTEGER NOT NULL,
  "effective_date" DATE,
  "acknowledgement_deadline_days" INTEGER,
  "requires_reacknowledgement" BOOLEAN NOT NULL DEFAULT true,
  "summary" TEXT NOT NULL,
  "created_by_user_id" UUID,
  "created_by_name" VARCHAR(160) NOT NULL,
  "published_at" TIMESTAMP(6),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "policy_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "policy_acknowledgements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "version_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "acknowledged_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "device" VARCHAR(255),
  CONSTRAINT "policy_acknowledgements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "policies_status_idx" ON "policies"("status");
CREATE INDEX "policies_category_idx" ON "policies"("category");
CREATE UNIQUE INDEX "policy_versions_policy_id_version_number_key" ON "policy_versions"("policy_id", "version_number");
CREATE INDEX "policy_versions_policy_id_idx" ON "policy_versions"("policy_id");
CREATE UNIQUE INDEX "policy_acknowledgements_version_id_employee_id_key" ON "policy_acknowledgements"("version_id", "employee_id");
CREATE INDEX "policy_acknowledgements_employee_id_idx" ON "policy_acknowledgements"("employee_id");
CREATE INDEX "policy_acknowledgements_acknowledged_at_idx" ON "policy_acknowledgements"("acknowledged_at");

ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_policy_id_fkey"
  FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "policy_acknowledgements" ADD CONSTRAINT "policy_acknowledgements_version_id_fkey"
  FOREIGN KEY ("version_id") REFERENCES "policy_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "policy_acknowledgements" ADD CONSTRAINT "policy_acknowledgements_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
