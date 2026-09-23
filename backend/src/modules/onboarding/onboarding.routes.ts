import { Router } from "express";

import {
    getOnboardingRecords,
    getSingleOnboarding,
    getOnboardingSummaryController,
    updateChecklistStatus,
} from "./onboarding.controller";

import { authenticate } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/rbac";
import { validate } from "../../middlewares/validate";
import { z } from "zod";

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
    validate({ body: z.object({ status: z.enum(["Pending", "Complete", "Pending Procurement"]) }).strict() }),
    updateChecklistStatus
);

export default router;
