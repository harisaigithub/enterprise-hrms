-- Reconcile claims approved by their manager before the application began
-- deriving the expense stage from the next pending workflow step.
UPDATE "expense_claims" AS claim
SET
  "status" = 'Finance Pending',
  "approval_stage" = 'Finance Review',
  "updated_at" = CURRENT_TIMESTAMP
FROM "workflow_instances" AS instance
WHERE claim."workflow_instance_id" = instance."id"
  AND claim."status" = 'Manager Pending'
  AND instance."status" = 'In Progress'
  AND EXISTS (
    SELECT 1
    FROM "workflow_instance_steps" AS step
    WHERE step."instance_id" = instance."id"
      AND step."status" = 'Pending'
      AND (
        LOWER(step."name") LIKE '%finance%'
        OR step."approver_id" = 'role-finance'
      )
  );
