import { z } from "zod";

export const createWorkflowScheduleSchema = z.object({
  workflowId: z.string().min(1),
  cronExpression: z.string().min(1),
  timezone: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const updateWorkflowScheduleSchema = z.object({
  cronExpression: z.string().min(1).optional(),
  timezone: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const searchWorkflowScheduleSchema = z.object({
  workflowId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});
