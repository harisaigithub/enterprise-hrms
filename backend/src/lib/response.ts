import type { Response } from "express";

/**
 * Standard response envelope. Every service returns `{ data }` (or `{ data, total }`
 * for lists) to match the frontend's mock contract (see docs/API.md).
 */
export function sendSuccess(res: Response, data: unknown, total?: number, status = 200): void {
  const body: Record<string, unknown> = { data };
  if (total !== undefined) body.total = total;
  res.status(status).json(body);
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
