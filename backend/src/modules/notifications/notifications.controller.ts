import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import * as service from "./notifications.service";

export const inbox = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.inbox(req.auth!.sub, Number(req.query.limit) || 50);
  sendSuccess(res, result.data, result.unread);
});

export const markRead = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.markRead(req.auth!.sub, req.params.id)));
export const markAllRead = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.markAllRead(req.auth!.sub)));
export const history = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.history(req.auth!.sub, Number(req.query.limit) || 100)));
export const preferences = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.preferences(req.auth!.sub)));
export const updatePreference = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.updatePreference(req.auth!.sub, req.body.category, req.body.emailEnabled, req.body.inAppEnabled)));
export const templates = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await service.templates()));
export const catalog = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, service.mergeFieldCatalog()));
export const lint = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, service.lintTemplate(req.body.body)));
export const saveTemplate = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.saveTemplate(req.body, req.auth!.sub), undefined, 201));
export const sendTest = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.sendTest(req.params.id, req.auth!.sub, req.body.values || {})));
