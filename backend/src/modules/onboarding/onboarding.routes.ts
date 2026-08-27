import { Router } from "express";

import {
    getOnboardingRecords,
    getSingleOnboarding,
    getOnboardingSummaryController,
    updateChecklistStatus,
} from "./onboarding.controller";

import { authenticate } from "../../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get(
    "/summary",
    getOnboardingSummaryController
);

router.get(
    "/",
    getOnboardingRecords
);

router.get(
    "/:employeeId",
    getSingleOnboarding
);

router.patch(
    "/:employeeId/checklist/:itemId",
    updateChecklistStatus
);

export default router;