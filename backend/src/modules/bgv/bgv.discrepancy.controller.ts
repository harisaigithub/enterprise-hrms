import type { NextFunction, Request, Response } from "express";

import {
  createBgvDiscrepancy,
  deleteBgvDiscrepancy,
  getBgvDiscrepancy,
  listBgvDiscrepancies,
  reopenBgvDiscrepancy,
  resolveBgvDiscrepancy,
  reviewBgvDiscrepancy,
} from "./bgv.discrepancy.service";

function sendData(res: Response, result: unknown) {
  return res.status(200).json(result);
}

export async function getBgvDiscrepancyController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return sendData(
      res,
      await getBgvDiscrepancy(req.params.id)
    );
  } catch (error) {
    return next(error);
  }
}

export async function listBgvDiscrepanciesController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return sendData(
      res,
      await listBgvDiscrepancies({
        caseId: req.query.caseId as string | undefined,
        verificationId:
          req.query.verificationId as string | undefined,
        level: req.query.level as any,
        status: req.query.status as any,
        raisedById: req.query.raisedById as string | undefined,
        resolvedById:
          req.query.resolvedById as string | undefined,
        page: req.query.page
          ? Number(req.query.page)
          : undefined,
        limit: req.query.limit
          ? Number(req.query.limit)
          : undefined,
      })
    );
  } catch (error) {
    return next(error);
  }
}

export async function createBgvDiscrepancyController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return res.status(201).json(
      await createBgvDiscrepancy(req.body)
    );
  } catch (error) {
    return next(error);
  }
}

export async function reviewBgvDiscrepancyController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return sendData(
      res,
      await reviewBgvDiscrepancy(req.params.id)
    );
  } catch (error) {
    return next(error);
  }
}

export async function resolveBgvDiscrepancyController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return sendData(
      res,
      await resolveBgvDiscrepancy(
        req.params.id,
        req.body
      )
    );
  } catch (error) {
    return next(error);
  }
}

export async function reopenBgvDiscrepancyController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    return sendData(
      res,
      await reopenBgvDiscrepancy(req.params.id)
    );
  } catch (error) {
    return next(error);
  }
}

export async function deleteBgvDiscrepancyController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await deleteBgvDiscrepancy(
      req.params.id
    );

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
