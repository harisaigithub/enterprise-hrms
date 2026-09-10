-- CreateEnum
CREATE TYPE "ExpenseClaimStatus" AS ENUM ('Draft', 'Submitted', 'ManagerApproved', 'FinanceApproved', 'ApprovedForReimbursement', 'QueuedForPayroll', 'Rejected', 'Corrected');

-- CreateEnum
CREATE TYPE "ExpenseCorrectionType" AS ENUM ('Amount', 'Category', 'Date', 'Receipt', 'FullReplacement');

-- CreateEnum
CREATE TYPE "ExpenseCorrectingEntryStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Applied');

-- CreateTable
CREATE TABLE "expense_policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category" VARCHAR(50) NOT NULL,
    "limit_amount" DECIMAL(12,2) NOT NULL,
    "receipt_threshold" DECIMAL(12,2) NOT NULL,
    "submission_window_days" INTEGER NOT NULL DEFAULT 60,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT now(),

    CONSTRAINT "expense_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_policies_category_key" ON "expense_policies"("category");

-- CreateTable
CREATE TABLE "expense_claims" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "claim_number" VARCHAR(30) NOT NULL,
    "employee_id" UUID NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "expense_date" DATE NOT NULL,
    "business_purpose" TEXT NOT NULL,
    "status" VARCHAR(40) NOT NULL DEFAULT 'Draft',
    "approval_stage" VARCHAR(30),
    "submitted_at" TIMESTAMP(6),
    "manager_approved_at" TIMESTAMP(6),
    "finance_approved_at" TIMESTAMP(6),
    "approved_for_reimbursement_at" TIMESTAMP(6),
    "queued_for_payroll_at" TIMESTAMP(6),
    "rejected_at" TIMESTAMP(6),
    "rejection_reason" TEXT,
    "rejected_by" UUID,
    "policy_violations" JSONB NOT NULL DEFAULT '[]',
    "duplicate_warning" JSONB,
    "is_draft" BOOLEAN NOT NULL DEFAULT true,
    "receipt_pending" BOOLEAN NOT NULL DEFAULT false,
    "is_immutable" BOOLEAN NOT NULL DEFAULT false,
    "correcting_entry_id" UUID,
    "original_claim_id" UUID,
    "workflow_instance_id" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT now(),

    CONSTRAINT "expense_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_claims_claim_number_key" ON "expense_claims"("claim_number");

-- CreateIndex
CREATE INDEX "expense_claims_employee_id_idx" ON "expense_claims"("employee_id");

-- CreateIndex
CREATE INDEX "expense_claims_status_idx" ON "expense_claims"("status");

-- CreateIndex
CREATE INDEX "expense_claims_approval_stage_idx" ON "expense_claims"("approval_stage");

-- CreateIndex
CREATE INDEX "expense_claims_expense_date_idx" ON "expense_claims"("expense_date");

-- CreateTable
CREATE TABLE "expense_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "claim_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "minio_object_name" VARCHAR(500) NOT NULL,
    "file_hash" VARCHAR(64) NOT NULL,
    "perceptual_hash" VARCHAR(64),
    "uploaded_at" TIMESTAMP(6) NOT NULL DEFAULT now(),
    "uploaded_by" UUID NOT NULL,

    CONSTRAINT "expense_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_receipts_claim_id_idx" ON "expense_receipts"("claim_id");

-- CreateIndex
CREATE INDEX "expense_receipts_file_hash_idx" ON "expense_receipts"("file_hash");

-- CreateIndex
CREATE INDEX "expense_receipts_perceptual_hash_idx" ON "expense_receipts"("perceptual_hash");

-- CreateTable
CREATE TABLE "expense_correcting_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entry_number" VARCHAR(30) NOT NULL,
    "original_claim_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "correction_type" VARCHAR(30) NOT NULL,
    "adjusted_amount" DECIMAL(12,2),
    "status" VARCHAR(30) NOT NULL DEFAULT 'Pending',
    "created_by" UUID NOT NULL,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(6),
    "applied_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT now(),

    CONSTRAINT "expense_correcting_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_correcting_entries_entry_number_key" ON "expense_correcting_entries"("entry_number");

-- CreateIndex
CREATE INDEX "expense_correcting_entries_original_claim_id_idx" ON "expense_correcting_entries"("original_claim_id");

-- CreateIndex
CREATE INDEX "expense_correcting_entries_status_idx" ON "expense_correcting_entries"("status");

-- CreateTable
CREATE TABLE "expense_claim_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "claim_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "actor_id" UUID NOT NULL,
    "actor_name" VARCHAR(120) NOT NULL,
    "old_status" VARCHAR(40),
    "new_status" VARCHAR(40),
    "details" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT now(),

    CONSTRAINT "expense_claim_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_claim_history_claim_id_created_at_idx" ON "expense_claim_history"("claim_id", "created_at");

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_correcting_entry_id_fkey" FOREIGN KEY ("correcting_entry_id") REFERENCES "expense_correcting_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_original_claim_id_fkey" FOREIGN KEY ("original_claim_id") REFERENCES "expense_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_receipts" ADD CONSTRAINT "expense_receipts_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "expense_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_correcting_entries" ADD CONSTRAINT "expense_correcting_entries_original_claim_id_fkey" FOREIGN KEY ("original_claim_id") REFERENCES "expense_claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_correcting_entries" ADD CONSTRAINT "expense_correcting_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_correcting_entries" ADD CONSTRAINT "expense_correcting_entries_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claim_history" ADD CONSTRAINT "expense_claim_history_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "expense_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claim_history" ADD CONSTRAINT "expense_claim_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
