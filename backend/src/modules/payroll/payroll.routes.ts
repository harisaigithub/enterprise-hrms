import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middlewares/validate";
import { authenticate } from "../../middlewares/auth";
import { requirePermission, requireRole } from "../../middlewares/rbac";
import { requireAllowedIp } from "../../middlewares/securityPolicy";
import * as payrollController from "./payroll.controller";

const router = Router();

const payslipQuerySchema = z.object({
  employeeId: z.string().optional(),
});

// GET /api/payroll/runs — payroll:read
router.get("/runs", authenticate, requirePermission("payroll:read"), payrollController.runs);

// GET /api/payroll/runs/:id — payroll:read
router.get("/runs/:id", authenticate, requirePermission("payroll:read"), payrollController.runDetail);

// POST /api/payroll/runs/:id/process — payroll:write (Admin only in frontend matrix)
router.post("/runs/:id/process", authenticate, requirePermission("payroll:write"), requireRole("HR", "ADMIN"), payrollController.process);

// POST /api/payroll/runs/:id/approve — payroll:approve (four-eyes)
router.post("/runs/:id/approve", authenticate, requirePermission("payroll:approve"), requireRole("ADMIN"), payrollController.approve);
router.post("/runs/:id/reject", authenticate, requirePermission("payroll:approve"), requireRole("ADMIN"), validate({ body: z.object({ reason: z.string().trim().min(10).max(1000) }).strict() }), payrollController.reject);
router.post("/runs/:id/release", authenticate, requirePermission("payroll:write"), requireRole("ADMIN"), requireAllowedIp("payroll-release"), payrollController.release);

// POST /api/payroll/runs/:id/lock — payroll:write
router.post("/runs/:id/lock", authenticate, requirePermission("payroll:write"), requireRole("ADMIN"), payrollController.lock);

// GET /api/payroll/payslips — payroll:read
router.get("/payslips", authenticate, requirePermission("payroll:read"), validate({ query: payslipQuerySchema }), payrollController.payslips);


// GET /api/payroll/payslips/:id — payroll:read
router.get("/payslips/:id", authenticate, requirePermission("payroll:read"), payrollController.payslipDetail);

router.post(
  "/payslips/:id/print",
  authenticate,
  requirePermission("payroll:read"),
  payrollController.printPayslip
);

router.post(
  "/annual-statement/print",
  authenticate,
  requirePermission("payroll:read"),
  payrollController.printAnnualStatement,
);

router.post(
  "/form16/print",
  authenticate,
  requirePermission("payroll:read"),
  payrollController.printForm16,
);

export default router;
