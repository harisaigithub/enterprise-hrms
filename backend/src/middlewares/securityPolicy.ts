import type { NextFunction, Request, Response } from "express";
import { enforceIpRestriction } from "../services/security-policy.service";

/** Enforces an enabled Security Admin CIDR restriction for a sensitive action. */
export function requireAllowedIp(restrictionId: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const forwarded = req.get("x-forwarded-for") || "";
      const ip = forwarded || req.ip || req.socket.remoteAddress || "";
      await enforceIpRestriction(restrictionId, ip);
      next();
    } catch (error) {
      next(error);
    }
  };
}
