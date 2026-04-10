import { z } from "zod";

export const createAgentSchema = z.object({
  hostname: z.string().min(1),
  ipAddress: z.string().min(1).optional(),
  os: z.string().min(1).optional(),
  version: z.string().min(1),
  status: z.string().min(1).optional(),
});

export const updateAgentSchema = z.object({
  status: z.string().min(1).optional(),
  tools: z.array(z.unknown()).optional(),
  lastHeartbeat: z.coerce.date().optional(),
});

export const searchAgentSchema = z.object({
  status: z.string().optional(),
});
