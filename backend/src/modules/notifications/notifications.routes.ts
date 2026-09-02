import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/auth";
import { requirePermission, requireRole } from "../../middlewares/rbac";
import { validate } from "../../middlewares/validate";
import * as controller from "./notifications.controller";
import { NOTIFICATION_CATEGORIES } from "./notifications.service";

const router = Router();
const uuid = z.string().uuid();
const category = z.enum(NOTIFICATION_CATEGORIES);

router.use(authenticate, requirePermission("notifications:read"));
router.get("/", controller.inbox);
router.patch("/read-all", controller.markAllRead);
router.patch("/:id/read", validate({ params: z.object({ id: uuid }) }), controller.markRead);
router.get("/delivery-history/me", controller.history);
router.get("/preferences/me", controller.preferences);
router.put("/preferences/me", validate({ body: z.object({ category, emailEnabled: z.boolean(), inAppEnabled: z.boolean() }) }), controller.updatePreference);

router.get("/templates/catalog", requireRole("ADMIN", "HR"), controller.catalog);
router.post("/templates/lint", requireRole("ADMIN", "HR"), validate({ body: z.object({ body: z.string().max(5000) }) }), controller.lint);
router.get("/templates", requireRole("ADMIN", "HR"), controller.templates);
router.post("/templates", requireRole("ADMIN", "HR"), validate({ body: z.object({ name: z.string().trim().min(2).max(180), category, body: z.string().trim().min(2).max(5000) }) }), controller.saveTemplate);
router.post("/templates/:id/send-test", requireRole("ADMIN", "HR"), validate({ params: z.object({ id: uuid }), body: z.object({ values: z.record(z.string()).default({}) }) }), controller.sendTest);

export default router;
