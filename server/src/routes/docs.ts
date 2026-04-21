import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";
import { env } from "../config/env.js";

const docs = new Hono();

const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "SigOps API",
    description: "Incident response automation platform API",
    version: "0.1.0",
  },
  servers: [{ url: `http://localhost:${env.PORT}` }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Signal: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          source: { type: "string" },
          severity: { type: "string", enum: ["critical", "warning", "info"] },
          title: { type: "string" },
          status: { type: "string", enum: ["OPEN", "ACKNOWLEDGED", "RESOLVED", "SUPPRESSED"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Execution: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          workflowId: { type: "string" },
          signalId: { type: "string" },
          status: { type: "string", enum: ["PENDING", "RUNNING", "SUCCESS", "FAILED", "ROLLED_BACK", "CANCELLED"] },
          durationMs: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        security: [],
        responses: {
          "200": {
            description: "Service healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    service: { type: "string", example: "sigops" },
                    version: { type: "string" },
                    commit_sha: { type: "string" },
                    built_at: { type: "string" },
                    uptime_seconds: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/signals": {
      post: {
        tags: ["Signals"],
        summary: "Ingest a signal",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["source", "severity", "title", "body", "fingerprint"],
                properties: {
                  source: { type: "string", description: "Signal source identifier" },
                  severity: { type: "string", enum: ["critical", "warning", "info"] },
                  title: { type: "string" },
                  body: { type: "object", additionalProperties: true },
                  fingerprint: { type: "string", description: "Deduplication key" },
                  metadata: { type: "object", additionalProperties: true },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Signal created",
            content: { "application/json": { schema: { "$ref": "#/components/schemas/Signal" } } },
          },
          "400": { description: "Validation error", content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } } },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/executions": {
      get: {
        tags: ["Executions"],
        summary: "List executions",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20 } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "trace_id", in: "query", schema: { type: "string", format: "uuid" }, description: "Filter by trace ID" },
        ],
        responses: {
          "200": {
            description: "Paginated execution list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { "$ref": "#/components/schemas/Execution" } },
                    total: { type: "integer" },
                    page: { type: "integer" },
                    pageSize: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Executions"],
        summary: "Create an execution",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["workflowId", "triggerType"],
                properties: {
                  workflowId: { type: "string", format: "uuid" },
                  signalId: { type: "string", format: "uuid" },
                  triggerType: { type: "string" },
                  triggeredBy: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Execution created", content: { "application/json": { schema: { "$ref": "#/components/schemas/Execution" } } } },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/executions/{id}": {
      get: {
        tags: ["Executions"],
        summary: "Get execution detail",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Execution detail", content: { "application/json": { schema: { "$ref": "#/components/schemas/Execution" } } } },
          "404": { description: "Not found" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/trace/{trace_id}": {
      get: {
        tags: ["Trace"],
        summary: "Get full trace by ID",
        parameters: [{ name: "trace_id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Trace data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    trace_id: { type: "string" },
                    executions: { type: "array", items: { "$ref": "#/components/schemas/Execution" } },
                    steps: { type: "array" },
                    signals: { type: "array" },
                    duration_ms: { type: "integer" },
                    status: { type: "string", enum: ["success", "failed", "partial", "in_progress"] },
                  },
                },
              },
            },
          },
          "404": { description: "Trace not found" },
          "401": { description: "Unauthorized" },
        },
      },
    },
  },
};

// Only expose /docs when SWAGGER_ENABLED=true or not in production
const swaggerEnabled =
  env.NODE_ENV !== "production" || process.env.SWAGGER_ENABLED === "true";

if (swaggerEnabled) {
  docs.get("/json", (c) => c.json(openApiSpec));
  docs.get("/", swaggerUI({ url: "/docs/json" }));
}

export { openApiSpec, swaggerEnabled };
export default docs;
