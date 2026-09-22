import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/auth";
import { requirePermission, requireRole } from "../../middlewares/rbac";
import { validate } from "../../middlewares/validate";
import * as controller from "./travel.controller";

const router = Router();
const travelBody = z.object({
  destination: z.string().trim().min(2).max(160),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  purpose: z.string().trim().min(10).max(2000),
  mode: z.enum(["Air", "Rail", "Road"]),
  estimatedCost: z.coerce.number().positive().max(10_000_000),
  isInternational: z.boolean().optional(),
}).strict();
const decision = z.object({ action: z.enum(["APPROVE", "REJECT", "REQUEST_MORE_DETAILS"]), comment: z.string().trim().max(1000).optional() }).strict();

router.use(authenticate);
router.get("/", requirePermission("travel:read"), controller.list);
router.get("/passport", requirePermission("travel:read"), controller.passport);
router.post("/", requirePermission("travel:write"), validate({ body: travelBody }), controller.create);
router.patch("/:id/resubmit", requirePermission("travel:write"), validate({ body: travelBody }), controller.resubmit);
router.patch("/:id/decision", requirePermission("travel:approve"), requireRole("MANAGER", "HR", "ADMIN"), validate({ body: decision }), controller.decide);
router.patch("/:id/booking", requirePermission("travel:write"), requireRole("HR", "ADMIN"), validate({ body: z.object({ mode: z.enum(["api", "manual"]), reference: z.string().trim().max(100).optional(), simulateFailure: z.boolean().optional() }).strict() }), controller.book);
router.patch("/:id/advance", requirePermission("travel:write"), requireRole("HR", "ADMIN"), validate({ body: z.object({ amount: z.coerce.number().positive() }).strict() }), controller.advance);
router.patch("/:id/settlement", requirePermission("travel:write"), validate({ body: z.object({ actualCost: z.coerce.number().nonnegative(), notes: z.string().trim().max(2000).optional() }).strict() }), controller.settlement);
router.patch("/:id/settlement/close", requirePermission("travel:approve"), requireRole("HR", "ADMIN"), validate({ body: z.object({ method: z.string().trim().max(80).optional(), note: z.string().trim().max(1000).optional() }).strict() }), controller.closeSettlement);

export default router;
