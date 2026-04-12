import { z } from "zod";

export const selValidateSchema = z.object({
  code: z.string().min(1),
});

export const selTestSchema = z.object({
  code: z.string().min(1),
  signal: z.object({
    source: z.string().optional(),
    severity: z.enum(["critical", "warning", "info"]).optional(),
    title: z.string().optional(),
    body: z.record(z.unknown()).optional(),
  }).optional(),
});

export const selDeploySchema = z.object({
  code: z.string().min(1),
  workflowId: z.string().uuid(),
});

export type SelValidate = z.infer<typeof selValidateSchema>;
export type SelTest = z.infer<typeof selTestSchema>;
export type SelDeploy = z.infer<typeof selDeploySchema>;
