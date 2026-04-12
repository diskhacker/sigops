import { z } from "zod";

export const createSignalRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  condition: z.record(z.unknown()),
  workflowId: z.string().min(1),
  dedupWindowSec: z.number().int().min(0).default(300),
  suppressWindowSec: z.number().int().min(0).optional(),
  priority: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateSignalRuleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  condition: z.record(z.unknown()).optional(),
  dedupWindowSec: z.number().int().min(0).optional(),
  suppressWindowSec: z.number().int().min(0).optional(),
  priority: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const searchSignalRuleSchema = z.object({
  workflowId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});
