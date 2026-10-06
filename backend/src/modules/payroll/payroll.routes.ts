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

const createPayrollRunSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
}).strict();


const payrollPolicySchema = z.object({
  name: z.string().trim().min(2).max(120),
  effectiveFrom: z.string().min(10),
  effectiveTo: z.string().min(10).nullable().optional(),
  standardHoursPerDay: z.number().positive().max(24).default(8),
  overtimeMultiplier: z.number().positive().max(5).default(1.5),
  holidayWorkMultiplier: z.number().positive().max(5).default(2),
  gratuityServiceYears: z.number().int().min(0).max(50).default(5),
  gratuityDays: z.number().positive().max(31).default(15),
  gratuityDivisor: z.number().positive().max(31).default(26),
  taxRegime: z.enum(["OLD", "NEW"]).default("NEW"),
  financialYear: z.string().trim().min(4).max(20),
  isActive: z.boolean().optional(),
}).strict();

const statutoryRuleSchema = z.object({
  ruleType: z.enum(["PROFESSIONAL_TAX", "LABOUR_WELFARE_FUND"]),
  country: z.string().trim().min(2).max(100).default("India"),
  state: z.string().trim().min(2).max(100).nullable().optional(),
  effectiveFrom: z.string().min(10),
  effectiveTo: z.string().min(10).nullable().optional(),
  config: z.object({
    amount: z.number().min(0),
    minMonthlyGross: z.number().min(0).optional(),
    maxMonthlyGross: z.number().min(0).optional(),
  }).strict(),
  isActive: z.boolean().optional(),
}).strict();


// Payroll policy/statutory configuration (effective-dated, Admin controlled)
router.get("/configuration", authenticate, requirePermission("payroll:read"), requireRole("HR", "ADMIN"), payrollController.configuration);
router.post("/configuration/policies", authenticate, requirePermission("payroll:write"), requireRole("ADMIN"), validate({ body: payrollPolicySchema }), payrollController.createPolicy);
router.post("/configuration/statutory-rules", authenticate, requirePermission("payroll:write"), requireRole("ADMIN"), validate({ body: statutoryRuleSchema }), payrollController.createStatutoryRule);

// GET /api/payroll/runs — payroll:read
router.get("/runs", authenticate, requirePermission("payroll:read"), payrollController.runs);

// POST /api/payroll/runs — create a Draft payroll batch
router.post("/runs", authenticate, requirePermission("payroll:write"), requireRole("HR", "ADMIN"), validate({ body: createPayrollRunSchema }), payrollController.createRun);

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
