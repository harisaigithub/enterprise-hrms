/*
  Warnings:

  - A unique constraint covering the columns `[verificationToken]` on the table `course_certificates` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `course_certificates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `verificationToken` to the `course_certificates` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('PENDING', 'GENERATED', 'ISSUED', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "course_certificates" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "downloadCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "generatedAt" TIMESTAMP(3),
ADD COLUMN     "pdfSha256" TEXT,
ADD COLUMN     "revokeReason" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "status" "CertificateStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "storageKey" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "verificationToken" TEXT NOT NULL,
ALTER COLUMN "issuedAt" DROP NOT NULL,
ALTER COLUMN "issuedAt" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "course_certificates_verificationToken_key" ON "course_certificates"("verificationToken");

-- CreateIndex
CREATE INDEX "course_certificates_verificationToken_idx" ON "course_certificates"("verificationToken");

-- CreateIndex
CREATE INDEX "course_certificates_status_idx" ON "course_certificates"("status");
