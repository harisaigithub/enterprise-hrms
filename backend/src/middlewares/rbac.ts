import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";

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

/**
 * Protect employee-owned resources such as documents, emergency contacts,
 * avatars and movement history.
 *
 * ADMIN/HR may access every employee. Employees may access only themselves.
 * Managers may optionally access direct reports when the route opts in.
 */
export function requireEmployeeScope(options: { allowManager?: boolean } = {}) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = req.auth;
      if (!auth) throw AppError.unauthorized("Authentication required");

      const targetEmployeeId = req.params.id || req.params.employeeId;
      if (!targetEmployeeId) throw AppError.badRequest("Employee id is required");

      const role = auth.role?.toUpperCase();
      if (role === "ADMIN" || role === "HR") return next();

      if (!auth.employeeId) {
        throw AppError.forbidden("Account is not linked to an employee record");
      }

      if (auth.employeeId === targetEmployeeId) return next();

      if (role === "MANAGER" && options.allowManager) {
        const directReport = await prisma.employee.findFirst({
          where: { id: targetEmployeeId, reportingManagerId: auth.employeeId },
          select: { id: true },
        });
        if (directReport) return next();
      }

      throw AppError.forbidden("You cannot access another employee's private data");
    } catch (error) {
      next(error);
    }
  };
}
