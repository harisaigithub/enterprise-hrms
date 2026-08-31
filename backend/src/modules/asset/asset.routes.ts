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

const router = Router();

router.use(authenticate);

/* =========================================================
   INVENTORY
========================================================= */

router.get(
    "/inventory",
    getInventory
);

router.post(
    "/inventory",
    addInventoryItem
);

router.get(
    "/inventory/:assetId/history",
    getAssetHistory
);

router.get(
    "/license-alerts",
    getLicenseAlerts
);

/* =========================================================
   REQUESTS
========================================================= */

router.get(
    "/requests",
    getRequests
);

router.post(
    "/requests",
    raiseRequest
);

router.patch(
    "/requests/:id/approve",
    approveRequest
);

router.patch(
    "/requests/:id/reject",
    rejectRequest
);

router.patch(
    "/requests/:id/fulfill",
    fulfillRequest
);

/* =========================================================
   ASSET LIFECYCLE
========================================================= */

router.get(
    "/my-assets",
    getMyAssets
);


router.patch(
    "/:id/acknowledge",
    acknowledgeReceipt
);

router.patch(
    "/:id/return",
    returnAsset
);

router.get(
    "/pending-returns",
    getPendingReturns
);

export default router;