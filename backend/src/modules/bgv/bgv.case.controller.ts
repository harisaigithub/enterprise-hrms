import type { NextFunction, Request, Response } from "express";
import { BGVCaseStatus, BGVPriority } from "@prisma/client";
import {
  assignBgvVerifier,
  changeBgvCaseStatus,
  createBgvCase,
  getBgvCase,
  initiateBgvCase,
  listBgvCases,
  setFinalBgvDecision,
  unassignBgvVerifier,
  updateBgvCase,
} from "./bgv.case.service";

/**
 * BGV Case controller.
 *
 * The controller intentionally keeps business rules inside the service layer.
 * It only:
 * - reads HTTP input
 * - calls the service
 * - sends a consistent JSON response
 * - forwards errors to the existing Express error middleware
 *
 * Authentication middleware in the application should populate:
 *   req.user.employeeId
 *
 * The fallback to req.body.* is kept only for compatibility with existing
 * project controllers while the auth middleware is being wired in.
 */

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

function actorEmployeeId(req: AuthenticatedRequest) {
  return req.auth?.employeeId ?? req.body?.assignedById ?? req.body?.changedById;
}

function sendData(res: Response, result: unknown) {
  return res.status(200).json(result);
}

export async function getBgvCaseController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await getBgvCase(req.params.id,req.auth?.employeeId,
    req.auth?.role);
    return sendData(res, result);
  } catch (error) {
    return next(error);
  }
}

export async function listBgvCasesController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await listBgvCases({
      status: req.query.status as BGVCaseStatus | undefined,
      priority: req.query.priority as BGVPriority | undefined,
      candidateId: req.query.candidateId as string | undefined,
      employeeId: req.query.employeeId as string | undefined,
      applicationId: req.query.applicationId as string | undefined,
      assignedVerifierId:
        req.query.assignedVerifierId as string | undefined,
      vendorId: req.query.vendorId as string | undefined,
      overdue:
        req.query.overdue === undefined
          ? undefined
          : String(req.query.overdue).toLowerCase() === "true",
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      currentEmployeeId:
        req.auth?.employeeId,

      currentRole:
        req.auth?.role,
    });

    return sendData(res, result);
  } catch (error) {
    return next(error);
  }
}

export async function createBgvCaseController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await createBgvCase(req.body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function updateBgvCaseController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await updateBgvCase(req.params.id, req.body);
    return sendData(res, result);
  } catch (error) {
    return next(error);
  }
}

export async function initiateBgvCaseController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await initiateBgvCase(req.params.id);
    return sendData(res, result);
  } catch (error) {
    return next(error);
  }
}

export async function assignBgvVerifierController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const assignedToId = req.body?.assignedToId;
    const assignedById = actorEmployeeId(req);

    if (!assignedToId) {
      return res.status(400).json({
        message: "assignedToId is required",
      });
    }

    if (!assignedById) {
      return res.status(400).json({
        message: "Authenticated employee is required",
      });
    }

    const result = await assignBgvVerifier(
      req.params.id,
      String(assignedToId),
      String(assignedById)
    );

    return sendData(res, result);
  } catch (error) {
    return next(error);
  }
}

export async function unassignBgvVerifierController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const assignedById = actorEmployeeId(req);

    if (!assignedById) {
      return res.status(400).json({
        message: "Authenticated employee is required",
      });
    }

    const result = await unassignBgvVerifier(
      req.params.id,
      String(assignedById)
    );

    return sendData(res, result);
  } catch (error) {
    return next(error);
  }
}

export async function changeBgvCaseStatusController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { status } = req.body ?? {};
    const changedById = actorEmployeeId(req);

    if (!status) {
      return res.status(400).json({
        message: "status is required",
      });
    }

    const result = await changeBgvCaseStatus(
      req.params.id,
      String(status) as Parameters<typeof changeBgvCaseStatus>[1],
      changedById ? String(changedById) : undefined
    );

    return sendData(res, result);
  } catch (error) {
    return next(error);
  }
}

export async function setFinalBgvDecisionController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      finalResult,
      finalDecision,
      reviewedById,
      reviewRemarks,
    } = req.body ?? {};

    const reviewerId =
      reviewedById ?? req.auth?.employeeId;

    if (!finalResult || !finalDecision) {
      return res.status(400).json({
        message: "finalResult and finalDecision are required",
      });
    }

    if (!reviewerId) {
      return res.status(400).json({
        message: "Reviewer employee is required",
      });
    }

    const result = await setFinalBgvDecision(
      req.params.id,
      String(finalResult) as Parameters<typeof setFinalBgvDecision>[1],
      String(finalDecision) as Parameters<typeof setFinalBgvDecision>[2],
      String(reviewerId),
      reviewRemarks === undefined || reviewRemarks === null
        ? undefined
        : String(reviewRemarks)
    );

    return sendData(res, result);
  } catch (error) {
    return next(error);
  }
}
