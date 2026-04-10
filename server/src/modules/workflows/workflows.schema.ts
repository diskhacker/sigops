import { z } from "zod";

export const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  selCode: z.string().min(1),
  triggerRules: z.record(z.unknown()),
  isActive: z.boolean().optional(),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  selCode: z.string().min(1).optional(),
  triggerRules: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export const searchWorkflowSchema = z.object({
  isActive: z.coerce.boolean().optional(),
});
