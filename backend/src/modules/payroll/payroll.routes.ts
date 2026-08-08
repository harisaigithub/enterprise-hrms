import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middlewares/validate";
import { authenticate } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/rbac";
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
router.post("/runs/:id/process", authenticate, requirePermission("payroll:write"), payrollController.process);

// POST /api/payroll/runs/:id/approve — payroll:approve (four-eyes)
router.post("/runs/:id/approve", authenticate, requirePermission("payroll:approve"), payrollController.approve);

// GET /api/payroll/payslips — payroll:read
router.get("/payslips", authenticate, requirePermission("payroll:read"), validate({ query: payslipQuerySchema }), payrollController.payslips);

// GET /api/payroll/payslips/:id — payroll:read
router.get("/payslips/:id", authenticate, requirePermission("payroll:read"), payrollController.payslipDetail);

export default router;
