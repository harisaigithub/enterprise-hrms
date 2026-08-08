import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";

/**
 * JWT verification middleware. Rejects if the token is missing/invalid or the
 * user has been deactivated. Sets `req.auth` for downstream RBAC checks.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw AppError.unauthorized("Authentication required");
    }
    const token = header.slice("Bearer ".length).trim();
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw AppError.unauthorized("Account is inactive");
    }

    req.auth = payload;
    next();
  } catch (err) {
    next(err);
  }
}

/** Optional auth — sets req.auth if a valid token is present, but never rejects. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      const payload = verifyAccessToken(header.slice("Bearer ".length).trim());
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (user?.isActive) req.auth = payload;
    }
  } catch {
    /* ignore invalid optional token */
  }
  next();
}
