import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/auth";
import { requirePermission, requireRole } from "../../middlewares/rbac";
import { validate } from "../../middlewares/validate";
import { parseDateOnly } from "./travel.dates";
import * as controller from "./travel.controller";

const router = Router();
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => parseDateOnly(value) !== null, "Must be a valid calendar date");
const travelBody = z.object({
  destination: z.string().trim().min(2).max(160),
  startDate: dateOnly,
  endDate: dateOnly,
  purpose: z.string().trim().min(10).max(2000),
  mode: z.enum(["Air", "Rail", "Road"]),
  estimatedCost: z.coerce.number().positive().max(10_000_000),
  isInternational: z.boolean().optional(),
}).strict();
const decision = z.object({ action: z.enum(["APPROVE", "REJECT", "REQUEST_MORE_DETAILS"]), comment: z.string().trim().max(1000).optional() }).strict();
const cancellation = z.object({ reason: z.string().trim().min(1).max(1000) }).strict();

router.use(authenticate);
router.get("/", requirePermission("travel:read"), controller.list);
router.get("/passport", requirePermission("travel:read"), controller.passport);
router.post("/", requirePermission("travel:write"), validate({ body: travelBody }), controller.create);
router.patch("/:id/resubmit", requirePermission("travel:write"), validate({ body: travelBody }), controller.resubmit);
router.patch("/:id/edit", requirePermission("travel:write"), validate({ body: travelBody }), controller.editPending);
router.patch("/:id/cancel", requirePermission("travel:write"), validate({ body: cancellation }), controller.cancel);
router.patch("/:id/decision", requirePermission("travel:approve"), requireRole("MANAGER", "FINANCE", "ADMIN"), validate({ body: decision }), controller.decide);
router.patch("/:id/booking", requirePermission("travel:write"), requireRole("HR", "ADMIN"), validate({ body: z.object({ mode: z.enum(["api", "manual"]), reference: z.string().trim().max(100).optional(), simulateFailure: z.boolean().optional() }).strict() }), controller.book);
router.patch("/:id/advance", requirePermission("travel:write"), requireRole("FINANCE", "ADMIN"), validate({ body: z.object({ amount: z.coerce.number().positive() }).strict() }), controller.advance);
router.patch("/:id/settlement", requirePermission("travel:write"), validate({ body: z.object({
  actualCost: z.coerce.number().nonnegative().max(9_999_999_999.99),
  notes: z.string().trim().max(2000).optional(),
  itemization: z.array(z.object({
    description: z.string().trim().min(1).max(160),
    amount: z.coerce.number().nonnegative().max(9_999_999_999.99),
  }).strict()).max(50).optional(),
}).strict() }), controller.settlement);
router.patch("/:id/settlement/close", requirePermission("travel:approve"), requireRole("FINANCE", "ADMIN"), validate({ body: z.object({ method: z.string().trim().max(80).optional(), note: z.string().trim().max(1000).optional(), reference: z.string().trim().max(120).optional() }).strict() }), controller.closeSettlement);

export default router;
