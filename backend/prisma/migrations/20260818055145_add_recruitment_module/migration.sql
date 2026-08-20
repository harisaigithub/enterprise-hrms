-- CreateTable
CREATE TABLE "job_requisitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requisition_code" VARCHAR(30) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "department_id" UUID,
    "designation_id" UUID,
    "grade" VARCHAR(20),
    "openings" INTEGER NOT NULL DEFAULT 1,
    "salary_min" DECIMAL(12,2) NOT NULL,
    "salary_max" DECIMAL(12,2) NOT NULL,
    "justification" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Draft',
    "raised_by" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "locationId" UUID,

    CONSTRAINT "job_requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_code" VARCHAR(30) NOT NULL,
    "first_name" VARCHAR(80) NOT NULL,
    "last_name" VARCHAR(80),
    "email" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20),
    "resume_summary" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "requisition_id" UUID NOT NULL,
    "stage" VARCHAR(30) NOT NULL DEFAULT 'Applied',
    "rating" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "applied_on" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "round" VARCHAR(100) NOT NULL,
    "scheduled_at" TIMESTAMP(6) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Scheduled',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_panels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "interview_id" UUID NOT NULL,
    "interviewer_id" UUID NOT NULL,

    CONSTRAINT "interview_panels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_scorecards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "interview_id" UUID NOT NULL,
    "interviewer_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "notes" TEXT,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_scorecards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "proposed_salary" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(40) NOT NULL DEFAULT 'Draft',
    "consent_on_file" BOOLEAN NOT NULL DEFAULT false,
    "finance_override" BOOLEAN NOT NULL DEFAULT false,
    "override_reason" TEXT,
    "sent_at" DATE,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_requisitions_requisition_code_key" ON "job_requisitions"("requisition_code");

-- CreateIndex
CREATE INDEX "job_requisitions_department_id_idx" ON "job_requisitions"("department_id");

-- CreateIndex
CREATE INDEX "job_requisitions_status_idx" ON "job_requisitions"("status");

-- CreateIndex
CREATE INDEX "job_requisitions_raised_by_idx" ON "job_requisitions"("raised_by");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_candidate_code_key" ON "candidates"("candidate_code");

-- CreateIndex
CREATE INDEX "candidates_email_idx" ON "candidates"("email");

-- CreateIndex
CREATE INDEX "applications_candidate_id_idx" ON "applications"("candidate_id");

-- CreateIndex
CREATE INDEX "applications_requisition_id_idx" ON "applications"("requisition_id");

-- CreateIndex
CREATE INDEX "applications_stage_idx" ON "applications"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "applications_candidate_id_requisition_id_key" ON "applications"("candidate_id", "requisition_id");

-- CreateIndex
CREATE INDEX "interviews_application_id_idx" ON "interviews"("application_id");

-- CreateIndex
CREATE INDEX "interviews_scheduled_at_idx" ON "interviews"("scheduled_at");

-- CreateIndex
CREATE INDEX "interviews_status_idx" ON "interviews"("status");

-- CreateIndex
CREATE INDEX "interview_panels_interviewer_id_idx" ON "interview_panels"("interviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "interview_panels_interview_id_interviewer_id_key" ON "interview_panels"("interview_id", "interviewer_id");

-- CreateIndex
CREATE INDEX "interview_scorecards_interviewer_id_idx" ON "interview_scorecards"("interviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "interview_scorecards_interview_id_interviewer_id_key" ON "interview_scorecards"("interview_id", "interviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "offers_application_id_key" ON "offers"("application_id");

-- CreateIndex
CREATE INDEX "offers_status_idx" ON "offers"("status");

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_raised_by_fkey" FOREIGN KEY ("raised_by") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "job_requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_panels" ADD CONSTRAINT "interview_panels_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_panels" ADD CONSTRAINT "interview_panels_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_scorecards" ADD CONSTRAINT "interview_scorecards_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_scorecards" ADD CONSTRAINT "interview_scorecards_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
