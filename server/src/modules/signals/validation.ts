import { z } from "zod";

export const ingestSignalSchema = z.object({
  source: z.string().min(1).max(100),
  severity: z.enum(["critical", "warning", "info"]),
  title: z.string().min(1).max(500),
  body: z.record(z.unknown()),
  metadata: z.record(z.unknown()).optional(),
});

export const updateSignalSchema = z.object({
  status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED", "SUPPRESSED"]).optional(),
  resolvedBy: z.string().optional(),
});

export const searchSignalsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().max(200).optional(),
  severity: z.enum(["critical", "warning", "info"]).optional(),
  status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED", "SUPPRESSED"]).optional(),
  source: z.string().optional(),
});
