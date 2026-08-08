import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import { AppError } from "../../lib/errors";
import * as employeeService from "./employee.service";
import { prisma } from "../../lib/prisma";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolve an `id` param that may be a UUID or an employee code to the DB PK. */
async function resolveEmployeeId(idOrCode: string): Promise<string> {
  if (UUID_RE.test(idOrCode)) return idOrCode;
  const emp = await prisma.employee.findUnique({ where: { employeeCode: idOrCode }, select: { id: true } });
  if (!emp) throw AppError.notFound("Employee not found");
  return emp.id;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await employeeService.listEmployees({
    search: q.search,
    department: q.department,
    status: q.status,
    page: q.page ? Number(q.page) : undefined,
    limit: q.limit ? Number(q.limit) : undefined,
  });
  sendSuccess(res, result.data, result.total);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  // Accept either the UUID PK or the human-readable employee code.
  const result = UUID_RE.test(id)
    ? await employeeService.getEmployeeById(id)
    : await employeeService.getEmployeeByCode(id);
  sendSuccess(res, result.data);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = await employeeService.createEmployee(req.body);
  sendSuccess(res, result.data, undefined, 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const pk = await resolveEmployeeId(req.params.id);
  const result = await employeeService.updateEmployee(pk, req.body);
  sendSuccess(res, result.data);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const pk = await resolveEmployeeId(req.params.id);
  const result = await employeeService.deleteEmployee(pk);
  sendSuccess(res, result.data);
});
