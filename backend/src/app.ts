import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import crypto from "crypto";
import { env, corsOrigins } from "./config/env";
import { logger } from "./lib/logger";
import { globalRateLimiter } from "./middlewares/rateLimiter";
import { notFoundHandler, errorHandler } from "./middlewares/errorHandler";
import { sendSuccess } from "./lib/response";
import { prisma } from "./lib/prisma";
import routes from "./routes";

const app = express();

app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Request logging + request id
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => (req.headers["x-request-id"] as string) || crypto.randomUUID(),
    customProps: (req) => ({ requestId: (req as Request & { id?: string }).id }),
    serializers: { req: (r) => ({ method: r.method, url: r.url }), res: (r) => ({ statusCode: r.statusCode }) },
    autoLogging: { ignore: (req) => req.url === "/api/health" },
  })
);

// Set requestId on the request object for error handler + audit correlation
app.use((req, _res, next) => {
  req.requestId = (req as Request & { id?: string }).id;
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiting
app.use("/api", globalRateLimiter);

// Health check (no auth)
app.get("/api/health", async (_req: Request, res: Response) => {
  let db = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "up";
  } catch {
    db = "down";
  }
  sendSuccess(res, { status: "ok", uptime: process.uptime(), db, env: env.NODE_ENV, timestamp: new Date().toISOString() });
});

// API routes
app.use("/api", routes);

// 404 + error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
