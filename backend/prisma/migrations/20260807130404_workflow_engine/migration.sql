-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "is_department_head" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_type" VARCHAR(150) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_definition_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "definition_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "approver_rule" VARCHAR(80) NOT NULL,
    "sla_hours" INTEGER NOT NULL DEFAULT 24,
    "parallel_group" VARCHAR(20),
    "condition" JSONB,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "workflow_definition_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "definition_id" UUID NOT NULL,
    "requester_id" UUID NOT NULL,
    "attributes" JSONB NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'In Progress',
    "current_step_index" INTEGER NOT NULL DEFAULT 0,
    "resolution_failure" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instance_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "instance_id" UUID NOT NULL,
    "definition_step_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "approver_rule" VARCHAR(80) NOT NULL,
    "parallel_group" VARCHAR(20),
    "sla_hours" INTEGER NOT NULL,
    "approver_id" VARCHAR(80),
    "approver_name" VARCHAR(120),
    "self_approval_blocked" BOOLEAN NOT NULL DEFAULT false,
    "escalated_to" VARCHAR(80),
    "escalated_to_name" VARCHAR(120),
    "status" VARCHAR(20) NOT NULL DEFAULT 'Pending',
    "acted_by" VARCHAR(80),
    "acted_by_name" VARCHAR(120),
    "acted_at" TIMESTAMP(6),
    "rejection_reason" TEXT,
    "started_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_instance_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "instance_id" UUID NOT NULL,
    "type" VARCHAR(120) NOT NULL,
    "detail" TEXT NOT NULL,
    "actor_name" VARCHAR(120),
    "at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_definition_steps_definition_id_idx" ON "workflow_definition_steps"("definition_id");

-- CreateIndex
CREATE INDEX "workflow_instances_requester_id_idx" ON "workflow_instances"("requester_id");

-- CreateIndex
CREATE INDEX "workflow_instances_status_idx" ON "workflow_instances"("status");

-- CreateIndex
CREATE INDEX "workflow_instance_steps_instance_id_idx" ON "workflow_instance_steps"("instance_id");

-- CreateIndex
CREATE INDEX "workflow_events_instance_id_idx" ON "workflow_events"("instance_id");

-- CreateIndex
CREATE INDEX "workflow_events_at_idx" ON "workflow_events"("at");

-- AddForeignKey
ALTER TABLE "workflow_definition_steps" ADD CONSTRAINT "workflow_definition_steps_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instance_steps" ADD CONSTRAINT "workflow_instance_steps_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instance_steps" ADD CONSTRAINT "workflow_instance_steps_definition_step_id_fkey" FOREIGN KEY ("definition_step_id") REFERENCES "workflow_definition_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
