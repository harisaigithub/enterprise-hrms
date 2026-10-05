ALTER TABLE "compliance_obligations"
ADD COLUMN "workflow_instance_id" UUID;

CREATE UNIQUE INDEX "compliance_obligations_workflow_instance_id_key"
ON "compliance_obligations"("workflow_instance_id");

ALTER TABLE "compliance_obligations"
ADD CONSTRAINT "compliance_obligations_workflow_instance_id_fkey"
FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "policy_versions"
ADD COLUMN "workflow_instance_id" UUID,
ADD COLUMN "approval_status" VARCHAR(30) NOT NULL DEFAULT 'Draft',
ADD COLUMN "decided_at" TIMESTAMP(6);

CREATE UNIQUE INDEX "policy_versions_workflow_instance_id_key"
ON "policy_versions"("workflow_instance_id");

ALTER TABLE "policy_versions"
ADD CONSTRAINT "policy_versions_workflow_instance_id_fkey"
FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id")
ON DELETE SET NULL ON UPDATE CASCADE;