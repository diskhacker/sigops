import { z } from "zod";

export const createToolSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  type: z.string().min(1),
  description: z.string().min(1).optional(),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()).optional(),
});

export const updateToolSchema = z.object({
  description: z.string().min(1).optional(),
  inputSchema: z.record(z.unknown()).optional(),
  outputSchema: z.record(z.unknown()).optional(),
});

export const searchToolSchema = z.object({
  type: z.string().optional(),
  name: z.string().optional(),
});
