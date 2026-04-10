import { describe, it, expect } from "vitest";
import { paginationSchema, searchSchema, paginationMeta } from "./pagination.js";

describe("pagination", () => {
  describe("paginationSchema", () => {
    it("applies defaults", () => {
      const result = paginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortOrder).toBe("desc");
    });

    it("coerces string to number", () => {
      const result = paginationSchema.parse({ page: "3", limit: "50" });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(50);
    });

    it("rejects page < 1", () => {
      expect(paginationSchema.safeParse({ page: 0 }).success).toBe(false);
    });

    it("rejects limit > 100", () => {
      expect(paginationSchema.safeParse({ limit: 101 }).success).toBe(false);
    });
  });

  describe("searchSchema", () => {
    it("extends pagination with optional q", () => {
      const result = searchSchema.parse({ q: "test" });
      expect(result.q).toBe("test");
      expect(result.page).toBe(1);
    });

    it("works without q", () => {
      expect(searchSchema.safeParse({}).success).toBe(true);
    });
  });

  describe("paginationMeta", () => {
    it("calculates total pages correctly", () => {
      expect(paginationMeta(1, 20, 100)).toEqual({ page: 1, limit: 20, total: 100, totalPages: 5 });
      expect(paginationMeta(1, 20, 0)).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
      expect(paginationMeta(1, 20, 21)).toEqual({ page: 1, limit: 20, total: 21, totalPages: 2 });
    });
  });
});
