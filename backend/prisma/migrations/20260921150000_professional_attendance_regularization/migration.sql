-- Upgrade attendance regularization from a single approval to an auditable,
-- workflow-backed manager -> HR state machine.
ALTER TABLE "attendance_regularizations"
  ADD COLUMN "workflow_instance_id" UUID,
  ADD COLUMN "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "attendance_regularizations"
SET "status" = 'Submitted'
WHERE "status" = 'Pending';

ALTER TABLE "attendance_regularizations"
  ALTER COLUMN "status" SET DEFAULT 'Submitted',
  ALTER COLUMN "status" TYPE VARCHAR(40);

CREATE UNIQUE INDEX "attendance_regularizations_workflow_instance_id_key"
  ON "attendance_regularizations"("workflow_instance_id");
CREATE INDEX "attendance_regularizations_status_idx"
  ON "attendance_regularizations"("status");

ALTER TABLE "attendance_regularizations"
  ADD CONSTRAINT "attendance_regularizations_workflow_instance_id_fkey"
  FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "attendance_regularization_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "regularization_id" UUID NOT NULL,
  "actor_employee_id" UUID,
  "action" VARCHAR(40) NOT NULL,
  "from_status" VARCHAR(40),
  "to_status" VARCHAR(40) NOT NULL,
  "comment" TEXT,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attendance_regularization_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "attendance_regularization_history_regularization_id_created_at_idx"
  ON "attendance_regularization_history"("regularization_id", "created_at");

ALTER TABLE "attendance_regularization_history"
  ADD CONSTRAINT "attendance_regularization_history_regularization_id_fkey"
  FOREIGN KEY ("regularization_id") REFERENCES "attendance_regularizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance_regularization_history"
  ADD CONSTRAINT "attendance_regularization_history_actor_employee_id_fkey"
  FOREIGN KEY ("actor_employee_id") REFERENCES "employees"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "attendance_regularization_history"
  ("regularization_id", "actor_employee_id", "action", "from_status", "to_status", "comment", "created_at")
SELECT
  "id", "employee_id", 'MIGRATED', NULL, "status", 'Imported from legacy attendance regularization flow', "created_at"
FROM "attendance_regularizations";
