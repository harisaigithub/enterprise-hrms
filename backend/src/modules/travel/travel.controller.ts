import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import { AppError } from "../../lib/errors";
import * as travelService from "./travel.service";

function actor(req: Request): travelService.TravelActor {
  if (!req.auth?.employeeId || !req.auth.employeeCode) throw AppError.forbidden("A linked employee profile is required");
  return {
    userId: req.auth.sub,
    employeeId: req.auth.employeeId,
    employeeCode: req.auth.employeeCode,
    role: req.auth.role,
    name: req.auth.name || `${req.auth.firstName ?? ""} ${req.auth.lastName ?? ""}`.trim() || req.auth.employeeCode,
  };
}

export const list = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, (await travelService.list(actor(req))).data));
export const create = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, (await travelService.create(req.body, actor(req))).data, undefined, 201));
export const resubmit = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, (await travelService.resubmit(req.params.id, req.body, actor(req))).data));
export const decide = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, (await travelService.decide(req.params.id, req.body, actor(req))).data));
export const book = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await travelService.book(req.params.id, req.body, actor(req))));
export const advance = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, (await travelService.disburseAdvance(req.params.id, Number(req.body.amount), actor(req))).data));
export const settlement = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, (await travelService.submitSettlement(req.params.id, Number(req.body.actualCost), req.body.notes, actor(req))).data));
export const closeSettlement = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, (await travelService.resolveSettlement(req.params.id, req.body, actor(req))).data));
export const passport = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, (await travelService.maskedPassport(actor(req))).data));
