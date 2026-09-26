import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import crypto from "crypto";
import { env, corsOrigins } from "./config/env";
import { logger } from "./lib/logger";
import { AppError } from "./lib/errors";
import { globalRateLimiter } from "./middlewares/rateLimiter";
import { notFoundHandler, errorHandler } from "./middlewares/errorHandler";
import { sendSuccess } from "./lib/response";
import {
  httpRequestsTotal,
  httpRequestDuration,
  httpErrorsTotal,
} from "./lib/metrics";
import { metricsRegistry } from "./lib/metrics";
import { prisma } from "./lib/prisma";
import routes from "./routes";
import fileRoutes from "./routes/file.routes";

const app = express();

app.set("trust proxy", 1);

// Security headers
// app.use(helmet());
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },

    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),

        "img-src": [
          "'self'",
          "data:",
          "blob:",
          "http://localhost:4000",
        ],

        "media-src": [
          "'self'",
          "blob:",
          "http://localhost:4000",
        ],
      },
    },
  })
);


// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
      return callback(AppError.forbidden("Not allowed by CORS"));
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

app.use((req, res, next) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationSeconds =
      Number(process.hrtime.bigint() - start) / 1_000_000_000;

    const route =
      req.route?.path ??
      req.path ??
      "unknown";

    const labels = {
      service: env.SERVICE_NAME ?? "hrms-api",
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);

    httpRequestDuration.observe(
      labels,
      durationSeconds
    );

    if (res.statusCode >= 400) {
      httpErrorsTotal.inc(labels);
    }
  });

  next();
});

// Return request ID to the client
app.use((req, res, next) => {
  const requestId =
    (req as Request & { id?: string }).id ??
    req.headers["x-request-id"]?.toString();

  if (requestId) {
    res.setHeader("X-Request-ID", requestId);
  }

  next();
});

// Set requestId on the request object for error handler + audit correlation
app.use((req, _res, next) => {
  req.requestId = (req as Request & { id?: string }).id;
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));


// =========================================================
// HEALTH / READINESS
// =========================================================

app.get("/api/health/live", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "UP",
    service: env.SERVICE_NAME ?? "hrms-api",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health/ready", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "READY",
      service: env.SERVICE_NAME ?? "hrms-api",
      checks: {
        database: "UP",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, "Readiness check failed");

    res.status(503).json({
      status: "NOT_READY",
      service: env.SERVICE_NAME ?? "hrms-api",
      checks: {
        database: "DOWN",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Backward compatibility
app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "UP",
      service: env.SERVICE_NAME ?? "hrms-api",
      database: "UP",
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: "DOWN",
      service: env.SERVICE_NAME ?? "hrms-api",
      database: "DOWN",
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/api/metrics", async (_req, res) => {
  res.setHeader(
    "Content-Type",
    metricsRegistry.contentType
  );

  res.end(await metricsRegistry.metrics());
});

// Global rate limiting
app.use("/api", globalRateLimiter);

app.use("/uploads", fileRoutes);

// API routes
app.use("/api", routes);

// 404 + error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
