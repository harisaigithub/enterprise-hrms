ALTER TABLE "expense_claims"
  ADD COLUMN IF NOT EXISTS "reimbursement_payroll_run_id" UUID,
  ADD COLUMN IF NOT EXISTS "reimbursement_payment_reference" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "reimbursement_paid_at" TIMESTAMP(6);

CREATE INDEX IF NOT EXISTS "expense_claims_reimbursement_payroll_run_id_idx"
  ON "expense_claims"("reimbursement_payroll_run_id");
