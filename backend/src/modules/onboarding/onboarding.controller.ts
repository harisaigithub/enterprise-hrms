import { Request, Response } from "express";

import {
    listOnboardingRecords,
    getOnboardingRecord,
    getOnboardingSummary,
    updateChecklistItemStatus,
} from "./onboarding.service";

export const getOnboardingRecords = async (
    req: Request,
    res: Response
) => {
    const result = await listOnboardingRecords();
    res.json(result);
};

export const getSingleOnboarding = async (
    req: Request,
    res: Response
) => {
    const result = await getOnboardingRecord(
        req.params.employeeId
    );

    res.json(result);
};

export const getOnboardingSummaryController = async (
    req: Request,
    res: Response
) => {
    const result = await getOnboardingSummary();

    res.json(result);
};

export const updateChecklistStatus = async (
    req: Request,
    res: Response
) => {
    const result = await updateChecklistItemStatus(
        req.params.employeeId,
        req.params.itemId,
        req.body.status
    );

    res.json(result);
};