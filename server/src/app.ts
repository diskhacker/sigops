import { Hono } from "hono";
import { ZodError } from "zod";
import { requestId } from "./middleware/request-id.js";
import { AppError, errorResponse } from "./lib/errors.js";
import health from "./routes/health.js";
import signals from "./modules/signals/signals.routes.js";
import workflows from "./modules/workflows/workflows.routes.js";
import executions from "./modules/executions/executions.routes.js";
import agents from "./modules/agents/agents.routes.js";
import tools from "./modules/tools/tools.routes.js";
import signalRules from "./modules/signal-rules/signal-rules.routes.js";
import workflowSchedules from "./modules/workflow-schedules/workflow-schedules.routes.js";
import executionSteps from "./modules/execution-steps/execution-steps.routes.js";
import agentTools from "./modules/agent-tools/agent-tools.routes.js";
import ingest from "./modules/ingest/ingest.routes.js";
import stats from "./modules/stats/stats.routes.js";

export function createApp() {
  const app = new Hono();

  app.use("*", requestId);

  app.onError((err, c) => {
    if (err instanceof ZodError) {
      return c.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: err.issues } },
        400,
      );
    }
    if (err instanceof AppError) {
      const { status, body } = errorResponse(err);
      return c.json(body, status as 400 | 401 | 403 | 404 | 500);
    }
    return c.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      500,
    );
  });

  app.route("/health", health);
  app.route("/api/v1/signals", signals);
  app.route("/api/v1/workflows", workflows);
  app.route("/api/v1/executions", executions);
  app.route("/api/v1/agents", agents);
  app.route("/api/v1/tools", tools);
  app.route("/api/v1/signal-rules", signalRules);
  app.route("/api/v1/workflow-schedules", workflowSchedules);
  app.route("/api/v1/execution-steps", executionSteps);
  app.route("/api/v1/agent-tools", agentTools);
  app.route("/api/v1/ingest", ingest);
  app.route("/api/v1/stats", stats);

  return app;
}
