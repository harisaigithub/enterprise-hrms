import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import * as service from "./ess.service";

export const overview = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.getOverview(req.auth!.sub)));
export const taxDeclarations = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.listTaxDeclarations(req.auth!.sub)));
export const submitTaxDeclaration = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.submitTaxDeclaration(req.auth!.sub, req.body), undefined, 201));
export const lastExport = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.getLastExportRequest(req.auth!.sub)));
export const requestExport = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.requestDataExport(req.auth!.sub), undefined, 201));
