import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import * as service from "./dashboard.service";
import * as preferences from "./dashboard.preferences.service";

export const employee = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.employeeDashboard(req.auth!.sub)));
export const manager = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await service.managerDashboard(req.auth!.sub, req.auth!.employeeId, req.auth!.role)));
export const admin = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await service.adminDashboard()));
export const hr = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await service.hrDashboard()));
export const finance = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await service.financeDashboard()));

// ── Dashboard preferences (per-user layout) ──────────────────────────────
// Role + permissions always come from the verified JWT (req.auth), never from
// the request body, so clients cannot escalate which widgets they may store.

export const getPreferences = asyncHandler(async (req: Request, res: Response) => {
  const { sub, role, permissions } = req.auth!;
  sendSuccess(res, await preferences.getPreferences(sub, role, permissions ?? []));
});

export const savePreferences = asyncHandler(async (req: Request, res: Response) => {
  const { sub, role, permissions } = req.auth!;
  sendSuccess(res, await preferences.savePreferences(sub, role, permissions ?? [], req.body));
});

export const resetPreferences = asyncHandler(async (req: Request, res: Response) => {
  const { sub, role, permissions } = req.auth!;
  sendSuccess(res, await preferences.resetPreferences(sub, role, permissions ?? []));
});
