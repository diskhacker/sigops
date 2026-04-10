import { describe, it, expect } from "vitest";
import { paginationSchema, getOffset, buildPageResponse } from "./pagination.js";

describe("pagination", () => {
  it("parses defaults", () => {
    const p = paginationSchema.parse({});
    expect(p.page).toBe(1);
    expect(p.pageSize).toBe(20);
  });

  it("parses custom page/pageSize", () => {
    const p = paginationSchema.parse({ page: "3", pageSize: "5" });
    expect(p.page).toBe(3);
    expect(p.pageSize).toBe(5);
  });

  it("rejects pageSize over 100", () => {
    expect(() => paginationSchema.parse({ pageSize: "101" })).toThrow();
  });

  it("getOffset", () => {
    expect(getOffset({ page: 1, pageSize: 20 })).toBe(0);
    expect(getOffset({ page: 3, pageSize: 10 })).toBe(20);
  });

  it("buildPageResponse", () => {
    const r = buildPageResponse([1, 2], 45, { page: 2, pageSize: 20 });
    expect(r.items).toEqual([1, 2]);
    expect(r.total).toBe(45);
    expect(r.totalPages).toBe(3);
  });
});
