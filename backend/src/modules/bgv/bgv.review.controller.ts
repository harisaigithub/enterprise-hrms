import type { Request, Response, NextFunction } from "express";

import {
    createBgvReview,
    deleteBgvReview,
    getBgvReview,
    getBgvReviewHistory,
    getLatestBgvReview,
    hasBgvReviewDecision,
    listBgvReviews,
} from "./bgv.review.service";

export async function getBgvReviewController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await getBgvReview(req.params.id)
        );
    } catch (error) {
        return next(error);
    }
}

export async function listBgvReviewsController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await listBgvReviews({
                caseId: req.query.caseId as string | undefined,
                reviewerId: req.query.reviewerId as string | undefined,
                decision: req.query.decision as any | undefined,
            })
        );
    } catch (error) {
        return next(error);
    }
}

export async function createBgvReviewController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(201).json(
            await createBgvReview(req.body)
        );
    } catch (error) {
        return next(error);
    }
}

export async function getLatestBgvReviewController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await getLatestBgvReview(req.params.caseId)
        );
    } catch (error) {
        return next(error);
    }
}

export async function getBgvReviewHistoryController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await getBgvReviewHistory(req.params.caseId)
        );
    } catch (error) {
        return next(error);
    }
}

export async function hasBgvReviewDecisionController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await hasBgvReviewDecision(
                req.params.caseId,
                req.query.decision as any
            )
        );
    } catch (error) {
        return next(error);
    }
}

export async function deleteBgvReviewController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await deleteBgvReview(req.params.id)
        );
    } catch (error) {
        return next(error);
    }
}
