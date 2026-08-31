import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import * as service from "./reports.service";

export const templates = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, service.getTemplates(req.auth)));
export const scope = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.getScope(req.auth)));
export const catalog = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, service.getCatalog(req.auth)));
export const standard = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.standard(req.body.templateId, req.body.filters, req.auth)));
export const custom = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.custom(req.body, req.auth)));
export const csv = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.exportCsv(req.body, req.auth)));
