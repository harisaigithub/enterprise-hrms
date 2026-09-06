import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import { AppError } from "../../lib/errors";
import multer from "multer";
import * as service from "./candidateLifecycle.service";

export const listJobs = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await service.listPublicJobs()));
export const apply = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.submitApplication(req.body), undefined, 201));
export const portal = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.getPortal(req.params.token)));
export const decide = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.decideOffer(req.params.token, req.body.decision)));
export const candidateUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export async function uploadDocument(
  req: Request,
  res: Response
) {
  try {
    if (!req.file) {
      throw AppError.badRequest(
        "Document file is required"
      );
    }

    const document =
      await service.uploadDocument(
        req.params.token,
        {
          documentType: req.body.documentType,
          file: req.file,
        }
      );

    res.json({
      data: document,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to upload document",
    });
  }
}

export const listApplications = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await service.listLifecycleApplications()));
export const firstApprove = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.firstApprove(req.params.id, req.auth!.sub, req.body.notes)));
export const secondApprove = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.secondApprove(req.params.id, req.auth!.sub, req.body)));
export const reject = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.rejectApplication(req.params.id, req.auth!.sub, req.body.reason)));
export const verifyDocument = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.verifyDocument(req.params.id, req.auth!.sub, req.body)));
export const createEmployee = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.createEmployeeAccount(req.params.id), undefined, 201));
