-- CreateTable
CREATE TABLE "performance_review_cycles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "cycle_code" VARCHAR(30) NOT NULL,
    "phase" VARCHAR(30) NOT NULL DEFAULT 'Goal Setting',
    "goal_setting_start" DATE NOT NULL,
    "goal_setting_end" DATE NOT NULL,
    "self_assessment_start" DATE NOT NULL,
    "self_assessment_end" DATE NOT NULL,
    "manager_review_start" DATE NOT NULL,
    "manager_review_end" DATE NOT NULL,
    "is_360_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_review_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_goals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "review_cycle_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Pending Approval',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_key_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "goal_id" UUID NOT NULL,
    "text" VARCHAR(255) NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_key_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "review_cycle_id" UUID NOT NULL,
    "review_type" VARCHAR(30) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'Draft',
    "submitted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_review_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "review_id" UUID NOT NULL,
    "goal_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comments" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_review_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_feedbacks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "from_employee_id" UUID NOT NULL,
    "to_employee_id" UUID NOT NULL,
    "goal_tag" VARCHAR(255),
    "type" VARCHAR(30) NOT NULL DEFAULT 'General',
    "message" TEXT NOT NULL,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_one_on_ones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "manager_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_one_on_ones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_one_on_one_agendas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "one_on_one_id" UUID NOT NULL,
    "item_text" VARCHAR(255) NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "performance_one_on_one_agendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_one_on_one_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "one_on_one_id" UUID NOT NULL,
    "text" VARCHAR(255) NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_one_on_one_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_ratings_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "review_cycle_id" UUID NOT NULL,
    "cycle_name" VARCHAR(100) NOT NULL,
    "self_rating" INTEGER NOT NULL,
    "original_manager_rating" INTEGER NOT NULL,
    "final_rating" INTEGER NOT NULL,
    "calibration_adjusted" BOOLEAN NOT NULL DEFAULT false,
    "increment" VARCHAR(20) NOT NULL,
    "promotion" BOOLEAN NOT NULL DEFAULT false,
    "appraisal_letter_url" VARCHAR(255),
    "released_on" DATE NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_ratings_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "performance_review_cycles_cycle_code_key" ON "performance_review_cycles"("cycle_code");

-- CreateIndex
CREATE INDEX "performance_goals_employee_id_idx" ON "performance_goals"("employee_id");

-- CreateIndex
CREATE INDEX "performance_goals_review_cycle_id_idx" ON "performance_goals"("review_cycle_id");

-- CreateIndex
CREATE INDEX "performance_key_results_goal_id_idx" ON "performance_key_results"("goal_id");

-- CreateIndex
CREATE INDEX "performance_reviews_employee_id_idx" ON "performance_reviews"("employee_id");

-- CreateIndex
CREATE INDEX "performance_reviews_reviewer_id_idx" ON "performance_reviews"("reviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "performance_reviews_employee_id_reviewer_id_review_cycle_id_key" ON "performance_reviews"("employee_id", "reviewer_id", "review_cycle_id", "review_type");

-- CreateIndex
CREATE UNIQUE INDEX "performance_review_items_review_id_goal_id_key" ON "performance_review_items"("review_id", "goal_id");

-- CreateIndex
CREATE INDEX "performance_feedbacks_from_employee_id_idx" ON "performance_feedbacks"("from_employee_id");

-- CreateIndex
CREATE INDEX "performance_feedbacks_to_employee_id_idx" ON "performance_feedbacks"("to_employee_id");

-- CreateIndex
CREATE INDEX "performance_one_on_ones_employee_id_idx" ON "performance_one_on_ones"("employee_id");

-- CreateIndex
CREATE INDEX "performance_one_on_ones_manager_id_idx" ON "performance_one_on_ones"("manager_id");

-- CreateIndex
CREATE INDEX "performance_one_on_one_agendas_one_on_one_id_idx" ON "performance_one_on_one_agendas"("one_on_one_id");

-- CreateIndex
CREATE INDEX "performance_one_on_one_actions_one_on_one_id_idx" ON "performance_one_on_one_actions"("one_on_one_id");

-- CreateIndex
CREATE INDEX "performance_ratings_history_employee_id_idx" ON "performance_ratings_history"("employee_id");

-- AddForeignKey
ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_review_cycle_id_fkey" FOREIGN KEY ("review_cycle_id") REFERENCES "performance_review_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_key_results" ADD CONSTRAINT "performance_key_results_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "performance_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_review_cycle_id_fkey" FOREIGN KEY ("review_cycle_id") REFERENCES "performance_review_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_review_items" ADD CONSTRAINT "performance_review_items_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "performance_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_review_items" ADD CONSTRAINT "performance_review_items_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "performance_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_feedbacks" ADD CONSTRAINT "performance_feedbacks_from_employee_id_fkey" FOREIGN KEY ("from_employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_feedbacks" ADD CONSTRAINT "performance_feedbacks_to_employee_id_fkey" FOREIGN KEY ("to_employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_one_on_ones" ADD CONSTRAINT "performance_one_on_ones_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_one_on_ones" ADD CONSTRAINT "performance_one_on_ones_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_one_on_one_agendas" ADD CONSTRAINT "performance_one_on_one_agendas_one_on_one_id_fkey" FOREIGN KEY ("one_on_one_id") REFERENCES "performance_one_on_ones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_one_on_one_actions" ADD CONSTRAINT "performance_one_on_one_actions_one_on_one_id_fkey" FOREIGN KEY ("one_on_one_id") REFERENCES "performance_one_on_ones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_ratings_history" ADD CONSTRAINT "performance_ratings_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_ratings_history" ADD CONSTRAINT "performance_ratings_history_review_cycle_id_fkey" FOREIGN KEY ("review_cycle_id") REFERENCES "performance_review_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
