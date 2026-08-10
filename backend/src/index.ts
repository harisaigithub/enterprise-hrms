import { env } from "./config/env";
import app from "./app";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";

const port = env.PORT;

const server = app.listen(port, () => {
  logger.info(`🚀 HRMS API listening on http://localhost:${port} (${env.NODE_ENV})`);
});

async function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("HTTP server closed, Prisma disconnected");
    process.exit(0);
  });
  // Force-exit after 10s if connections won't drain.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  process.exit(1);
});
