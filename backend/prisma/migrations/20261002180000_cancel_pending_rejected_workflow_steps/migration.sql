UPDATE "workflow_instance_steps" AS step
SET "status" = 'Cancelled'
FROM "workflow_instances" AS instance
WHERE step."instance_id" = instance."id"
  AND instance."status" = 'Rejected'
  AND step."status" = 'Pending';