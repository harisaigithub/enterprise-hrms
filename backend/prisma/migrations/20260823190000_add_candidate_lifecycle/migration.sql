ALTER TABLE "applications"
  ADD COLUMN "approval_status" VARCHAR(40) NOT NULL DEFAULT 'HR Review',
  ADD COLUMN "first_approved_by" UUID,
  ADD COLUMN "first_approved_at" TIMESTAMP(6),
  ADD COLUMN "second_approved_by" UUID,
  ADD COLUMN "second_approved_at" TIMESTAMP(6),
  ADD COLUMN "approval_notes" TEXT,
  ADD COLUMN "employee_id" UUID;

CREATE UNIQUE INDEX "applications_employee_id_key" ON "applications"("employee_id");

ALTER TABLE "offers"
  ADD COLUMN "invitation_token_hash" VARCHAR(64),
  ADD COLUMN "invitation_expires_at" TIMESTAMP(6),
  ADD COLUMN "decision_at" TIMESTAMP(6),
  ADD COLUMN "joining_date" DATE;

CREATE UNIQUE INDEX "offers_invitation_token_hash_key" ON "offers"("invitation_token_hash");

CREATE TABLE "candidate_documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "application_id" UUID NOT NULL,
  "document_type" VARCHAR(60) NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "file_url" TEXT NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'Pending Verification',
  "rejection_reason" TEXT,
  "verified_by" UUID,
  "verified_at" TIMESTAMP(6),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL,
  CONSTRAINT "candidate_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "candidate_documents_application_id_fkey"
    FOREIGN KEY ("application_id") REFERENCES "applications"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "candidate_documents_application_id_idx" ON "candidate_documents"("application_id");
CREATE INDEX "candidate_documents_status_idx" ON "candidate_documents"("status");
