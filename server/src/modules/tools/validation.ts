import { z } from "zod";

export const createToolSchema = z.object({
  name: z.string().min(1).max(200),
  version: z.string().min(1).max(50),
  type: z.enum(["builtin", "custom"]),
  description: z.string().max(1000).optional(),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()).optional(),
});

export const updateToolSchema = createToolSchema.partial().omit({ name: true, version: true });
