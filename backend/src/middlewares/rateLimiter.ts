import rateLimit from "express-rate-limit";
import { env } from "../config/env";
import { AppError } from "../lib/errors";

/** Global API rate limiter (per IP). */
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

/** Stricter limiter for the login endpoint (brute-force protection). */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20, // 20 attempts / 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, _res, next) =>
    next(new AppError(429, "Too many login attempts, please try again later", "RATE_LIMITED")),
});

/** Four-eyes / destructive actions limiter — more conservative. */
export const sensitiveRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});
