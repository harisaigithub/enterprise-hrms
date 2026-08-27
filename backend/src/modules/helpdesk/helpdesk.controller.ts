import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import * as service from "./helpdesk.service";

export const queues = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, service.listQueues(req.auth)));
export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listTickets(req.query as never, req.auth);
  sendSuccess(res, result.data, result.total);
});
export const detail = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.getTicket(req.params.id, req.auth)));
export const create = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.createTicket(req.body, req.auth), undefined, 201));
export const comment = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.addComment(req.params.id, req.body, req.auth), undefined, 201));
export const assign = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.assignTicket(req.params.id, req.body.assigneeEmployeeCode, req.auth)));
export const status = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.updateStatus(req.params.id, req.body, req.auth)));
export const reopen = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.reopenTicket(req.params.id, req.body.reason, req.auth)));
