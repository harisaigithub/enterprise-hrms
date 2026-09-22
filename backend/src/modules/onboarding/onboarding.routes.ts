import { Router } from "express";

import {
    getOnboardingRecords,
    getSingleOnboarding,
    getOnboardingSummaryController,
    updateChecklistStatus,
} from "./onboarding.controller";

import { authenticate } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/rbac";

const router = Router();

router.use(authenticate);

router.get(
    "/summary",
    requirePermission("onboarding:read"),
    getOnboardingSummaryController
);

router.get(
    "/",
    requirePermission("onboarding:read"),
    getOnboardingRecords
);

router.get(
    "/:employeeId",
    requirePermission("onboarding:read"),
    getSingleOnboarding
);

router.patch(
    "/:employeeId/checklist/:itemId",
    requirePermission("onboarding:write"),
    updateChecklistStatus
);

export default router;
