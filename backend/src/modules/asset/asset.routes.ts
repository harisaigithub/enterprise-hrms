import { Router } from "express";

import {
    getInventory,
    addInventoryItem,
    getAssetHistory,
    getLicenseAlerts,

    getRequests,
    raiseRequest,
    approveRequest,
    rejectRequest,
    fulfillRequest,

    getMyAssets,
    acknowledgeReceipt,
    returnAsset,

    getPendingReturns,
} from "./asset.controller";

import { authenticate } from "../../middlewares/auth";
import { requirePermission, requireRole } from "../../middlewares/rbac";

const router = Router();

router.use(authenticate);

/* =========================================================
   INVENTORY
========================================================= */

// ADMIN / HR / MANAGER / EMPLOYEE → Read inventory
router.get(
    "/inventory",
    requirePermission("assets:read"),
    getInventory
);

// Only ADMIN / HR / MANAGER
router.post(
    "/inventory",
    requirePermission("assets:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    addInventoryItem
);

// Only ADMIN / HR / MANAGER
router.get(
    "/inventory/:assetId/history",
    requirePermission("assets:read"),
    requireRole("ADMIN", "HR", "MANAGER"),
    getAssetHistory
);

// Only ADMIN / HR / MANAGER
router.get(
    "/license-alerts",
    requirePermission("assets:read"),
    requireRole("ADMIN", "HR", "MANAGER"),
    getLicenseAlerts
);

/* =========================================================
   REQUESTS
========================================================= */

// ADMIN / HR / MANAGER → all requests
// EMPLOYEE → own requests only
//
// IMPORTANT:
// Employee scope must be enforced inside getRequests()
router.get(
    "/requests",
    requirePermission("assets:read"),
    getRequests
);

// Everyone can raise an asset request
router.post(
    "/requests",
    requirePermission("assets:write"),
    raiseRequest
);

// Only ADMIN / HR / MANAGER
router.patch(
    "/requests/:id/approve",
    requirePermission("assets:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    approveRequest
);

// Only ADMIN / HR / MANAGER
router.patch(
    "/requests/:id/reject",
    requirePermission("assets:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    rejectRequest
);

// Only ADMIN / HR / MANAGER
router.patch(
    "/requests/:id/fulfill",
    requirePermission("assets:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    fulfillRequest
);

/* =========================================================
   ASSET LIFECYCLE
========================================================= */

// Employee can see own assigned assets
// ADMIN / HR / MANAGER can access according to service scope
router.get(
    "/my-assets",
    requirePermission("assets:read"),
    getMyAssets
);


router.patch(
    "/:id/acknowledge",
    requirePermission("assets:write"),
    acknowledgeReceipt
);

// ADMIN / HR / MANAGER + EMPLOYEE
// Employee → own assigned asset only
router.patch(
    "/:id/return",
    requirePermission("assets:write"),
    returnAsset
);

// Only ADMIN / HR / MANAGER
router.get(
    "/pending-returns",
    requirePermission("assets:read"),
    requireRole("ADMIN", "HR", "MANAGER"),
    getPendingReturns
);

export default router;