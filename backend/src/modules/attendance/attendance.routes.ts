import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middlewares/validate";
import { authenticate } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/rbac";
import * as attendanceController from "./attendance.controller";

const router = Router();

const listQuerySchema = z.object({
  employeeId: z.string().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

const checkInBodySchema = z.object({
  employeeId: z.string().optional(),
  method: z.enum(["Web", "Biometric", "GPS"]).optional(),
});

const checkOutBodySchema = z.object({
  employeeId: z.string().optional(),
});

// GET /api/attendance — attendance:read
router.get("/", authenticate, requirePermission("attendance:read"), validate({ query: listQuerySchema }), attendanceController.list);

// GET /api/attendance/summary — attendance:read (team summary)
router.get("/summary", authenticate, requirePermission("attendance:read"), attendanceController.summary);

// POST /api/attendance/check-in — attendance:write
router.post("/check-in", authenticate, requirePermission("attendance:write"), validate({ body: checkInBodySchema }), attendanceController.doCheckIn);

// POST /api/attendance/check-out — attendance:write
router.post("/check-out", authenticate, requirePermission("attendance:write"), validate({ body: checkOutBodySchema }), attendanceController.doCheckOut);

export default router;
