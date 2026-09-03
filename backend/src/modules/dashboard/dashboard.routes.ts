import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { requirePermission, requireRole } from "../../middlewares/rbac";
import * as controller from "./dashboard.controller";

const router = Router();
router.get("/employee", authenticate, requireRole("EMPLOYEE"), requirePermission("dashboard:read"), controller.employee);
export default router;
