import type { Request, Response, NextFunction } from "express";

import {
    countBgvAudits,
    createBgvAudit,
    getBgvAudit,
    getBgvCaseAuditTrail,
    getLatestBgvAudit,
    listBgvAudits,
} from "./bgv.audit.service";

export async function getBgvAuditController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await getBgvAudit(req.params.id)
        );
    } catch (error) {
        return next(error);
    }
}

export async function listBgvAuditsController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await listBgvAudits({
                caseId: req.query.caseId as string | undefined,
                actorId: req.query.actorId as string | undefined,
                action: req.query.action as string | undefined,
            })
        );
    } catch (error) {
        return next(error);
    }
}

export async function createBgvAuditController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(201).json(
            await createBgvAudit(req.body)
        );
    } catch (error) {
        return next(error);
    }
}

export async function getBgvCaseAuditTrailController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await getBgvCaseAuditTrail(req.params.caseId)
        );
    } catch (error) {
        return next(error);
    }
}

export async function getLatestBgvAuditController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await getLatestBgvAudit(req.params.caseId)
        );
    } catch (error) {
        return next(error);
    }
}

export async function countBgvAuditsController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        return res.status(200).json(
            await countBgvAudits(
                typeof req.query.caseId === "string"
                    ? req.query.caseId
                    : ""
            )
        );
    } catch (error) {
        return next(error);
    }
}
