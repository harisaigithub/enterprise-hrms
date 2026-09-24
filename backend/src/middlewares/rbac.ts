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

      const targetReference = req.params.id || req.params.employeeId;
      if (!targetReference) throw AppError.badRequest("Employee id is required");

      const role = auth.role?.toUpperCase();
      if (role === "ADMIN" || role === "HR") return next();

      if (!auth.employeeId) {
        throw AppError.forbidden("Account is not linked to an employee record");
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetReference);
      const target = await prisma.employee.findFirst({
        where: isUuid ? { id: targetReference } : { employeeCode: targetReference },
        select: { id: true, reportingManagerId: true },
      });
      if (!target) throw AppError.notFound("Employee not found");

      if (auth.employeeId === target.id) return next();

      if (role === "MANAGER" && options.allowManager) {
        const visited = new Set<string>();
        let managerId = target.reportingManagerId;
        while (managerId && !visited.has(managerId)) {
          if (managerId === auth.employeeId) return next();
          visited.add(managerId);
          const manager = await prisma.employee.findUnique({
            where: { id: managerId },
            select: { reportingManagerId: true },
          });
          managerId = manager?.reportingManagerId ?? null;
        }
      }

      throw AppError.forbidden("You cannot access another employee's private data");
    } catch (error) {
      next(error);
    }
  };
}
