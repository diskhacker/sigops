import { serve } from "@hono/node-server";
import { env, logger } from "./config/index.js";
import { createApp } from "./app.js";

const app = createApp();

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info(`SigOps server running on port ${info.port}`);
});
