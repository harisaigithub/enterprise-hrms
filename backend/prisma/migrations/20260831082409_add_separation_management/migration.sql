-- CreateTable
CREATE TABLE "separations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "reason" TEXT NOT NULL,
    "submitted_on" DATE NOT NULL,
    "last_working_day" DATE NOT NULL,
    "notice_period_days" INTEGER NOT NULL,
    "status" VARCHAR(40) NOT NULL DEFAULT 'Notice Period',
    "exit_interview_completed" BOOLEAN NOT NULL DEFAULT false,
    "access_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "separations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "separation_clearance_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "separation_id" UUID NOT NULL,
    "item" VARCHAR(150) NOT NULL,
    "owner" VARCHAR(100) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Pending',
    "notes" TEXT,
    "completed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "separation_clearance_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exit_interviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "separation_id" UUID NOT NULL,
    "responses" JSONB NOT NULL,
    "conducted_by" VARCHAR(100) NOT NULL,
    "conducted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exit_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "separation_settlements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "separation_id" UUID NOT NULL,
    "pending_salary" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "leave_encashment" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "reimbursements" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "recoveries" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "net_settlement" DECIMAL(15,2) NOT NULL,
    "override" BOOLEAN NOT NULL DEFAULT false,
    "override_reason" TEXT,
    "approved_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "separation_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alumni" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "separation_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "role" VARCHAR(100) NOT NULL,
    "tenure" VARCHAR(100) NOT NULL,
    "eligible_for_rehire" BOOLEAN NOT NULL DEFAULT true,
    "exited_on" DATE NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alumni_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "separations_employee_id_idx" ON "separations"("employee_id");

-- CreateIndex
CREATE INDEX "separations_status_idx" ON "separations"("status");

-- CreateIndex
CREATE INDEX "separation_clearance_items_separation_id_idx" ON "separation_clearance_items"("separation_id");

-- CreateIndex
CREATE INDEX "separation_clearance_items_status_idx" ON "separation_clearance_items"("status");

-- CreateIndex
CREATE UNIQUE INDEX "exit_interviews_separation_id_key" ON "exit_interviews"("separation_id");

-- CreateIndex
CREATE UNIQUE INDEX "separation_settlements_separation_id_key" ON "separation_settlements"("separation_id");

-- CreateIndex
CREATE UNIQUE INDEX "alumni_separation_id_key" ON "alumni"("separation_id");

-- CreateIndex
CREATE INDEX "alumni_employee_id_idx" ON "alumni"("employee_id");

-- AddForeignKey
ALTER TABLE "separations" ADD CONSTRAINT "separations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "separation_clearance_items" ADD CONSTRAINT "separation_clearance_items_separation_id_fkey" FOREIGN KEY ("separation_id") REFERENCES "separations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exit_interviews" ADD CONSTRAINT "exit_interviews_separation_id_fkey" FOREIGN KEY ("separation_id") REFERENCES "separations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "separation_settlements" ADD CONSTRAINT "separation_settlements_separation_id_fkey" FOREIGN KEY ("separation_id") REFERENCES "separations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni" ADD CONSTRAINT "alumni_separation_id_fkey" FOREIGN KEY ("separation_id") REFERENCES "separations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni" ADD CONSTRAINT "alumni_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
