CREATE TABLE IF NOT EXISTS "payroll_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(120) NOT NULL,
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "standard_hours_per_day" DECIMAL(5,2) NOT NULL DEFAULT 8,
  "overtime_multiplier" DECIMAL(5,2) NOT NULL DEFAULT 1.5,
  "holiday_work_multiplier" DECIMAL(5,2) NOT NULL DEFAULT 2,
  "gratuity_service_years" INTEGER NOT NULL DEFAULT 5,
  "gratuity_days" DECIMAL(5,2) NOT NULL DEFAULT 15,
  "gratuity_divisor" DECIMAL(5,2) NOT NULL DEFAULT 26,
  "tax_regime" VARCHAR(20) NOT NULL DEFAULT 'NEW',
  "financial_year" VARCHAR(20) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_policies_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "payroll_policies_effective_from_effective_to_idx" ON "payroll_policies"("effective_from", "effective_to");
CREATE INDEX IF NOT EXISTS "payroll_policies_is_active_idx" ON "payroll_policies"("is_active");

CREATE TABLE IF NOT EXISTS "statutory_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "rule_type" VARCHAR(40) NOT NULL,
  "country" VARCHAR(100) NOT NULL DEFAULT 'India',
  "state" VARCHAR(100),
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "config" JSONB NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "statutory_rules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "statutory_rules_rule_type_state_effective_from_idx" ON "statutory_rules"("rule_type", "state", "effective_from");
CREATE INDEX IF NOT EXISTS "statutory_rules_is_active_idx" ON "statutory_rules"("is_active");

-- Safe baseline policy. Statutory state rules are intentionally NOT seeded with legal rates;
-- HR/payroll must configure the applicable effective-dated rules for the organisation.
INSERT INTO "payroll_policies" (
  "name", "effective_from", "financial_year", "standard_hours_per_day",
  "overtime_multiplier", "holiday_work_multiplier", "tax_regime"
)
SELECT 'Default India Payroll Policy', DATE '2026-04-01', '2026-27', 8, 1.5, 2, 'NEW'
WHERE NOT EXISTS (SELECT 1 FROM "payroll_policies");
