import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middlewares/validate";
import { authenticate } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/rbac";
import * as leaveController from "./leave.controller";

const router = Router();

const balanceQuerySchema = z.object({
  employeeId: z.string().optional(),
  year: z.coerce.number().int().optional(),
});

const requestsQuerySchema = z.object({
  employeeId: z.string().optional(),
  status: z.enum(["Pending", "Approved", "Rejected", "Cancelled"]).optional(),
});

const applyBodySchema = z.object({
  employeeId: z.string().optional(),
  leaveTypeId: z.string().min(1, "leaveTypeId is required"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD"),
  reason: z.string().max(1000).optional(),
});

const approvalBodySchema = z.object({
  comments: z.string().max(1000).optional(),
});

const rejectionBodySchema = z.object({
  comments: z.string().trim().min(1, "Rejection reason is required").max(1000),
});

// GET /api/leave/types — leave:read
router.get("/types", authenticate, requirePermission("leave:read"), leaveController.listTypes);

// GET /api/leave/balance — leave:read
router.get("/balance", authenticate, requirePermission("leave:read"), validate({ query: balanceQuerySchema }), leaveController.balance);

// GET /api/leave/requests — leave:read
router.get("/requests", authenticate, requirePermission("leave:read"), validate({ query: requestsQuerySchema }), leaveController.listRequests);

// POST /api/leave/apply — leave:write
router.post("/apply", authenticate, requirePermission("leave:write"), validate({ body: applyBodySchema }), leaveController.apply);

// PUT /api/leave/:id/approve — leave:approve
router.put("/:id/approve", authenticate, requirePermission("leave:approve"), validate({ body: approvalBodySchema }), leaveController.approve);

// PUT /api/leave/:id/reject — leave:approve
router.put("/:id/reject", authenticate, requirePermission("leave:approve"), validate({ body: rejectionBodySchema }), leaveController.reject);

// GET /api/leave/types/:code — leave:read
router.get("/types/:code", authenticate, requirePermission("leave:read"), leaveController.getLeaveTypePublic);

export default router;
