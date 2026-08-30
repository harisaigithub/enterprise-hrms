import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import * as service from "./compliance.service";

export const dashboard = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await service.dashboard()));
export const obligations = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await service.listObligations()));
export const createObligation = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.createObligation(req.body, req.auth), undefined, 201));
export const markFiled = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { obligation: await service.markFiled(req.params.id, req.auth) }));
export const cases = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await service.caseSummaries()));
export const caseDetail = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { case: await service.caseDetail(req.params.id, req.auth) }));
export const applyCaseHold = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { case: await service.setCaseHold(req.params.id, req.body.reason, req.auth) }));
export const clearCaseHold = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { case: await service.setCaseHold(req.params.id, null, req.auth) }));
export const retention = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await service.listRetention()));
export const applyRecordHold = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { record: await service.setRecordHold(req.params.id, req.body.reason, req.auth) }));
export const clearRecordHold = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { record: await service.setRecordHold(req.params.id, null, req.auth) }));
export const runRetention = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.runRetention(req.auth)));
export const audit = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.auditFeed(req.query)));
export const activities = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await service.activities()));
