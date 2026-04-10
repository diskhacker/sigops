import { z } from "zod";

export const triggerExecutionSchema = z.object({
  workflowId: z.string().min(1),
  signalId: z.string().optional(),
  agentId: z.string().optional(),
  triggerType: z.enum(["signal", "manual", "schedule"]).default("manual"),
  params: z.record(z.unknown()).optional(),
});

export const updateExecutionSchema = z.object({
  status: z.enum(["PENDING", "RUNNING", "SUCCESS", "FAILED", "ROLLED_BACK", "CANCELLED"]).optional(),
  riskScore: z.record(z.unknown()).optional(),
  error: z.record(z.unknown()).optional(),
});

export const createExecutionStepSchema = z.object({
  stepIndex: z.number().int().min(0),
  toolName: z.string().min(1),
  input: z.record(z.unknown()),
  agentId: z.string().optional(),
});

export const updateExecutionStepSchema = z.object({
  status: z.enum(["PENDING", "RUNNING", "SUCCESS", "FAILED", "SKIPPED"]).optional(),
  output: z.record(z.unknown()).optional(),
  error: z.string().optional(),
});
