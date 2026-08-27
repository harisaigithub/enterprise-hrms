-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PASSED', 'FAILED', 'LOCKED');

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contentModules" JSONB NOT NULL,
    "isCompliance" BOOLEAN NOT NULL DEFAULT false,
    "expiryMonths" INTEGER,
    "passThreshold" INTEGER NOT NULL DEFAULT 70,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_enrollments" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "employeeId" UUID NOT NULL,
    "employeeName" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER,
    "certifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_quiz_questions" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "course_quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_quiz_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionText" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "course_quiz_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_quiz_attempts" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_quiz_attempt_answers" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,

    CONSTRAINT "course_quiz_attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courses_status_idx" ON "courses"("status");

-- CreateIndex
CREATE INDEX "courses_isCompliance_idx" ON "courses"("isCompliance");

-- CreateIndex
CREATE INDEX "course_enrollments_employeeId_idx" ON "course_enrollments"("employeeId");

-- CreateIndex
CREATE INDEX "course_enrollments_courseId_idx" ON "course_enrollments"("courseId");

-- CreateIndex
CREATE INDEX "course_enrollments_status_idx" ON "course_enrollments"("status");

-- CreateIndex
CREATE INDEX "course_enrollments_expiresAt_idx" ON "course_enrollments"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollments_courseId_employeeId_key" ON "course_enrollments"("courseId", "employeeId");

-- CreateIndex
CREATE INDEX "course_quiz_questions_courseId_idx" ON "course_quiz_questions"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "course_quiz_questions_courseId_order_key" ON "course_quiz_questions"("courseId", "order");

-- CreateIndex
CREATE INDEX "course_quiz_options_questionId_idx" ON "course_quiz_options"("questionId");

-- CreateIndex
CREATE INDEX "course_quiz_attempts_enrollmentId_idx" ON "course_quiz_attempts"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "course_quiz_attempts_enrollmentId_attemptNumber_key" ON "course_quiz_attempts"("enrollmentId", "attemptNumber");

-- CreateIndex
CREATE INDEX "course_quiz_attempt_answers_attemptId_idx" ON "course_quiz_attempt_answers"("attemptId");

-- CreateIndex
CREATE INDEX "course_quiz_attempt_answers_questionId_idx" ON "course_quiz_attempt_answers"("questionId");

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_quiz_questions" ADD CONSTRAINT "course_quiz_questions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_quiz_options" ADD CONSTRAINT "course_quiz_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "course_quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_quiz_attempts" ADD CONSTRAINT "course_quiz_attempts_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "course_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_quiz_attempt_answers" ADD CONSTRAINT "course_quiz_attempt_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "course_quiz_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_quiz_attempt_answers" ADD CONSTRAINT "course_quiz_attempt_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "course_quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
