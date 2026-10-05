CREATE TABLE "performance_rating_proposals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workflow_instance_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "review_cycle_id" UUID NOT NULL,
  "cycle_name" VARCHAR(100) NOT NULL,
  "self_rating" INTEGER NOT NULL,
  "original_manager_rating" INTEGER NOT NULL,
  "final_rating" INTEGER NOT NULL,
  "increment" VARCHAR(20) NOT NULL,
  "promotion" BOOLEAN NOT NULL DEFAULT false,
  "appraisal_letter_url" VARCHAR(255),
  "status" VARCHAR(30) NOT NULL DEFAULT 'Pending Approval',
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decided_at" TIMESTAMP(6),
  CONSTRAINT "performance_rating_proposals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "performance_rating_proposals_workflow_instance_id_key"
ON "performance_rating_proposals"("workflow_instance_id");

CREATE INDEX "performance_rating_proposals_employee_id_review_cycle_id_status_idx"
ON "performance_rating_proposals"("employee_id", "review_cycle_id", "status");

ALTER TABLE "performance_rating_proposals"
ADD CONSTRAINT "performance_rating_proposals_workflow_instance_id_fkey"
FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;