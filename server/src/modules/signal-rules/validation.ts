import { z } from "zod";

export const createSignalRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  condition: z.object({
    source: z.string().optional(),
    severityGte: z.enum(["info", "warning", "critical"]).optional(),
    titleRegex: z.string().optional(),
    bodyJsonpath: z.string().optional(),
  }),
  workflowId: z.string().optional(),
  dedupWindowSec: z.number().int().min(0).max(86400).default(300),
  suppressWindowSec: z.number().int().min(0).max(86400).optional(),
  priority: z.number().int().min(0).max(1000).default(0),
  isActive: z.boolean().default(true),
});

export const updateSignalRuleSchema = createSignalRuleSchema.partial();
