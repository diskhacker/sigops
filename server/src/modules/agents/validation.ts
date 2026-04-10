import { z } from "zod";

export const registerAgentSchema = z.object({
  hostname: z.string().min(1).max(255),
  ipAddress: z.string().optional(),
  os: z.string().optional(),
  agentVersion: z.string().min(1),
  labels: z.record(z.string()).optional(),
});

export const heartbeatSchema = z.object({
  status: z.enum(["ONLINE", "DEGRADED", "OFFLINE"]).default("ONLINE"),
  tools: z.array(z.string()).optional(),
});

export const updateAgentSchema = z.object({
  status: z.enum(["ONLINE", "DEGRADED", "OFFLINE"]).optional(),
  labels: z.record(z.string()).optional(),
});

export const registerAgentToolSchema = z.object({
  toolName: z.string().min(1),
  version: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
});
