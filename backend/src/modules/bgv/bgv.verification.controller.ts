import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/errors";
import {
    BGVDiscrepancyLevel,
    BGVVerificationResult,
    BGVVerificationStatus,
    BGVVerificationType,
} from "@prisma/client";

import {
    assignBgvVerification,
    cancelBgvVerification,
    changeBgvVerificationStatus,
    completeBgvVerification,
    createBgvVerification,
    getBgvVerification,
    listBgvVerifications,
    markBgvVerificationDiscrepancy,
    requestBgvCandidateAction,
    startBgvVerification,
    submitBgvVerification,
    updateBgvVerification,
    holdBgvVerification,
    unassignBgvVerification,
} from "./bgv.verification.service";

type AuthenticatedRequest = Request & {
    auth?: {
        sub?: string;
        userId?: string;
        role?: string;
        permissions?: string[];
        employeeId?: string;
        employeeCode?: string;
        firstName?: string;
        lastName?: string;
        name?: string;
    };
};

function requireActorEmployeeId(req: AuthenticatedRequest): string {
    const employeeId = req.auth?.employeeId;

    if (!employeeId) {
        throw AppError.badRequest("Authenticated employee is required");
    }

    return employeeId;
}

function sendData(res: Response, result: unknown) {
    return res.status(200).json(result);
}

export async function getBgvVerificationController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        return sendData(
            res,
            await getBgvVerification(
                req.params.id,
                req.auth?.employeeId,
                req.auth?.role
            )
        );
    } catch (error) {
        return next(error);
    }
}

export async function listBgvVerificationsController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const page = req.query.page
            ? Number(req.query.page)
            : undefined;

        const limit = req.query.limit
            ? Number(req.query.limit)
            : undefined;

        if (
            page !== undefined &&
            (!Number.isInteger(page) || page < 1)
        ) {
            return res.status(400).json({
                message: "page must be a positive integer",
            });
        }

        if (
            limit !== undefined &&
            (!Number.isInteger(limit) ||
                limit < 1 ||
                limit > 100)
        ) {
            return res.status(400).json({
                message: "limit must be an integer between 1 and 100",
            });
        }

        const result = await listBgvVerifications({
            caseId: req.query.caseId as string | undefined,
            type: req.query.type as
                | BGVVerificationType
                | undefined,
            status: req.query.status as
                | BGVVerificationStatus
                | undefined,
            result: req.query.result as
                | BGVVerificationResult
                | undefined,
            assignedToId: req.query.assignedToId as
                | string
                | undefined,
            vendorId: req.query.vendorId as
                | string
                | undefined,
            page,
            limit,
            currentEmployeeId: req.auth?.employeeId,
            currentRole: req.auth?.role,
        });

        return sendData(res, result);
    } catch (error) {
        return next(error);
    }
}

export async function createBgvVerificationController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        return res
            .status(201)
            .json(await createBgvVerification(req.body));
    } catch (error) {
        return next(error);
    }
}

export async function updateBgvVerificationController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        return sendData(
            res,
            await updateBgvVerification(
                req.params.id,
                req.body
            )
        );
    } catch (error) {
        return next(error);
    }
}

export async function assignBgvVerificationController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const assignedToId = req.body?.assignedToId;

        if (!assignedToId) {
            return res.status(400).json({
                message: "assignedToId is required",
            });
        }

        const assignedById =
            requireActorEmployeeId(req);

        return sendData(
            res,
            await assignBgvVerification(
                req.params.id,
                String(assignedToId),
                assignedById
            )
        );
    } catch (error) {
        return next(error);
    }
}

export async function unassignBgvVerificationController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const actorId = requireActorEmployeeId(req);

        return sendData(
            res,
            await unassignBgvVerification(
                req.params.id,
                actorId
            )
        );
    } catch (error) {
        return next(error);
    }
}

export async function changeBgvVerificationStatusController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const { status } = req.body ?? {};

        if (!status) {
            return res.status(400).json({
                message: "status is required",
            });
        }

        const actorId = requireActorEmployeeId(req);

        return sendData(
            res,
            await changeBgvVerificationStatus(
                req.params.id,
                String(status) as BGVVerificationStatus,
                actorId,
                req.auth?.role
            )
        );
    } catch (error) {
        return next(error);
    }
}

export async function startBgvVerificationController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const employeeId =
            requireActorEmployeeId(req);

        return sendData(
            res,
            await startBgvVerification(
                req.params.id,
                employeeId,
                req.auth?.role
            )
        );
    } catch (error) {
        return next(error);
    }
}

export async function submitBgvVerificationController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const { result, remarks } = req.body ?? {};

        if (!result) {
            return res.status(400).json({
                message: "result is required",
            });
        }

        const employeeId =
            requireActorEmployeeId(req);

        return sendData(
            res,
            await submitBgvVerification(
                req.params.id,
                String(result) as BGVVerificationResult,
                remarks === undefined ||
                remarks === null
                    ? undefined
                    : String(remarks),
                employeeId,
                req.auth?.role
            )
        );
    } catch (error) {
        return next(error);
    }
}

export async function completeBgvVerificationController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const { result, remarks } = req.body ?? {};

        if (!result) {
            return res.status(400).json({
                message: "result is required",
            });
        }

        const employeeId =
            requireActorEmployeeId(req);

        return sendData(
            res,
            await completeBgvVerification(
                req.params.id,
                String(result) as BGVVerificationResult,
                remarks === undefined ||
                remarks === null
                    ? undefined
                    : String(remarks),
                employeeId,
                req.auth?.role
            )
        );
    } catch (error) {
        return next(error);
    }
}

export async function markBgvVerificationDiscrepancyController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const { discrepancyLevel, remarks } =
            req.body ?? {};

        if (!discrepancyLevel) {
            return res.status(400).json({
                success: false,
                message: "discrepancyLevel is required",
            });
        }

        const employeeId =
            requireActorEmployeeId(req);

        return sendData(
            res,
            await markBgvVerificationDiscrepancy(
                req.params.id,
                discrepancyLevel as BGVDiscrepancyLevel,
                remarks === undefined ||
                remarks === null
                    ? undefined
                    : String(remarks),
                employeeId,
                employeeId,
                req.auth?.role
            )
        );
    } catch (error) {
        return next(error);
    }
}

export async function requestBgvCandidateActionController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const employeeId =
            requireActorEmployeeId(req);

        return sendData(
            res,
            await requestBgvCandidateAction(
                req.params.id,
                req.body?.remarks === undefined ||
                req.body?.remarks === null
                    ? undefined
                    : String(req.body.remarks),
                employeeId,
                req.auth?.role
            )
        );
    } catch (error) {
        return next(error);
    }
}

export async function holdBgvVerificationController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const employeeId =
            requireActorEmployeeId(req);

        return sendData(
            res,
            await holdBgvVerification(
                req.params.id,
                req.body?.remarks === undefined ||
                req.body?.remarks === null
                    ? undefined
                    : String(req.body.remarks),
                employeeId,
                req.auth?.role
            )
        );
    } catch (error) {
        return next(error);
    }
}

export async function cancelBgvVerificationController(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const employeeId =
            requireActorEmployeeId(req);

        return sendData(
            res,
            await cancelBgvVerification(
                req.params.id,
                req.body?.remarks === undefined ||
                req.body?.remarks === null
                    ? undefined
                    : String(req.body.remarks),
                employeeId,
                req.auth?.role
            )
        );
    } catch (error) {
        return next(error);
    }
}
