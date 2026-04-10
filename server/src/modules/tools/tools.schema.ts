import { z } from "zod";

export const createToolSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  type: z.string().min(1),
  schema: z.record(z.unknown()),
  description: z.string().min(1).optional(),
});

export const updateToolSchema = z.object({
  version: z.string().min(1).optional(),
  schema: z.record(z.unknown()).optional(),
  description: z.string().min(1).optional(),
});

export const searchToolSchema = z.object({
  type: z.string().optional(),
});
