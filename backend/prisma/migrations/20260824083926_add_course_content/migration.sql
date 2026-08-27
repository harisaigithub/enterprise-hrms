-- CreateEnum
CREATE TYPE "CourseContentType" AS ENUM ('TEXT', 'PDF', 'VIDEO', 'LINK');

-- CreateTable
CREATE TABLE "course_contents" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "moduleName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "CourseContentType" NOT NULL,
    "content" TEXT,
    "fileUrl" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_contents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_contents_courseId_idx" ON "course_contents"("courseId");

-- CreateIndex
CREATE INDEX "course_contents_type_idx" ON "course_contents"("type");

-- CreateIndex
CREATE UNIQUE INDEX "course_contents_courseId_order_key" ON "course_contents"("courseId", "order");

-- AddForeignKey
ALTER TABLE "course_contents" ADD CONSTRAINT "course_contents_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
