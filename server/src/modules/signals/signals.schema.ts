import { z } from "zod";

export const createSignalSchema = z.object({
  source: z.string().min(1),
  severity: z.enum(["critical", "warning", "info"]),
  title: z.string().min(1),
  body: z.record(z.unknown()),
});

export const updateSignalSchema = z.object({
  status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]).optional(),
  matchedWorkflowId: z.string().optional(),
});

export const searchSignalSchema = z.object({
  q: z.string().optional(),
  severity: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
});
