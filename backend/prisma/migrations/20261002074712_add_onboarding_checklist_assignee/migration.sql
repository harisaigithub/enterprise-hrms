-- AlterTable
ALTER TABLE "OnboardingChecklistItem" ADD COLUMN     "assignedToId" UUID;

-- AlterTable
ALTER TABLE "attendance_regularizations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ess_tax_declarations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "expense_claims" ADD COLUMN     "cost_center_id" UUID,
ADD COLUMN     "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
ADD COLUMN     "gst_amount" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "gst_applicable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gst_rate" DECIMAL(5,2) DEFAULT 0,
ADD COLUMN     "merchant_name" VARCHAR(200),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "payment_method" VARCHAR(30),
ADD COLUMN     "project_id" UUID,
ADD COLUMN     "sent_back_at" TIMESTAMP(6),
ADD COLUMN     "sent_back_by" UUID,
ADD COLUMN     "sent_back_reason" TEXT;

-- AlterTable
ALTER TABLE "security_state" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "travel_requests" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "OnboardingChecklistItem_assignedToId_idx" ON "OnboardingChecklistItem"("assignedToId");

-- CreateIndex
CREATE INDEX "expense_claims_cost_center_id_idx" ON "expense_claims"("cost_center_id");

-- AddForeignKey
ALTER TABLE "OnboardingChecklistItem" ADD CONSTRAINT "OnboardingChecklistItem_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_sent_back_by_fkey" FOREIGN KEY ("sent_back_by") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "attendance_regularization_history_regularization_id_created_at_" RENAME TO "attendance_regularization_history_regularization_id_created_idx";
