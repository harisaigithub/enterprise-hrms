import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";

/** 404 handler for unmatched routes. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

interface ErrorResponse {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
}

/** Central error handler — never leaks stack traces (Golden Rule: no raw stack exposure). */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  const error = err as Error;
  const requestId = req.requestId ?? "unknown";

  let statusCode = 500;
  let message = "Internal server error";
  let code = "INTERNAL_ERROR";
  let details: unknown;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    details = err.details;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Map common Prisma errors to friendly HTTP errors
    if (err.code === "P2002") {
      statusCode = 409;
      code = "CONFLICT";
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(", ") : "record";
      message = `A record with the same value for ${target} already exists`;
    } else if (err.code === "P2025") {
      statusCode = 404;
      code = "NOT_FOUND";
      message = "The requested record was not found";
    } else if (err.code === "P2003") {
      statusCode = 400;
      code = "FK_CONSTRAINT";
      message = "Referenced record does not exist";
    } else {
      message = "Database error";
    }
  } else if (err instanceof SyntaxError && "body" in err) {
    statusCode = 400;
    code = "INVALID_JSON";
    message = "Malformed JSON in request body";
  }

  const body: ErrorResponse = { status: statusCode, message, code, details };
  if (process.env.NODE_ENV !== "production") body.details = details ?? error?.message;

  if (statusCode >= 500) {
    logger.error({ err, requestId, method: req.method, url: req.originalUrl }, message);
  } else {
    logger.warn({ requestId, method: req.method, url: req.originalUrl, code, status: statusCode }, message);
  }

  res.status(statusCode).json(body);
}
