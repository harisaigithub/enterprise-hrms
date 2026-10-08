-- CreateEnum
CREATE TYPE "BGVCaseStatus" AS ENUM ('DRAFT', 'INITIATED', 'CANDIDATE_ACTION_REQUIRED', 'IN_PROGRESS', 'UNDER_REVIEW', 'DISCREPANCY', 'ESCALATED', 'CLEARED', 'CONCERN', 'UNABLE_TO_VERIFY', 'ON_HOLD', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BGVPriority" AS ENUM ('NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BGVVerificationType" AS ENUM ('IDENTITY', 'ADDRESS', 'EMPLOYMENT', 'EDUCATION', 'CRIMINAL', 'REFERENCE', 'DOCUMENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BGVVerificationStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'CANDIDATE_ACTION_REQUIRED', 'SUBMITTED', 'UNDER_REVIEW', 'COMPLETED', 'DISCREPANCY', 'FAILED', 'UNABLE_TO_VERIFY', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BGVVerificationResult" AS ENUM ('CLEAR', 'CONCERN', 'DISCREPANCY', 'FAILED', 'UNABLE_TO_VERIFY');

-- CreateEnum
CREATE TYPE "BGVDiscrepancyLevel" AS ENUM ('MINOR', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BGVDiscrepancyStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BGVDocumentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BGVReviewDecision" AS ENUM ('APPROVE', 'REJECT', 'REQUEST_MORE_INFORMATION', 'ESCALATE');

-- CreateEnum
CREATE TYPE "BGVFinalResult" AS ENUM ('CLEARED', 'CLEARED_WITH_DISCREPANCY', 'CONCERN', 'UNABLE_TO_VERIFY', 'EXCEPTION', 'REJECTED');

-- CreateEnum
CREATE TYPE "BGVFinalDecision" AS ENUM ('PROCEED', 'HOLD', 'ESCALATE', 'CLOSE');

-- CreateTable
CREATE TABLE "BGVCase" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidateId" UUID,
    "employeeId" UUID,
    "applicationId" UUID,
    "packageId" UUID,
    "assignedVerifierId" UUID,
    "vendorId" UUID,
    "status" "BGVCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "BGVPriority" NOT NULL DEFAULT 'NORMAL',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "blocking" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "finalResult" "BGVFinalResult",
    "finalDecision" "BGVFinalDecision",
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "reviewRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BGVCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BGVVerification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caseId" UUID NOT NULL,
    "assignedToId" UUID,
    "vendorId" UUID,
    "type" "BGVVerificationType" NOT NULL,
    "status" "BGVVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "source" TEXT,
    "startedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "result" "BGVVerificationResult",
    "discrepancyLevel" "BGVDiscrepancyLevel",
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BGVVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BGVDiscrepancy" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caseId" UUID NOT NULL,
    "verificationId" UUID,
    "raisedById" UUID NOT NULL,
    "resolvedById" UUID,
    "level" "BGVDiscrepancyLevel" NOT NULL,
    "fieldName" TEXT,
    "expectedValue" TEXT,
    "actualValue" TEXT,
    "description" TEXT NOT NULL,
    "status" "BGVDiscrepancyStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BGVDiscrepancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BGVDocument" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caseId" UUID NOT NULL,
    "verificationId" UUID,
    "uploadedById" UUID NOT NULL,
    "verifiedById" UUID,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationStatus" "BGVDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BGVDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BGVPackage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BGVPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BGVPackageCheck" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "packageId" UUID NOT NULL,
    "type" "BGVVerificationType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "blocking" BOOLEAN NOT NULL DEFAULT false,
    "slaHours" INTEGER,

    CONSTRAINT "BGVPackageCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BGVVendor" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "apiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "apiBaseUrl" TEXT,
    "defaultSlaHours" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BGVVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BGVReview" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caseId" UUID NOT NULL,
    "reviewerId" UUID NOT NULL,
    "decision" "BGVReviewDecision" NOT NULL,
    "remarks" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BGVReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BGVAudit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caseId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BGVAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BGVAssignmentHistory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caseId" UUID NOT NULL,
    "assignedToId" UUID,
    "vendorId" UUID,
    "assignedById" UUID NOT NULL,
    "reason" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "BGVAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BGVStatusHistory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caseId" UUID NOT NULL,
    "changedById" UUID,
    "fromStatus" "BGVCaseStatus",
    "toStatus" "BGVCaseStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BGVStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BGVCase_candidateId_idx" ON "BGVCase"("candidateId");

-- CreateIndex
CREATE INDEX "BGVCase_employeeId_idx" ON "BGVCase"("employeeId");

-- CreateIndex
CREATE INDEX "BGVCase_applicationId_idx" ON "BGVCase"("applicationId");

-- CreateIndex
CREATE INDEX "BGVCase_status_idx" ON "BGVCase"("status");

-- CreateIndex
CREATE INDEX "BGVCase_assignedVerifierId_idx" ON "BGVCase"("assignedVerifierId");

-- CreateIndex
CREATE INDEX "BGVCase_vendorId_idx" ON "BGVCase"("vendorId");

-- CreateIndex
CREATE INDEX "BGVCase_dueAt_idx" ON "BGVCase"("dueAt");

-- CreateIndex
CREATE INDEX "BGVVerification_caseId_idx" ON "BGVVerification"("caseId");

-- CreateIndex
CREATE INDEX "BGVVerification_type_idx" ON "BGVVerification"("type");

-- CreateIndex
CREATE INDEX "BGVVerification_status_idx" ON "BGVVerification"("status");

-- CreateIndex
CREATE INDEX "BGVVerification_assignedToId_idx" ON "BGVVerification"("assignedToId");

-- CreateIndex
CREATE INDEX "BGVDiscrepancy_caseId_idx" ON "BGVDiscrepancy"("caseId");

-- CreateIndex
CREATE INDEX "BGVDiscrepancy_verificationId_idx" ON "BGVDiscrepancy"("verificationId");

-- CreateIndex
CREATE INDEX "BGVDiscrepancy_status_idx" ON "BGVDiscrepancy"("status");

-- CreateIndex
CREATE INDEX "BGVDocument_caseId_idx" ON "BGVDocument"("caseId");

-- CreateIndex
CREATE INDEX "BGVDocument_verificationId_idx" ON "BGVDocument"("verificationId");

-- CreateIndex
CREATE INDEX "BGVDocument_verificationStatus_idx" ON "BGVDocument"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "BGVPackageCheck_packageId_type_key" ON "BGVPackageCheck"("packageId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "BGVVendor_code_key" ON "BGVVendor"("code");

-- CreateIndex
CREATE INDEX "BGVReview_caseId_idx" ON "BGVReview"("caseId");

-- CreateIndex
CREATE INDEX "BGVReview_reviewerId_idx" ON "BGVReview"("reviewerId");

-- CreateIndex
CREATE INDEX "BGVAudit_caseId_idx" ON "BGVAudit"("caseId");

-- CreateIndex
CREATE INDEX "BGVAudit_actorId_idx" ON "BGVAudit"("actorId");

-- CreateIndex
CREATE INDEX "BGVAudit_createdAt_idx" ON "BGVAudit"("createdAt");

-- CreateIndex
CREATE INDEX "BGVAssignmentHistory_caseId_idx" ON "BGVAssignmentHistory"("caseId");

-- CreateIndex
CREATE INDEX "BGVStatusHistory_caseId_idx" ON "BGVStatusHistory"("caseId");

-- AddForeignKey
ALTER TABLE "BGVCase" ADD CONSTRAINT "BGVCase_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVCase" ADD CONSTRAINT "BGVCase_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVCase" ADD CONSTRAINT "BGVCase_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVCase" ADD CONSTRAINT "BGVCase_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "BGVPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVCase" ADD CONSTRAINT "BGVCase_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "BGVVendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVCase" ADD CONSTRAINT "BGVCase_assignedVerifierId_fkey" FOREIGN KEY ("assignedVerifierId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVCase" ADD CONSTRAINT "BGVCase_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVVerification" ADD CONSTRAINT "BGVVerification_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "BGVCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVVerification" ADD CONSTRAINT "BGVVerification_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVVerification" ADD CONSTRAINT "BGVVerification_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "BGVVendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVDiscrepancy" ADD CONSTRAINT "BGVDiscrepancy_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "BGVCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVDiscrepancy" ADD CONSTRAINT "BGVDiscrepancy_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "BGVVerification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVDiscrepancy" ADD CONSTRAINT "BGVDiscrepancy_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVDiscrepancy" ADD CONSTRAINT "BGVDiscrepancy_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVDocument" ADD CONSTRAINT "BGVDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "BGVCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVDocument" ADD CONSTRAINT "BGVDocument_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "BGVVerification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVDocument" ADD CONSTRAINT "BGVDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVDocument" ADD CONSTRAINT "BGVDocument_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVPackageCheck" ADD CONSTRAINT "BGVPackageCheck_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "BGVPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVReview" ADD CONSTRAINT "BGVReview_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "BGVCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVReview" ADD CONSTRAINT "BGVReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVAudit" ADD CONSTRAINT "BGVAudit_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "BGVCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVAudit" ADD CONSTRAINT "BGVAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVAssignmentHistory" ADD CONSTRAINT "BGVAssignmentHistory_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "BGVCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVAssignmentHistory" ADD CONSTRAINT "BGVAssignmentHistory_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVAssignmentHistory" ADD CONSTRAINT "BGVAssignmentHistory_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "BGVVendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVAssignmentHistory" ADD CONSTRAINT "BGVAssignmentHistory_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVStatusHistory" ADD CONSTRAINT "BGVStatusHistory_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "BGVCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BGVStatusHistory" ADD CONSTRAINT "BGVStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
