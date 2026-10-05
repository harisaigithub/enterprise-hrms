-- LWP support: ensure paid/unpaid flag exists and install Leave Without Pay.
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "is_paid" BOOLEAN NOT NULL DEFAULT true;

INSERT INTO "leave_types" ("name", "code", "default_annual_days", "carry_forward", "is_paid")
VALUES ('Leave Without Pay', 'LT07', 0, false, false)
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name",
    "default_annual_days" = EXCLUDED."default_annual_days",
    "carry_forward" = EXCLUDED."carry_forward",
    "is_paid" = false;
