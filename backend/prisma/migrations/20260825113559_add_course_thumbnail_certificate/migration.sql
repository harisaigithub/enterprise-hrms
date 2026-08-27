-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "thumbnailUrl" TEXT;

-- CreateTable
CREATE TABLE "course_certificates" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "certificateUrl" TEXT,

    CONSTRAINT "course_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_certificates_enrollmentId_key" ON "course_certificates"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "course_certificates_certificateNumber_key" ON "course_certificates"("certificateNumber");

-- CreateIndex
CREATE INDEX "course_certificates_certificateNumber_idx" ON "course_certificates"("certificateNumber");

-- AddForeignKey
ALTER TABLE "course_certificates" ADD CONSTRAINT "course_certificates_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "course_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
