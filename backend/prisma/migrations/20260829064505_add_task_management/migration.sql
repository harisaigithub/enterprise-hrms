-- CreateTable
CREATE TABLE "task_projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "task_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_project_members" (
    "project_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,

    CONSTRAINT "task_project_members_pkey" PRIMARY KEY ("project_id","employee_id")
);

-- CreateTable
CREATE TABLE "task_milestones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "due_date" DATE NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "task_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "milestone_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "assignee_id" UUID NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Todo',
    "priority" VARCHAR(20) NOT NULL DEFAULT 'Medium',
    "due_date" DATE NOT NULL,
    "force_closed" BOOLEAN NOT NULL DEFAULT false,
    "force_close_reason" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_dependencies" (
    "task_id" UUID NOT NULL,
    "blocker_id" UUID NOT NULL,

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("task_id","blocker_id")
);

-- CreateTable
CREATE TABLE "task_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "detail" TEXT,
    "actor_id" UUID,
    "actor_name" VARCHAR(120),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_time_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "hours" DECIMAL(6,2) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_projects_created_at_idx" ON "task_projects"("created_at");

-- CreateIndex
CREATE INDEX "task_project_members_employee_id_idx" ON "task_project_members"("employee_id");

-- CreateIndex
CREATE INDEX "task_milestones_project_id_idx" ON "task_milestones"("project_id");

-- CreateIndex
CREATE INDEX "task_milestones_due_date_idx" ON "task_milestones"("due_date");

-- CreateIndex
CREATE INDEX "tasks_project_id_idx" ON "tasks"("project_id");

-- CreateIndex
CREATE INDEX "tasks_milestone_id_idx" ON "tasks"("milestone_id");

-- CreateIndex
CREATE INDEX "tasks_assignee_id_idx" ON "tasks"("assignee_id");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_priority_idx" ON "tasks"("priority");

-- CreateIndex
CREATE INDEX "tasks_due_date_idx" ON "tasks"("due_date");

-- CreateIndex
CREATE INDEX "task_dependencies_blocker_id_idx" ON "task_dependencies"("blocker_id");

-- CreateIndex
CREATE INDEX "task_history_task_id_created_at_idx" ON "task_history"("task_id", "created_at");

-- CreateIndex
CREATE INDEX "task_history_actor_id_idx" ON "task_history"("actor_id");

-- CreateIndex
CREATE INDEX "task_time_entries_task_id_idx" ON "task_time_entries"("task_id");

-- CreateIndex
CREATE INDEX "task_time_entries_employee_id_idx" ON "task_time_entries"("employee_id");

-- CreateIndex
CREATE INDEX "task_time_entries_date_idx" ON "task_time_entries"("date");

-- AddForeignKey
ALTER TABLE "task_project_members" ADD CONSTRAINT "task_project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "task_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_project_members" ADD CONSTRAINT "task_project_members_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_milestones" ADD CONSTRAINT "task_milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "task_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "task_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "task_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_history" ADD CONSTRAINT "task_history_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_history" ADD CONSTRAINT "task_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_time_entries" ADD CONSTRAINT "task_time_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_time_entries" ADD CONSTRAINT "task_time_entries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
