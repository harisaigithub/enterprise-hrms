import { Router } from "express";

import {
    getInventory,
    addInventoryItem,
    updateInventoryItem,
    assignInventoryItem,
    retireInventoryItem,
    setAssetMaintenance,
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
import { validate } from "../../middlewares/validate";
import {
    addInventorySchema,
    assignAssetSchema,
    fulfillRequestSchema,
    retireAssetSchema,
    rejectAssetRequestSchema,
    raiseRequestSchema,
    returnAssetSchema,
    updateInventorySchema,
} from "./asset.validation";

const router = Router();

router.use(authenticate);

/* =========================================================
   INVENTORY
========================================================= */

// Inventory exposes organization-wide asset and holder details.
router.get(
    "/inventory",
    requirePermission("assets:read"),
    requireRole("ADMIN", "HR"),
    getInventory
);

// Only ADMIN / HR / MANAGER
router.post(
    "/inventory",
    requirePermission("assets:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    validate({ body: addInventorySchema }),
    addInventoryItem
);

router.patch(
    "/inventory/:assetId",
    requirePermission("assets:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    validate({ body: updateInventorySchema }),
    updateInventoryItem
);

router.post(
    "/inventory/:assetId/assign",
    requirePermission("assets:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    validate({ body: assignAssetSchema }),
    assignInventoryItem
);

router.patch(
    "/inventory/:assetId/retire",
    requirePermission("assets:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    validate({ body: retireAssetSchema }),
    retireInventoryItem
);

router.patch(
    "/inventory/:assetId/maintenance",
    requirePermission("assets:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    validate({ body: retireAssetSchema }),
    setAssetMaintenance
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
    validate({ body: raiseRequestSchema }),
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
    validate({ body: rejectAssetRequestSchema }),
    rejectRequest
);

// Only ADMIN / HR / MANAGER
router.patch(
    "/requests/:id/fulfill",
    requirePermission("assets:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    validate({ body: fulfillRequestSchema }),
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
    validate({ body: returnAssetSchema }),
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