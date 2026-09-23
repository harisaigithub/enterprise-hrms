-- Backfill the payment history only for Paid claims whose payment persistence
-- succeeded before the original request failed while writing its history row.
INSERT INTO "expense_claim_history" (
  "id",
  "claim_id",
  "action",
  "actor_id",
  "actor_name",
  "old_status",
  "new_status",
  "details",
  "created_at"
)
SELECT
  gen_random_uuid(),
  claim."id",
  'MARKED_PAID',
  claim."employee_id",
  'System Reconciliation',
  'Queued for Payroll',
  'Paid',
  jsonb_build_object(
    'payrollRunId', claim."reimbursement_payroll_run_id",
    'paymentReference', claim."reimbursement_payment_reference",
    'paidAt', claim."reimbursement_paid_at",
    'reconciled', true
  ),
  COALESCE(claim."reimbursement_paid_at", claim."updated_at", CURRENT_TIMESTAMP)
FROM "expense_claims" AS claim
WHERE claim."status" = 'Paid'
  AND claim."reimbursement_paid_at" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "expense_claim_history" AS history
    WHERE history."claim_id" = claim."id"
      AND history."action" IN ('MARKED_PAID', 'PAID_VIA_PAYROLL')
  );
