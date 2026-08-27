-- CreateEnum
CREATE TYPE "CourseContentProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "course_content_progress" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "status" "CourseContentProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_content_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_content_progress_enrollmentId_idx" ON "course_content_progress"("enrollmentId");

-- CreateIndex
CREATE INDEX "course_content_progress_contentId_idx" ON "course_content_progress"("contentId");

-- CreateIndex
CREATE UNIQUE INDEX "course_content_progress_enrollmentId_contentId_key" ON "course_content_progress"("enrollmentId", "contentId");

-- AddForeignKey
ALTER TABLE "course_content_progress" ADD CONSTRAINT "course_content_progress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "course_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
