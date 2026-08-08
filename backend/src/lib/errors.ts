/**
 * AppError — operational error with an HTTP status code and an optional
 * error code for programmatic handling by the frontend.
 *
 * Golden rules: never leak stack traces; errors are normalized on the client
 * to `{ status, message }`.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, code = "APP_ERROR", details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, message, "BAD_REQUEST", details);
  }

  static unauthorized(message = "Authentication required") {
    return new AppError(401, message, "UNAUTHORIZED");
  }

  static forbidden(message = "You do not have permission to perform this action") {
    return new AppError(403, message, "FORBIDDEN");
  }

  static notFound(message = "Resource not found") {
    return new AppError(404, message, "NOT_FOUND");
  }

  static conflict(message: string) {
    return new AppError(409, message, "CONFLICT");
  }

  static validation(details: unknown) {
    return new AppError(422, "Validation failed", "VALIDATION_ERROR", details);
  }
}
