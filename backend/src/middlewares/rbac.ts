import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors";

/**
 * RBAC permission guard. Permission strings use the `<module>:<action>` format
 * (e.g. `employees:write`) matching the frontend's ROLE_PERMISSIONS map
 * (frontend/src/context/AuthContext.jsx).
 *
 * `requireAll` = user must hold EVERY listed permission (AND).
 * `requireAll` = false → user must hold at least one (OR, default).
 */
export function requirePermission(permission: string, requireAll = false) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const auth = req.auth;
    if (!auth) throw AppError.unauthorized("Authentication required");

    const required = permission.split("|").map((p) => p.trim()).filter(Boolean);
    const has = (p: string) => auth.permissions.includes(p);

    const ok = requireAll ? required.every(has) : required.some(has);
    if (!ok) {
      throw AppError.forbidden(`Missing permission: ${permission}`);
    }
    next();
  };
}

/** Convenience: any of several permissions grants access (OR semantics). */
export function requireAnyPermission(...permissions: string[]) {
  return requirePermission(permissions.join("|"));
}


/**
 * Role guard.
 * Allows access only when the authenticated user's role
 * matches one of the supplied roles.
 *
 * Example:
 * requireRole("ADMIN")
 * requireRole("ADMIN", "HR")
 */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const auth = req.auth;

    if (!auth) {
      throw AppError.unauthorized("Authentication required");
    }

    const normalizedRoles = roles.map((role) => role.toUpperCase());
    const userRole = auth.role?.toUpperCase();

    if (!userRole || !normalizedRoles.includes(userRole)) {
      throw AppError.forbidden(
        `This action requires one of the following roles: ${roles.join(", ")}`
      );
    }

    next();
  };
}
