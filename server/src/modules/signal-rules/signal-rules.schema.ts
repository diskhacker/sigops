import { z } from "zod";

export const createSignalRuleSchema = z.object({
  name: z.string().min(1),
  pattern: z.record(z.unknown()),
  workflowId: z.string().min(1),
  priority: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateSignalRuleSchema = z.object({
  name: z.string().min(1).optional(),
  pattern: z.record(z.unknown()).optional(),
  priority: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const searchSignalRuleSchema = z.object({
  workflowId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});
