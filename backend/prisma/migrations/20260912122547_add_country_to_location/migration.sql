/*
  Warnings:

  - You are about to alter the column `bank_name` on the `employees` table. The data in that column could be lost. The data in that column will be cast from `VarChar(120)` to `VarChar(100)`.
  - A unique constraint covering the columns `[correcting_entry_id]` on the table `expense_claims` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "attendance_punches" ADD COLUMN     "actual_hours" DECIMAL(5,2),
ADD COLUMN     "is_overtime_approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overtime_hours" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "scheduled_hours" DECIMAL(5,2),
ALTER COLUMN "status" SET DATA TYPE VARCHAR(30);

-- AlterTable
ALTER TABLE "attendance_shifts" ADD COLUMN     "break_duration_minutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "grace_period_minutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "overtime_threshold_hours" DECIMAL(4,2) NOT NULL DEFAULT 8.0;

-- AlterTable
ALTER TABLE "designations" ADD COLUMN     "department_id" UUID,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "level" VARCHAR(20) DEFAULT 'L3';

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "actual_confirmation_date" DATE,
ADD COLUMN     "alternate_mobile" VARCHAR(20),
ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "bank_account_number" VARCHAR(50),
ADD COLUMN     "bank_ifsc" VARCHAR(30),
ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "confirmation_extension_reason" TEXT,
ADD COLUMN     "confirmation_status" VARCHAR(30) NOT NULL DEFAULT 'PROBATION',
ADD COLUMN     "country" VARCHAR(100) DEFAULT 'India',
ADD COLUMN     "expected_confirmation_date" DATE,
ADD COLUMN     "guardian_name" VARCHAR(120),
ADD COLUMN     "guardian_phone" VARCHAR(30),
ADD COLUMN     "is_soft_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "middle_name" VARCHAR(80),
ADD COLUMN     "notice_period_days" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "pan_number" VARCHAR(30),
ADD COLUMN     "probation_period_months" INTEGER DEFAULT 6,
ADD COLUMN     "shift_id" UUID,
ADD COLUMN     "state" VARCHAR(100),
ALTER COLUMN "bank_name" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "expense_claims" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "expense_correcting_entries" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "expense_policies" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "country" VARCHAR(100) NOT NULL DEFAULT 'India',
ADD COLUMN     "postal_code" VARCHAR(20),
ADD COLUMN     "state" VARCHAR(100);

-- DropEnum
DROP TYPE "ExpenseClaimStatus";

-- DropEnum
DROP TYPE "ExpenseCorrectingEntryStatus";

-- DropEnum
DROP TYPE "ExpenseCorrectionType";

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "document_type" VARCHAR(60) NOT NULL,
    "document_number" VARCHAR(100),
    "category" VARCHAR(60) NOT NULL DEFAULT 'Other',
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" VARCHAR(100),
    "uploaded_by" VARCHAR(100),
    "verification_status" VARCHAR(30) NOT NULL DEFAULT 'Pending',
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "rejected_by_id" UUID,
    "rejected_at" TIMESTAMP(6),
    "verified_by_id" UUID,
    "verified_at" TIMESTAMP(6),
    "issue_date" DATE,
    "expiry_date" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_emergency_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "relationship" VARCHAR(50) NOT NULL,
    "primary_phone" VARCHAR(30) NOT NULL,
    "alternate_phone" VARCHAR(30),
    "address" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "movement_type" VARCHAR(30) NOT NULL,
    "old_department_id" UUID,
    "new_department_id" UUID,
    "old_designation_id" UUID,
    "new_designation_id" UUID,
    "old_level" VARCHAR(20),
    "new_level" VARCHAR(20),
    "old_salary" DECIMAL(15,2),
    "new_salary" DECIMAL(15,2),
    "old_manager_id" UUID,
    "new_manager_id" UUID,
    "old_status" VARCHAR(30),
    "new_status" VARCHAR(30),
    "effective_date" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "requested_by_id" UUID,
    "approved_by_id" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "date" DATE NOT NULL,
    "location_id" UUID,
    "year" INTEGER NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_regularizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "original_status" VARCHAR(30) NOT NULL,
    "requested_status" VARCHAR(30) NOT NULL,
    "requested_punch_in" TIMESTAMP(6),
    "requested_punch_out" TIMESTAMP(6),
    "reason" TEXT NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Pending',
    "approver_id" UUID,
    "decision_notes" TEXT,
    "decided_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_regularizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "request_type" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Pending',
    "reason" TEXT,
    "approver_id" UUID,
    "decision_notes" TEXT,
    "decided_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "employee_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_documents_employee_id_idx" ON "employee_documents"("employee_id");

-- CreateIndex
CREATE INDEX "employee_documents_category_idx" ON "employee_documents"("category");

-- CreateIndex
CREATE INDEX "employee_documents_status_idx" ON "employee_documents"("status");

-- CreateIndex
CREATE INDEX "employee_emergency_contacts_employee_id_idx" ON "employee_emergency_contacts"("employee_id");

-- CreateIndex
CREATE INDEX "employee_movements_employee_id_idx" ON "employee_movements"("employee_id");

-- CreateIndex
CREATE INDEX "employee_movements_effective_date_idx" ON "employee_movements"("effective_date");

-- CreateIndex
CREATE INDEX "holidays_location_id_idx" ON "holidays"("location_id");

-- CreateIndex
CREATE INDEX "holidays_date_idx" ON "holidays"("date");

-- CreateIndex
CREATE INDEX "attendance_regularizations_employee_id_idx" ON "attendance_regularizations"("employee_id");

-- CreateIndex
CREATE INDEX "attendance_regularizations_date_idx" ON "attendance_regularizations"("date");

-- CreateIndex
CREATE INDEX "employee_requests_employee_id_idx" ON "employee_requests"("employee_id");

-- CreateIndex
CREATE INDEX "employee_requests_request_type_status_idx" ON "employee_requests"("request_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "expense_claims_correcting_entry_id_key" ON "expense_claims"("correcting_entry_id");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "attendance_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_emergency_contacts" ADD CONSTRAINT "employee_emergency_contacts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_movements" ADD CONSTRAINT "employee_movements_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_regularizations" ADD CONSTRAINT "attendance_regularizations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_requests" ADD CONSTRAINT "employee_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
