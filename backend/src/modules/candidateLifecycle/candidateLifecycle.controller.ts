import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import * as service from "./candidateLifecycle.service";

export const listJobs = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await service.listPublicJobs()));
export const apply = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.submitApplication(req.body), undefined, 201));
export const portal = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.getPortal(req.params.token)));
export const decide = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.decideOffer(req.params.token, req.body.decision)));
export const uploadDocument = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.uploadDocument(req.params.token, req.body), undefined, 201));

export const listApplications = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await service.listLifecycleApplications()));
export const firstApprove = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.firstApprove(req.params.id, req.auth!.sub, req.body.notes)));
export const secondApprove = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.secondApprove(req.params.id, req.auth!.sub, req.body)));
export const reject = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.rejectApplication(req.params.id, req.auth!.sub, req.body.reason)));
export const verifyDocument = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.verifyDocument(req.params.id, req.auth!.sub, req.body)));
export const createEmployee = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.createEmployeeAccount(req.params.id), undefined, 201));
