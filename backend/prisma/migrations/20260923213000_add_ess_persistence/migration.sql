CREATE TABLE IF NOT EXISTS "ess_tax_declarations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "employee_id" UUID NOT NULL,
  "financial_year" VARCHAR(9) NOT NULL,
  "section" VARCHAR(20) NOT NULL,
  "investment_type" VARCHAR(120) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "proof_status" VARCHAR(20) NOT NULL DEFAULT 'Pending',
  "submitted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ess_tax_declarations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ess_tax_declarations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ess_tax_declarations_employee_id_financial_year_idx"
  ON "ess_tax_declarations"("employee_id", "financial_year");

CREATE TABLE IF NOT EXISTS "ess_data_export_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "employee_id" UUID NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'Requested',
  "requested_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(6) NOT NULL,
  "download_url" TEXT,
  "completed_at" TIMESTAMP(6),
  CONSTRAINT "ess_data_export_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ess_data_export_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ess_data_export_requests_employee_id_requested_at_idx"
  ON "ess_data_export_requests"("employee_id", "requested_at");
