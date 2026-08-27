-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "versionGroupId" TEXT;

-- CreateIndex
CREATE INDEX "courses_versionGroupId_idx" ON "courses"("versionGroupId");
