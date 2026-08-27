-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);

-- CreateEnum
CREATE TYPE "ChecklistItemStatus" AS ENUM (
    'Pending',
    'Complete',
    'Blocked',
    'Pending_Procurement'
);

-- CreateTable
CREATE TABLE "Onboarding" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "offerId" TEXT,
    "joinDate" TIMESTAMP(3) NOT NULL,
    "probationEndDate" TIMESTAMP(3) NOT NULL,
    "buddy" TEXT,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingChecklistItem" (
    "id" TEXT NOT NULL,
    "onboardingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ChecklistItemStatus" NOT NULL DEFAULT 'Pending',
    "dependsOn" TEXT,
    "blockedReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingChecklistItem_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "Onboarding_employeeId_key"
ON "Onboarding"("employeeId");

CREATE UNIQUE INDEX "Onboarding_offerId_key"
ON "Onboarding"("offerId");

CREATE INDEX "Onboarding_status_idx"
ON "Onboarding"("status");

CREATE INDEX "Onboarding_joinDate_idx"
ON "Onboarding"("joinDate");

CREATE INDEX "OnboardingChecklistItem_onboardingId_idx"
ON "OnboardingChecklistItem"("onboardingId");

CREATE INDEX "OnboardingChecklistItem_status_idx"
ON "OnboardingChecklistItem"("status");

CREATE INDEX "OnboardingChecklistItem_dependsOn_idx"
ON "OnboardingChecklistItem"("dependsOn");

-- Foreign Key
ALTER TABLE "OnboardingChecklistItem"
ADD CONSTRAINT "OnboardingChecklistItem_onboardingId_fkey"
FOREIGN KEY ("onboardingId")
REFERENCES "Onboarding"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;