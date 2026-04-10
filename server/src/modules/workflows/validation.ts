import { z } from "zod";

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  selCode: z.string().min(1),
  triggerRules: z.object({
    source: z.string().optional(),
    severityGte: z.enum(["info", "warning", "critical"]).optional(),
    titleMatch: z.string().optional(),
  }),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
});

export const updateWorkflowSchema = createWorkflowSchema.partial();
