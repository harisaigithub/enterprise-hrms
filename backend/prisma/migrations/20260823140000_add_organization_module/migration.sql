-- CreateTable
CREATE TABLE "business_units" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "business_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_centers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grades" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "field" VARCHAR(100) NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "actor_id" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CostCenterToDepartment" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_CostCenterToDepartment_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "business_units_company_id_idx"
ON "business_units"("company_id");

CREATE UNIQUE INDEX "business_units_company_id_name_key"
ON "business_units"("company_id", "name");

CREATE UNIQUE INDEX "cost_centers_code_key"
ON "cost_centers"("code");

CREATE UNIQUE INDEX "grades_code_key"
ON "grades"("code");

CREATE INDEX "organization_audit_logs_entity_type_entity_id_idx"
ON "organization_audit_logs"("entity_type", "entity_id");

CREATE INDEX "organization_audit_logs_actor_id_idx"
ON "organization_audit_logs"("actor_id");

CREATE INDEX "organization_audit_logs_created_at_idx"
ON "organization_audit_logs"("created_at");

CREATE INDEX "_CostCenterToDepartment_B_index"
ON "_CostCenterToDepartment"("B");

-- Department changes
ALTER TABLE "departments"
ADD COLUMN "business_unit_id" UUID NOT NULL,
ADD COLUMN "updated_at" TIMESTAMP(6) NOT NULL;

CREATE INDEX "departments_business_unit_id_idx"
ON "departments"("business_unit_id");

CREATE UNIQUE INDEX "departments_company_id_name_key"
ON "departments"("company_id", "name");

-- Foreign Keys
ALTER TABLE "business_units"
ADD CONSTRAINT "business_units_company_id_fkey"
FOREIGN KEY ("company_id")
REFERENCES "companies"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "departments"
ADD CONSTRAINT "departments_business_unit_id_fkey"
FOREIGN KEY ("business_unit_id")
REFERENCES "business_units"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "organization_audit_logs"
ADD CONSTRAINT "organization_audit_logs_actor_id_fkey"
FOREIGN KEY ("actor_id")
REFERENCES "employees"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "_CostCenterToDepartment"
ADD CONSTRAINT "_CostCenterToDepartment_A_fkey"
FOREIGN KEY ("A")
REFERENCES "cost_centers"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "_CostCenterToDepartment"
ADD CONSTRAINT "_CostCenterToDepartment_B_fkey"
FOREIGN KEY ("B")
REFERENCES "departments"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;