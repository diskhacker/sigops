import { z } from "zod";

export const createExecutionSchema = z.object({
  workflowId: z.string().min(1),
  signalId: z.string().min(1).optional(),
  agentId: z.string().min(1).optional(),
  triggerType: z.string().min(1),
  triggeredBy: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
});

export const updateExecutionSchema = z.object({
  status: z.string().min(1).optional(),
  agentId: z.string().min(1).optional(),
  riskScore: z.record(z.unknown()).optional(),
  error: z.record(z.unknown()).optional(),
  durationMs: z.number().int().optional(),
});

export const searchExecutionSchema = z.object({
  workflowId: z.string().optional(),
  status: z.string().optional(),
});
