import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import * as service from "./policies.service";

export const list = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.listPolicies(req.auth)));
export const create = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.createPolicy(req.body, req.auth), undefined, 201));
export const addVersion = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.addVersion(req.params.id, req.body, req.auth), undefined, 201));
export const publish = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.publishPolicy(req.params.id, req.auth)));
export const mine = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.getMyAcknowledgements(req.auth)));
export const acknowledge = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.acknowledgePolicy(req.params.id, req.body.versionId, req.get("user-agent"), req.auth), undefined, 201));
export const compliance = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.getComplianceData(req.auth)));
