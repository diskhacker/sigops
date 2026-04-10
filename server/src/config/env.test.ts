import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { loadEnv } from "./env.js";

const original = { ...process.env };

describe("env", () => {
  beforeEach(() => {
    process.env = { ...original };
  });
  afterEach(() => {
    process.env = { ...original };
  });

  it("parses defaults", () => {
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    const env = loadEnv();
    expect(env.PORT).toBe(4200);
  });

  it("parses custom port", () => {
    process.env.PORT = "5555";
    const env = loadEnv();
    expect(env.PORT).toBe(5555);
  });

  it("rejects short JWT_SECRET", () => {
    process.env.JWT_SECRET = "short";
    expect(() => loadEnv()).toThrow(/Invalid env/);
  });

  it("accepts all log levels", () => {
    process.env.LOG_LEVEL = "debug";
    expect(loadEnv().LOG_LEVEL).toBe("debug");
  });
});
