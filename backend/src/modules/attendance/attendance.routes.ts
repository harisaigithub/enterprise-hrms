import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middlewares/validate";
import { authenticate } from "../../middlewares/auth";
import { requirePermission, requireRole } from "../../middlewares/rbac";
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

const startBreakBodySchema = z.object({
  breakType: z.enum(["Lunch Break", "Short Break", "Tea Break", "Personal Break"]).default("Short Break"),
});

const endBreakBodySchema = z.object({}).strict();

const regularizationBodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must use YYYY-MM-DD"),
  requestedStatus: z.enum(["Present", "Late", "Half-Day", "WFH"]),
  requestedPunchIn: z.string().datetime(),
  requestedPunchOut: z.string().datetime(),
  reason: z.string().trim().min(10).max(1000),
}).strict();

const regularizationListSchema = z.object({
  employeeId: z.string().optional(),
  status: z.enum(["Submitted", "More Details Required", "Resubmitted", "Manager Approved", "Approved", "Rejected"]).optional(),
});

const regularizationActionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "REQUEST_MORE_DETAILS"]),
  comment: z.string().trim().max(1000).optional(),
}).strict();

// GET /api/attendance — attendance:read
router.get("/", authenticate, requirePermission("attendance:read"), validate({ query: listQuerySchema }), attendanceController.list);

// GET /api/attendance/summary — attendance:read (team summary)
router.get("/summary", authenticate, requirePermission("attendance:read"), attendanceController.summary);

// POST /api/attendance/check-in — attendance:write
router.post("/check-in", authenticate, requirePermission("attendance:write"), validate({ body: checkInBodySchema }), attendanceController.doCheckIn);

// POST /api/attendance/check-out — attendance:write
router.post("/check-out", authenticate, requirePermission("attendance:write"), validate({ body: checkOutBodySchema }), attendanceController.doCheckOut);

// Breaks always belong to the authenticated employee.
router.post("/break-start", authenticate, requirePermission("attendance:write"), validate({ body: startBreakBodySchema }), attendanceController.doStartBreak);
router.post("/break-end", authenticate, requirePermission("attendance:write"), validate({ body: endBreakBodySchema }), attendanceController.doEndBreak);

// Regularization routes
router.get("/regularizations", authenticate, requirePermission("attendance:read"), validate({ query: regularizationListSchema }), attendanceController.listRegularizations);
router.post("/regularize", authenticate, requirePermission("attendance:write"), validate({ body: regularizationBodySchema }), attendanceController.requestRegularization);
router.patch("/regularizations/:id/act", authenticate, requirePermission("attendance:write"), requireRole("MANAGER", "HR", "ADMIN"), validate({ body: regularizationActionSchema }), attendanceController.decideRegularization);
router.patch("/regularizations/:id/resubmit", authenticate, requirePermission("attendance:write"), requireRole("EMPLOYEE", "MANAGER", "HR", "ADMIN"), validate({ body: regularizationBodySchema }), attendanceController.resubmitRegularization);

// Shift routes
router.get("/shifts", authenticate, attendanceController.listShifts);
router.post("/shifts", authenticate, requirePermission("attendance:write"), attendanceController.createShift);

export default router;
