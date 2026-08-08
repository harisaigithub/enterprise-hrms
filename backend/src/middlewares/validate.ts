import type { NextFunction, Request, Response } from "express";
import type { AnyZodObject, ZodEffects, ZodError } from "zod";
import { AppError } from "../lib/errors";

type ZodSchema = AnyZodObject | ZodEffects<AnyZodObject>;

/**
 * Request validation middleware. Validates `req.body`, `req.params` and
 * `req.query` against a Zod schema and replaces them with the parsed values.
 */
export function validate(schema: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schema.params) req.params = schema.params.parse(req.params) as typeof req.params;
      if (schema.query) req.query = schema.query.parse(req.query) as typeof req.query;
      if (schema.body) req.body = schema.body.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof AppError) return next(err);
      const zodError = err as ZodError;
      next(
        AppError.validation(
          zodError.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          }))
        )
      );
    }
  };
}
