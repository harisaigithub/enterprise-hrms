CREATE TABLE "attendance_breaks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "employee_id" UUID NOT NULL,
  "break_type" VARCHAR(40) NOT NULL DEFAULT 'Short Break',
  "started_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at" TIMESTAMP(6),
  "duration_minutes" INTEGER,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attendance_breaks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "attendance_breaks_employee_id_started_at_idx"
  ON "attendance_breaks"("employee_id", "started_at");

-- Protect against double clicks/concurrent requests: an employee can have only one open break.
CREATE UNIQUE INDEX "attendance_breaks_one_active_per_employee_idx"
  ON "attendance_breaks"("employee_id")
  WHERE "ended_at" IS NULL;

ALTER TABLE "attendance_breaks"
  ADD CONSTRAINT "attendance_breaks_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
