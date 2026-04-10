import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { env, logger } from "./config/index.js";

const app = createApp();

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info(`SigOps server listening on port ${info.port}`);
});
