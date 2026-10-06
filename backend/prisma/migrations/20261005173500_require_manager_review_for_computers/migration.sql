UPDATE "workflow_definition_steps" AS step
SET "condition" = NULL
FROM "workflow_definitions" AS definition
WHERE step."definition_id" = definition."id"
  AND definition."request_type" = 'Asset Allocation'
  AND definition."status" = 'Active'
  AND step."name" = 'Manager Need Approval';
