ALTER TABLE "performance_goals"
ADD COLUMN "workflow_instance_id" UUID;

CREATE UNIQUE INDEX "performance_goals_workflow_instance_id_key"
ON "performance_goals"("workflow_instance_id");

ALTER TABLE "performance_goals"
ADD CONSTRAINT "performance_goals_workflow_instance_id_fkey"
FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "separations"
ADD COLUMN "workflow_instance_id" UUID;

CREATE UNIQUE INDEX "separations_workflow_instance_id_key"
ON "separations"("workflow_instance_id");

ALTER TABLE "separations"
ADD CONSTRAINT "separations_workflow_instance_id_fkey"
FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id")
ON DELETE SET NULL ON UPDATE CASCADE;