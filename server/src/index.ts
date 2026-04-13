import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { env, logger } from "./config/index.js";
import { registerWithUap } from "./lib/uap-registration.js";

const app = createApp();

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info(`SigOps server listening on port ${info.port}`);
  registerWithUap().catch(() => {});
});

/* ─── Graceful shutdown ─── */
function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully…`);
  server.close(() => {
    logger.info("HTTP server closed, exiting");
    process.exit(0);
  });
  // Force exit after 10 seconds if connections are not drained
  setTimeout(() => {
    logger.warn("Forceful shutdown — timeout reached");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
