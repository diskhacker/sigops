import { z } from "zod";

export const createScheduleSchema = z.object({
  workflowId: z.string().min(1),
  cronExpression: z.string().min(1).max(100),
  timezone: z.string().max(100).default("UTC"),
  isActive: z.boolean().default(true),
});

export const updateScheduleSchema = createScheduleSchema.partial();
