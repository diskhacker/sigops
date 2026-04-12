import { z } from "zod";

const agentStatusValues = ["ONLINE", "DEGRADED", "OFFLINE"] as const;

export const createAgentSchema = z.object({
  hostname: z.string().min(1),
  ipAddress: z.string().min(1).optional(),
  os: z.string().min(1).optional(),
  agentVersion: z.string().min(1),
  status: z.enum(agentStatusValues).optional(),
  labels: z.record(z.unknown()).optional(),
});

export const updateAgentSchema = z.object({
  status: z.enum(agentStatusValues).optional(),
  tools: z.array(z.unknown()).optional(),
  labels: z.record(z.unknown()).optional(),
  lastHeartbeat: z.coerce.date().optional(),
});

export const searchAgentSchema = z.object({
  status: z.enum(agentStatusValues).optional(),
});
