-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('IN_STOCK', 'ASSIGNED', 'MAINTENANCE', 'RETIRED', 'LOST');

-- CreateEnum
CREATE TYPE "AssetRequestStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'FULFILLED', 'PENDING_PROCUREMENT');

-- CreateEnum
CREATE TYPE "AssetReturnCondition" AS ENUM ('GOOD', 'DAMAGED');

-- CreateTable
CREATE TABLE "Asset" (
    "id" UUID NOT NULL,
    "serial" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'IN_STOCK',
    "currentHolderId" UUID,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "seats" INTEGER,
    "seatsUsed" INTEGER NOT NULL DEFAULT 0,
    "licenseExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetRequest" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "status" "AssetRequestStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "assetId" UUID,

    CONSTRAINT "AssetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetHistory" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "employeeId" UUID,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "condition" "AssetReturnCondition",
    "wipeCompleted" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_serial_key" ON "Asset"("serial");

-- CreateIndex
CREATE INDEX "Asset_currentHolderId_idx" ON "Asset"("currentHolderId");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_category_idx" ON "Asset"("category");

-- CreateIndex
CREATE INDEX "AssetRequest_employeeId_idx" ON "AssetRequest"("employeeId");

-- CreateIndex
CREATE INDEX "AssetRequest_status_idx" ON "AssetRequest"("status");

-- CreateIndex
CREATE INDEX "AssetRequest_assetId_idx" ON "AssetRequest"("assetId");

-- CreateIndex
CREATE INDEX "AssetHistory_assetId_idx" ON "AssetHistory"("assetId");

-- CreateIndex
CREATE INDEX "AssetHistory_employeeId_idx" ON "AssetHistory"("employeeId");

-- CreateIndex
CREATE INDEX "AssetHistory_createdAt_idx" ON "AssetHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_currentHolderId_fkey" FOREIGN KEY ("currentHolderId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetRequest" ADD CONSTRAINT "AssetRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetRequest" ADD CONSTRAINT "AssetRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetHistory" ADD CONSTRAINT "AssetHistory_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetHistory" ADD CONSTRAINT "AssetHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
