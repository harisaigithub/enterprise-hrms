import type { Request, Response, NextFunction } from "express";
import { BGVCaseStatus } from "@prisma/client";

import {
  countBgvStatusHistory,
  createBgvStatusHistory,
  getBgvCaseStatusHistory,
  getBgvStatusHistory,
  getLatestBgvStatusHistory,
  listBgvStatusHistory,
} from "./bgv.status-history.service";

export async function getBgvStatusHistoryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res.status(200).json(await getBgvStatusHistory(req.params.id));
  } catch (error) {
    return next(error);
  }
}

export async function listBgvStatusHistoryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res.status(200).json(
      await listBgvStatusHistory({
        caseId:
          typeof req.query.caseId === "string"
            ? req.query.caseId
            : undefined,
        changedById:
          typeof req.query.changedById === "string"
            ? req.query.changedById
            : undefined,
        fromStatus:
          typeof req.query.fromStatus === "string"
            ? (req.query.fromStatus as BGVCaseStatus)
            : undefined,
        toStatus:
          typeof req.query.toStatus === "string"
            ? (req.query.toStatus as BGVCaseStatus)
            : undefined,
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

export async function getBgvCaseStatusHistoryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res
      .status(200)
      .json(await getBgvCaseStatusHistory(req.params.caseId));
  } catch (error) {
    return next(error);
  }
}

export async function getLatestBgvStatusHistoryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res
      .status(200)
      .json(await getLatestBgvStatusHistory(req.params.caseId));
  } catch (error) {
    return next(error);
  }
}

export async function createBgvStatusHistoryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res.status(201).json(await createBgvStatusHistory(req.body));
  } catch (error) {
    return next(error);
  }
}

export async function countBgvStatusHistoryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res.status(200).json(
      await countBgvStatusHistory(
        typeof req.query.caseId === "string"
          ? req.query.caseId
          : undefined
      )
    );
  } catch (error) {
    return next(error);
  }
}
