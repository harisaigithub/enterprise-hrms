-- Attendance foundation: effective-dated shifts, daily canonical results,
-- payroll-period locking and LOP bridge.

DO $$ BEGIN
  CREATE TYPE "ShiftType" AS ENUM ('FIXED', 'FLEXIBLE', 'ROTATING', 'OVERNIGHT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PayrollPeriodState" AS ENUM ('OPEN', 'ATTENDANCE_FROZEN', 'LOCKED', 'PROCESSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "PayrollPeriodState" ADD VALUE IF NOT EXISTS 'ATTENDANCE_FROZEN';

ALTER TABLE "attendance_shifts"
  ADD COLUMN IF NOT EXISTS "shift_type" "ShiftType" NOT NULL DEFAULT 'FIXED',
  ADD COLUMN IF NOT EXISTS "required_minutes" INTEGER,
  ADD COLUMN IF NOT EXISTS "weekly_off_days" JSONB NOT NULL DEFAULT '[0,6]'::jsonb;

UPDATE "attendance_shifts"
SET "shift_type" = 'OVERNIGHT'
WHERE "end_time" < "start_time";

UPDATE "attendance_shifts"
SET "required_minutes" = GREATEST(
  0,
  CASE
    WHEN "end_time" >= "start_time" THEN EXTRACT(EPOCH FROM ("end_time" - "start_time")) / 60
    ELSE EXTRACT(EPOCH FROM (("end_time" + INTERVAL '24 hours') - "start_time")) / 60
  END - "break_duration_minutes"
)
WHERE "required_minutes" IS NULL;

CREATE TABLE IF NOT EXISTS "employee_shift_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "employee_id" UUID NOT NULL,
  "shift_id" UUID NOT NULL,
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_shift_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employee_shift_assignments_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "employee_shift_assignments_shift_id_fkey"
    FOREIGN KEY ("shift_id") REFERENCES "attendance_shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "employee_shift_assignments_dates_check"
    CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);
CREATE INDEX IF NOT EXISTS "employee_shift_assignments_employee_id_effective_from_idx"
  ON "employee_shift_assignments"("employee_id", "effective_from");

CREATE TABLE IF NOT EXISTS "attendance_days" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "employee_id" UUID NOT NULL,
  "date" DATE NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'ABSENT',
  "scheduled_hours" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
  "actual_hours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "shortfall_hours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "overtime_hours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "is_locked" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attendance_days_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "attendance_days_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "attendance_days_employee_id_date_key" UNIQUE ("employee_id", "date")
);
CREATE INDEX IF NOT EXISTS "attendance_days_date_idx" ON "attendance_days"("date");

CREATE TABLE IF NOT EXISTS "lop_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "employee_id" UUID NOT NULL,
  "date" DATE NOT NULL,
  "days_count" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "reason" TEXT NOT NULL,
  "payroll_run_id" UUID,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lop_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lop_entries_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "lop_entries_days_count_check" CHECK ("days_count" >= 0 AND "days_count" <= 1)
);
CREATE INDEX IF NOT EXISTS "lop_entries_employee_id_date_idx" ON "lop_entries"("employee_id", "date");

CREATE TABLE IF NOT EXISTS "payroll_periods" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "status" "PayrollPeriodState" NOT NULL DEFAULT 'OPEN',
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_periods_dates_check" CHECK ("end_date" >= "start_date")
);
CREATE INDEX IF NOT EXISTS "payroll_periods_date_range_idx" ON "payroll_periods"("start_date", "end_date");

-- Protect the most important shift assignment invariant in the application layer;
-- this index accelerates the overlap check.
CREATE INDEX IF NOT EXISTS "employee_shift_assignments_employee_id_effective_to_idx"
  ON "employee_shift_assignments"("employee_id", "effective_to");
