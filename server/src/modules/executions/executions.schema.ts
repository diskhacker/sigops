import { z } from "zod";

export const createExecutionSchema = z.object({
  workflowId: z.string().min(1),
  signalId: z.string().min(1).optional(),
  triggerType: z.string().min(1),
  status: z.string().min(1).optional(),
});

export const updateExecutionSchema = z.object({
  status: z.string().min(1).optional(),
  error: z.record(z.unknown()).optional(),
  durationMs: z.number().int().optional(),
});

export const searchExecutionSchema = z.object({
  workflowId: z.string().optional(),
  status: z.string().optional(),
});
