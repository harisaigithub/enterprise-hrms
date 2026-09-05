import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { requirePermission, requireRole } from "../../middlewares/rbac";
import * as controller from "./dashboard.controller";

const router = Router();
router.get("/employee", authenticate, requireRole("EMPLOYEE", "MANAGER", "HR", "ADMIN"), requirePermission("dashboard:read"), controller.employee);
router.get("/manager", authenticate, requireRole("MANAGER", "ADMIN"), requirePermission("dashboard:read"), controller.manager);
router.get("/admin", authenticate, requirePermission("dashboard:read"), controller.admin);
export default router;
