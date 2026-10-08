import type { Request, Response, NextFunction } from "express";

import {
  closeBgvAssignmentHistory,
  countBgvAssignments,
  createBgvAssignmentHistory,
  getActiveBgvAssignment,
  getBgvAssignmentHistory,
  getBgvCaseAssignmentHistory,
  listBgvAssignmentHistory,
  updateBgvAssignmentHistory,
} from "./bgv.assignment-history.service";

export async function getBgvAssignmentHistoryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res.status(200).json(await getBgvAssignmentHistory(req.params.id));
  } catch (error) {
    return next(error);
  }
}

export async function listBgvAssignmentHistoryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res.status(200).json(
      await listBgvAssignmentHistory({
        caseId:
          typeof req.query.caseId === "string"
            ? req.query.caseId
            : undefined,
        assignedToId:
          typeof req.query.assignedToId === "string"
            ? req.query.assignedToId
            : undefined,
        vendorId:
          typeof req.query.vendorId === "string"
            ? req.query.vendorId
            : undefined,
        assignedById:
          typeof req.query.assignedById === "string"
            ? req.query.assignedById
            : undefined,
        activeOnly:
          req.query.active === undefined
            ? undefined
            : req.query.active === "true",
        page:
          req.query.page === undefined ? undefined : Number(req.query.page),
        limit:
          req.query.limit === undefined ? undefined : Number(req.query.limit),
      })
    );
  } catch (error) {
    return next(error);
  }
}

export async function getBgvCaseAssignmentHistoryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res
      .status(200)
      .json(await getBgvCaseAssignmentHistory(req.params.caseId));
  } catch (error) {
    return next(error);
  }
}

export async function getActiveBgvAssignmentController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res
      .status(200)
      .json(await getActiveBgvAssignment(req.params.caseId));
  } catch (error) {
    return next(error);
  }
}

export async function createBgvAssignmentHistoryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res
      .status(201)
      .json(await createBgvAssignmentHistory(req.body));
  } catch (error) {
    return next(error);
  }
}

export async function closeBgvAssignmentHistoryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const endedAt =
      req.body?.endedAt === undefined ? undefined : req.body.endedAt;

    return res
      .status(200)
      .json(await closeBgvAssignmentHistory(req.params.id, endedAt));
  } catch (error) {
    return next(error);
  }
}

export async function updateBgvAssignmentHistoryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res
      .status(200)
      .json(await updateBgvAssignmentHistory(req.params.id, req.body));
  } catch (error) {
    return next(error);
  }
}

export async function countBgvAssignmentsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res.status(200).json(
      await countBgvAssignments(
        typeof req.query.caseId === "string"
          ? req.query.caseId
          : undefined
      )
    );
  } catch (error) {
    return next(error);
  }
}
