-- AlterTable
ALTER TABLE "task_projects" ADD COLUMN     "description" TEXT,
ADD COLUMN     "project_lead_id" UUID,
ADD COLUMN     "start_date" DATE,
ADD COLUMN     "target_end_date" DATE;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "comments" TEXT;

-- AddForeignKey
ALTER TABLE "task_projects" ADD CONSTRAINT "task_projects_project_lead_id_fkey" FOREIGN KEY ("project_lead_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
