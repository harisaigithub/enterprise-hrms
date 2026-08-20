import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import * as authService from "./auth.service";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";

export const login = asyncHandler(async (req: Request, res: Response) => {
  const ip = req.ip ?? req.socket.remoteAddress ?? "";
  const result = await authService.login(req.body.email, req.body.password, ip);
  sendSuccess(res, result);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.refresh(req.body.refreshToken);
  sendSuccess(res, result);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw AppError.unauthorized();
  await authService.logout(req.auth.sub, req.body.refreshToken);
  sendSuccess(res, { message: "Logged out successfully" });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw AppError.unauthorized();
  await authService.changePassword(req.auth.sub, req.body.currentPassword, req.body.newPassword);
  sendSuccess(res, { message: "Password changed successfully. Please log in again." });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw AppError.unauthorized();
  const user = await prisma.user.findUnique({
    where: { id: req.auth.sub },
    include: {
      role: true,
      employee: { include: { designation: true } },
    },
  });
  if (!user) throw AppError.notFound("User not found");

  const avatar = user.employee
    ? `https://i.pravatar.cc/150?img=${Number(user.employee.employeeCode.replace(/\D/g, "")) || 1}`
    : "";

  sendSuccess(res, {
    user: {
      id: user.employee?.employeeCode ?? user.id,
      firstName: user.employee?.firstName ?? "",
      lastName: user.employee?.lastName ?? "",
      email: user.email,
      avatar,
      role: user.role.name,
      designation: user.employee?.designation?.title ?? "",
    },
    permissions: req.auth.permissions,
  });
});

export const authStatus = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, {
    activeLockouts: authService.getFailedLoginState().activeLockouts,
  });
});
