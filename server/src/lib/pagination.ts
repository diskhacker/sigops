import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

export function getOffset(p: Pagination): number {
  return (p.page - 1) * p.pageSize;
}

export function buildPageResponse<T>(
  items: T[],
  total: number,
  p: Pagination,
) {
  return {
    items,
    page: p.page,
    pageSize: p.pageSize,
    total,
    totalPages: Math.ceil(total / p.pageSize),
  };
}
