import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { requestId } from "./middleware/request-id.js";
import { healthRoutes } from "./routes/health.js";
import { signalRoutes } from "./modules/signals/routes.js";
import { signalRuleRoutes } from "./modules/signal-rules/routes.js";
import { workflowRoutes } from "./modules/workflows/routes.js";
import { executionRoutes } from "./modules/executions/routes.js";
import { agentRoutes } from "./modules/agents/routes.js";
import { toolRoutes } from "./modules/tools/routes.js";
import { scheduleRoutes } from "./modules/schedules/routes.js";

export function createApp() {
  const app = new Hono();

  app.use("*", requestId);
  app.use("*", cors());
  app.use("*", honoLogger());

  app.route("/api/v1", healthRoutes);
  app.route("/api/v1/signals", signalRoutes);
  app.route("/api/v1/signal-rules", signalRuleRoutes);
  app.route("/api/v1/workflows", workflowRoutes);
  app.route("/api/v1/executions", executionRoutes);
  app.route("/api/v1/agents", agentRoutes);
  app.route("/api/v1/tools", toolRoutes);
  app.route("/api/v1/schedules", scheduleRoutes);

  return app;
}
