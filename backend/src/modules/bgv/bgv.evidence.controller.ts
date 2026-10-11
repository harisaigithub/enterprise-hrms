import type { Request, Response, NextFunction } from "express";

import {
    compareBgvVerificationFields,
    getBgvVerificationFields,
    saveBgvVerificationFields,
} from "./bgv.evidence.service";

export async function getBgvVerificationFieldsController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const verificationId = req.params.id;

        if (!verificationId) {
            return res.status(400).json({
                message: "Verification id is required",
            });
        }

        const result =
            await getBgvVerificationFields(verificationId);

        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

export async function saveBgvVerificationFieldsController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const verificationId = req.params.id;

        if (!verificationId) {
            return res.status(400).json({
                message: "Verification id is required",
            });
        }

        const result = await saveBgvVerificationFields(
            verificationId,
            req.body
        );

        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

export async function compareBgvVerificationFieldsController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const verificationId = req.params.id;

        if (!verificationId) {
            return res.status(400).json({
                message: "Verification id is required",
            });
        }

        const result =
            await compareBgvVerificationFields(verificationId);

        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
