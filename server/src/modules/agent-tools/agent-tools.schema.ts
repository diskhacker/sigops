import { z } from "zod";

export const createAgentToolSchema = z.object({
  agentId: z.string().min(1),
  toolName: z.string().min(1),
  version: z.string().min(1).optional(),
  capabilities: z.array(z.unknown()).optional(),
});

export const updateAgentToolSchema = z.object({
  version: z.string().min(1).optional(),
  capabilities: z.array(z.unknown()).optional(),
});

export const searchAgentToolSchema = z.object({
  agentId: z.string().optional(),
  toolName: z.string().optional(),
});
