CREATE TABLE "travel_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "request_number" VARCHAR(30) NOT NULL,
  "employee_id" UUID NOT NULL,
  "workflow_instance_id" UUID,
  "linked_expense_claim_id" UUID,
  "destination" VARCHAR(160) NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "purpose" TEXT NOT NULL,
  "mode" VARCHAR(20) NOT NULL,
  "estimated_cost" DECIMAL(12,2) NOT NULL,
  "is_international" BOOLEAN NOT NULL DEFAULT false,
  "status" VARCHAR(50) NOT NULL DEFAULT 'Pending Manager Approval',
  "decision_notes" TEXT,
  "manager_approved_at" TIMESTAMP(6),
  "finance_approved_at" TIMESTAMP(6),
  "booking" JSONB,
  "advance" JSONB,
  "settlement" JSONB,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "travel_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "travel_request_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "request_id" UUID NOT NULL,
  "actor_id" UUID,
  "action" VARCHAR(50) NOT NULL,
  "old_status" VARCHAR(50),
  "new_status" VARCHAR(50) NOT NULL,
  "comment" TEXT,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "travel_request_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "travel_requests_request_number_key" ON "travel_requests"("request_number");
CREATE UNIQUE INDEX "travel_requests_workflow_instance_id_key" ON "travel_requests"("workflow_instance_id");
CREATE UNIQUE INDEX "travel_requests_linked_expense_claim_id_key" ON "travel_requests"("linked_expense_claim_id");
CREATE INDEX "travel_requests_employee_id_created_at_idx" ON "travel_requests"("employee_id", "created_at");
CREATE INDEX "travel_requests_status_idx" ON "travel_requests"("status");
CREATE INDEX "travel_requests_start_date_end_date_idx" ON "travel_requests"("start_date", "end_date");
CREATE INDEX "travel_request_history_request_id_created_at_idx" ON "travel_request_history"("request_id", "created_at");

ALTER TABLE "travel_requests" ADD CONSTRAINT "travel_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "travel_requests" ADD CONSTRAINT "travel_requests_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "travel_requests" ADD CONSTRAINT "travel_requests_linked_expense_claim_id_fkey" FOREIGN KEY ("linked_expense_claim_id") REFERENCES "expense_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "travel_request_history" ADD CONSTRAINT "travel_request_history_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "travel_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "travel_request_history" ADD CONSTRAINT "travel_request_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
