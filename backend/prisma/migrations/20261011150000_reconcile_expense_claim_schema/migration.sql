ALTER TABLE "expense_claims"
  ADD COLUMN IF NOT EXISTS "cost_center_id" UUID,
  ADD COLUMN IF NOT EXISTS "gst_amount" DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "gst_applicable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "gst_rate" DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "merchant_name" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "payment_method" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "project_id" UUID,
  ADD COLUMN IF NOT EXISTS "sent_back_at" TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS "sent_back_by" UUID,
  ADD COLUMN IF NOT EXISTS "sent_back_reason" TEXT;

CREATE INDEX IF NOT EXISTS "expense_claims_cost_center_id_idx"
  ON "expense_claims"("cost_center_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expense_claims_sent_back_by_fkey'
  ) THEN
    ALTER TABLE "expense_claims"
      ADD CONSTRAINT "expense_claims_sent_back_by_fkey"
      FOREIGN KEY ("sent_back_by") REFERENCES "employees"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expense_claims_cost_center_id_fkey'
  ) THEN
    ALTER TABLE "expense_claims"
      ADD CONSTRAINT "expense_claims_cost_center_id_fkey"
      FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
