import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { requirePermission, requireRole } from "../../middlewares/rbac";
import { validate } from "../../middlewares/validate";
import * as controller from "./dashboard.controller";
import { layoutInputSchema } from "./dashboard.catalog";

const router = Router();
router.get("/employee", authenticate, requireRole("EMPLOYEE", "MANAGER", "HR", "ADMIN", "FINANCE"), requirePermission("dashboard:read"), controller.employee);
router.get("/manager", authenticate, requireRole("MANAGER", "ADMIN"), requirePermission("dashboard:read"), controller.manager);
router.get("/hr", authenticate, requireRole("HR", "ADMIN"), requirePermission("dashboard:read"), controller.hr);
router.get("/admin", authenticate, requireRole("ADMIN"), requirePermission("dashboard:read"), controller.admin);
router.get("/finance", authenticate, requireRole("FINANCE", "HR", "ADMIN"), requirePermission("dashboard:read"), controller.finance);

// Per-user dashboard layout preferences. Widgets are validated server-side
// against the widget catalog AND the caller's real role/permissions.
router.get("/preferences", authenticate, requirePermission("dashboard:read"), controller.getPreferences);
router.put(
  "/preferences",
  authenticate,
  requirePermission("dashboard:read"),
  validate({ body: layoutInputSchema }),
  controller.savePreferences
);
router.delete("/preferences", authenticate, requirePermission("dashboard:read"), controller.resetPreferences);

export default router;
