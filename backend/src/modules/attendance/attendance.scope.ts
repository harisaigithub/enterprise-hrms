import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";

export interface AttendanceActor {
  role: string;
  employeeId?: string;
}

/** This application currently has no tenant scope in its auth context. */
export function requireAttendanceReader(actor?: AttendanceActor): string {
  if (!actor) throw AppError.unauthorized();
  const role = actor.role?.toUpperCase();
  if (!["EMPLOYEE", "MANAGER", "HR", "ADMIN"].includes(role)) {
    throw AppError.forbidden("Your role cannot access attendance records");
  }
  if ((role === "EMPLOYEE" || role === "MANAGER") && !actor.employeeId) {
    throw AppError.forbidden("Account is not linked to an employee record");
  }
  return role;
}

/** null preserves the existing HR/Admin application-wide read scope. */
export async function attendanceEmployeeIds(actor?: AttendanceActor): Promise<string[] | null> {
  const role = requireAttendanceReader(actor);
  if (role === "HR" || role === "ADMIN") return null;
  const ownId = actor!.employeeId!;
  if (role === "EMPLOYEE") return [ownId];

  // Resolve live reporting relationships, not department membership.
  // Visited IDs stop malformed cycles from causing an infinite loop.
  const visited = new Set<string>([ownId]);
  let frontier = [ownId];
  while (frontier.length) {
    const reports = await prisma.employee.findMany({
      where: { reportingManagerId: { in: frontier } },
      select: { id: true },
    });
    const next: string[] = [];
    for (const report of reports) {
      if (!visited.has(report.id)) {
        visited.add(report.id);
        next.push(report.id);
      }
    }
    frontier = next;
  }
  return [...visited];
}
