import { describe, it, expect } from "vitest";
import { env } from "./env.js";

describe("env config", () => {
  it("loads required env vars", () => {
    expect(env.DATABASE_URL).toBeDefined();
    expect(env.REDIS_URL).toBeDefined();
    expect(env.JWT_SECRET).toBeDefined();
  });

  it("has correct defaults", () => {
    expect(env.PORT).toBe(4299);
    expect(env.NODE_ENV).toBe("test");
  });

  it("coerces PORT to number", () => {
    expect(typeof env.PORT).toBe("number");
  });

  it("validates LOG_LEVEL enum", () => {
    expect(["fatal", "error", "warn", "info", "debug", "trace"]).toContain(env.LOG_LEVEL);
  });
});
