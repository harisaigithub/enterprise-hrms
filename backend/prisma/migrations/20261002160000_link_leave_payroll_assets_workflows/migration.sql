ALTER TABLE "leave_requests"
ADD COLUMN IF NOT EXISTS "workflow_instance_id" UUID;
CREATE UNIQUE INDEX IF NOT EXISTS "leave_requests_workflow_instance_id_key"
ON "leave_requests"("workflow_instance_id");
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_requests_workflow_instance_id_fkey') THEN
		ALTER TABLE "leave_requests"
		ADD CONSTRAINT "leave_requests_workflow_instance_id_fkey"
		FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id")
		ON DELETE SET NULL ON UPDATE CASCADE;
	END IF;
END $$;

ALTER TABLE "payroll_runs"
ADD COLUMN IF NOT EXISTS "workflow_instance_id" UUID;
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_runs_workflow_instance_id_key"
ON "payroll_runs"("workflow_instance_id");
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_runs_workflow_instance_id_fkey') THEN
		ALTER TABLE "payroll_runs"
		ADD CONSTRAINT "payroll_runs_workflow_instance_id_fkey"
		FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id")
		ON DELETE SET NULL ON UPDATE CASCADE;
	END IF;
END $$;

ALTER TABLE "AssetRequest"
ADD COLUMN IF NOT EXISTS "workflow_instance_id" UUID;
CREATE UNIQUE INDEX IF NOT EXISTS "AssetRequest_workflow_instance_id_key"
ON "AssetRequest"("workflow_instance_id");
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AssetRequest_workflow_instance_id_fkey') THEN
		ALTER TABLE "AssetRequest"
		ADD CONSTRAINT "AssetRequest_workflow_instance_id_fkey"
		FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id")
		ON DELETE SET NULL ON UPDATE CASCADE;
	END IF;
END $$;