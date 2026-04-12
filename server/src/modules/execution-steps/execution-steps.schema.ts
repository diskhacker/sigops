import { z } from "zod";

const stepStatusValues = ["PENDING", "RUNNING", "SUCCESS", "FAILED", "SKIPPED"] as const;

export const createExecutionStepSchema = z.object({
  executionId: z.string().min(1),
  stepIndex: z.number().int(),
  toolName: z.string().min(1),
  input: z.record(z.unknown()),
  status: z.enum(stepStatusValues).optional(),
  agentId: z.string().min(1).optional(),
});

export const updateExecutionStepSchema = z.object({
  status: z.enum(stepStatusValues).optional(),
  output: z.record(z.unknown()).optional(),
  error: z.string().min(1).optional(),
  durationMs: z.number().int().optional(),
  retryCount: z.number().int().optional(),
});

export const searchExecutionStepSchema = z.object({
  executionId: z.string().optional(),
  status: z.enum(stepStatusValues).optional(),
  agentId: z.string().optional(),
});
