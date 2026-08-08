import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middlewares/validate";
import { authenticate } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/rbac";
import * as workflowController from "./workflow.controller";

const router = Router();

const APPROVER_RULES = z.enum([
  "Direct Reporting Manager",
  "Department Head",
  "Named Role: Finance",
  "Named Role: HR",
]);

const conditionSchema = z
  .object({
    field: z.string().min(1),
    operator: z.enum([">", ">=", "<", "<="]),
    value: z.number(),
  })
  .nullable()
  .optional();

const stepSchema = z.object({
  name: z.string().min(1, "Step name is required"),
  approverRule: APPROVER_RULES,
  slaHours: z.number().int().positive().max(720).optional(),
  parallelGroup: z.string().nullable().optional(),
  condition: conditionSchema,
});

const createDefinitionBodySchema = z.object({
  requestType: z.string().min(1, "requestType is required"),
  steps: z.array(stepSchema).min(1, "At least one approval step is required"),
});

const submitBodySchema = z.object({
  definitionId: z.string().min(1, "definitionId is required"),
  requesterId: z.string().min(1, "requesterId is required"),
  attributes: z.record(z.any()).default({}),
});

const actBodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(1000).optional(),
  actingApproverName: z.string().max(120).optional(),
});

const assignBodySchema = z.object({
  approverId: z.string().min(1, "approverId is required"),
  approverName: z.string().max(120).optional(),
});

const viewAccess = requirePermission("workflows:read|workflows:write|workflows:approve");
const manageAccess = requirePermission("workflows:write");
const actAccess = requirePermission("workflows:write|workflows:approve");

// GET /api/workflow/roster
router.get("/roster", authenticate, viewAccess, workflowController.getRoster);

// Definitions
router.get("/definitions", authenticate, viewAccess, workflowController.listDefinitions);
router.post("/definitions", authenticate, manageAccess, validate({ body: createDefinitionBodySchema }), workflowController.createDefinition);
router.put("/definitions/:id/deactivate", authenticate, manageAccess, workflowController.deactivateDefinition);
router.delete("/definitions/:id", authenticate, manageAccess, workflowController.deleteDefinition);

// Instances
router.get("/instances", authenticate, viewAccess, workflowController.listInstances);
router.post("/instances", authenticate, viewAccess, validate({ body: submitBodySchema }), workflowController.submitRequest);
router.post("/instances/:id/act", authenticate, actAccess, validate({ body: actBodySchema }), workflowController.actOnStep);
router.post("/instances/:id/assign", authenticate, manageAccess, validate({ body: assignBodySchema }), workflowController.manuallyAssignApprover);

// SLA scanner + event log
router.post("/sla-check", authenticate, manageAccess, workflowController.runSlaCheck);
router.get("/events", authenticate, viewAccess, workflowController.getEventLog);

export default router;
