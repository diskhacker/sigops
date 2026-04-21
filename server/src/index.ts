import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { env, logger } from "./config/index.js";
import { registerWithUap } from "./lib/uap-registration.js";
import { applyPersistedLogLevel } from "./modules/platform-config/platform-config.service.js";
import { runSpikeDetection } from "./lib/spike-detector.js";

const SPIKE_DETECTION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const app = createApp();

const server = serve({ fetch: app.fetch, port: env.PORT }, async (info) => {
  logger.info(`SigOps server listening on port ${info.port}`);

  // Apply persisted log level from DB on startup
  await applyPersistedLogLevel().catch((err) =>
    logger.warn({ err }, "Failed to apply persisted log level at startup"),
  );

  // Register with UAP (best-effort)
  registerWithUap().catch(() => {});

  // Spike detection cron — run immediately, then every 5 minutes
  runSpikeDetection().catch((err) =>
    logger.warn({ err }, "Initial spike detection run failed"),
  );
  const spikeInterval = setInterval(() => {
    runSpikeDetection().catch((err) =>
      logger.warn({ err }, "Spike detection run failed"),
    );
  }, SPIKE_DETECTION_INTERVAL_MS);
  spikeInterval.unref();
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
