import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/auth";
import { requirePermission, requireRole } from "../../middlewares/rbac";
import { validate } from "../../middlewares/validate";
import * as controller from "./helpdesk.controller";

const router = Router();
router.use(authenticate);

const listQuery = z.object({
  scope: z.enum(["mine", "queue"]).default("mine"),
  queue: z.string().max(80).optional(),
  status: z.enum(["Open", "Assigned", "In Progress", "Resolved", "Reopened", "Closed"]).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createBody = z.object({
  category: z.enum(["IT Tickets", "HR Tickets", "Finance Tickets", "Asset Support", "HR - Grievance/Confidential"]),
  subject: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(5000),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
  attachmentFileName: z.string().trim().max(255).optional().nullable(),
});

const commentBody = z.object({ message: z.string().trim().min(1).max(3000), isInternal: z.boolean().default(false) });
const assignBody = z.object({ assigneeEmployeeCode: z.string().trim().min(1) });
const statusBody = z.object({
  status: z.enum(["Assigned", "In Progress", "Resolved", "Closed"]),
  resolutionNotes: z.string().trim().max(3000).optional(),
});
const reopenBody = z.object({ reason: z.string().trim().min(3).max(2000) });

router.get("/queues", requirePermission("helpdesk:read"), controller.queues);
router.get("/tickets", requirePermission("helpdesk:read"), validate({ query: listQuery }), controller.list);
router.get("/tickets/:id", requirePermission("helpdesk:read"), controller.detail);
router.post("/tickets", requirePermission("helpdesk:write"), validate({ body: createBody }), controller.create);
router.post("/tickets/:id/comments", requirePermission("helpdesk:write"), validate({ body: commentBody }), controller.comment);
router.post("/tickets/:id/reopen", requirePermission("helpdesk:write"), validate({ body: reopenBody }), controller.reopen);
router.patch("/tickets/:id/assign", requirePermission("helpdesk:write"), requireRole("ADMIN", "HR"), validate({ body: assignBody }), controller.assign);
router.patch("/tickets/:id/status", requirePermission("helpdesk:write"), requireRole("ADMIN", "HR"), validate({ body: statusBody }), controller.status);

export default router;
