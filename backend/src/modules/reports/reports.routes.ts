import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/auth";
import { requirePermission, requireRole } from "../../middlewares/rbac";
import { validate } from "../../middlewares/validate";
import * as controller from "./reports.controller";

const router = Router();
router.use(authenticate, requireRole("ADMIN", "HR", "MANAGER"), requirePermission("reports:read"));
const filters = z.object({ departments: z.array(z.string().max(100)).default([]), location: z.string().max(100).default("") }).default({ departments: [], location: "" });
router.get("/templates", controller.templates);
router.get("/scope", controller.scope);
router.get("/catalog", controller.catalog);
router.post("/standard", validate({ body: z.object({ templateId: z.string().min(1).max(60), filters }) }), controller.standard);
router.post("/custom", validate({ body: z.object({ dimensionId: z.enum(["department", "location", "employmentType", "gender"]), metricIds: z.array(z.string().max(60)).min(1).max(6), filters }) }), controller.custom);
router.post("/export/csv", requireRole("ADMIN", "HR"), requirePermission("reports:export"), validate({ body: z.object({ templateId: z.string().min(1).max(60), filters }) }), controller.csv);
export default router;
