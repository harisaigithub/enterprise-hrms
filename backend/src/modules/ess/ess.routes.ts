import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/rbac";
import { validate } from "../../middlewares/validate";
import * as controller from "./ess.controller";

const router = Router();
router.use(authenticate, requirePermission("ess:read"));
router.get("/overview", controller.overview);
router.get("/tax-declarations", controller.taxDeclarations);
router.post("/tax-declarations", requirePermission("ess:write"), validate({ body: z.object({
  financialYear: z.string().regex(/^\d{4}-\d{2}$/),
  section: z.enum(["80C", "80D", "80CCD(1B)", "HRA", "LTA", "Home Loan Interest"]),
  investmentType: z.string().trim().min(2).max(120),
  amount: z.coerce.number().positive().max(100000000),
}) }), controller.submitTaxDeclaration);
router.get("/data-export/latest", controller.lastExport);
router.post("/data-export", requirePermission("ess:write"), controller.requestExport);
export default router;
