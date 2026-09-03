import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import * as service from "./dashboard.service";

export const employee = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.employeeDashboard(req.auth!.sub)));
export const admin = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await service.adminDashboard()));
