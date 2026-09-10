import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/rbac";
import * as requestController from "./request.controller";

const router = Router();

// GET /api/requests — Authenticated users can list requests (scoped by role in service)
router.get("/", authenticate, requestController.list);

// POST /api/requests — Authenticated users can submit a request
router.post("/", authenticate, requestController.create);

// PATCH /api/requests/:id/decide — HR/Admin/Manager can decide requests
router.patch("/:id/decide", authenticate, requirePermission("employees:write|workflows:write"), requestController.decide);

export default router;
