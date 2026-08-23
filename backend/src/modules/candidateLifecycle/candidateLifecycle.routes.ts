import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { validate } from "../../middlewares/validate";
import { authenticate } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/rbac";
import * as controller from "./candidateLifecycle.controller";

const router = Router();
const uuid = z.string().uuid();
const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false });

router.get("/jobs", publicLimiter, controller.listJobs);
router.post("/applications", publicLimiter, validate({ body: z.object({
  requisitionId: uuid, firstName: z.string().min(1).max(80), lastName: z.string().max(80).optional(),
  email: z.string().email(), phone: z.string().max(20).optional(), resumeSummary: z.string().max(5000).optional(),
}) }), controller.apply);
router.get("/portal/:token", publicLimiter, controller.portal);
router.post("/portal/:token/decision", publicLimiter, validate({ body: z.object({ decision: z.enum(["Accepted", "Declined"]) }) }), controller.decide);
router.post("/portal/:token/documents", publicLimiter, validate({ body: z.object({
  documentType: z.enum(["Identity Proof", "Address Proof", "Education Certificate", "Tax Document", "Other"]),
  fileName: z.string().min(1).max(255), fileUrl: z.string().min(1).max(900000),
}) }), controller.uploadDocument);

router.use(authenticate);
router.get("/applications", requireRole("HR", "ADMIN"), controller.listApplications);
router.post("/applications/:id/first-approval", requireRole("HR"), validate({ body: z.object({ notes: z.string().max(2000).optional() }) }), controller.firstApprove);
router.post("/applications/:id/second-approval", requireRole("ADMIN"), validate({ body: z.object({ proposedSalary: z.coerce.number().positive(), joiningDate: z.coerce.date().optional() }) }), controller.secondApprove);
router.post("/applications/:id/reject", requireRole("HR", "ADMIN"), validate({ body: z.object({ reason: z.string().min(2).max(2000) }) }), controller.reject);
router.patch("/documents/:id", requireRole("HR"), validate({ body: z.object({ status: z.enum(["Verified", "Rejected"]), reason: z.string().max(2000).optional() }) }), controller.verifyDocument);
router.post("/applications/:id/create-employee", requireRole("HR"), controller.createEmployee);

export default router;
