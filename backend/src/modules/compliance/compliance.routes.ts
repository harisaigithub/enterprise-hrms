import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/auth";
import { requirePermission, requireRole } from "../../middlewares/rbac";
import { validate } from "../../middlewares/validate";
import * as controller from "./compliance.controller";

const router = Router();
router.use(authenticate, requireRole("HR", "ADMIN"), requirePermission("compliance:read"));
const id = z.object({ id: z.string().uuid() });
const reason = z.object({ reason: z.string().trim().min(3).max(2000) });
const obligation = z.object({
  title: z.string().trim().min(3).max(180), category: z.string().trim().min(2).max(80),
  dueDate: z.coerce.date(), owner: z.string().trim().min(2).max(160),
  recurring: z.enum(["Monthly", "Quarterly", "Annual", "One-off"]),
});

router.get("/dashboard", controller.dashboard);
router.get("/obligations", controller.obligations);
router.post("/obligations", requirePermission("compliance:write"), validate({ body: obligation }), controller.createObligation);
router.patch("/obligations/:id/filed", requirePermission("compliance:write"), validate({ params: id }), controller.markFiled);
router.get("/cases", controller.cases);
router.get("/cases/:id", validate({ params: id }), controller.caseDetail);
router.patch("/cases/:id/legal-hold", requirePermission("compliance:write"), validate({ params: id, body: reason }), controller.applyCaseHold);
router.delete("/cases/:id/legal-hold", requirePermission("compliance:write"), validate({ params: id }), controller.clearCaseHold);
router.get("/retention", controller.retention);
router.patch("/retention/:id/legal-hold", requirePermission("compliance:write"), validate({ params: id, body: reason }), controller.applyRecordHold);
router.delete("/retention/:id/legal-hold", requirePermission("compliance:write"), validate({ params: id }), controller.clearRecordHold);
router.post("/retention/run", requirePermission("compliance:write"), controller.runRetention);
router.get("/audit", controller.audit);
router.get("/activities", controller.activities);

export default router;
