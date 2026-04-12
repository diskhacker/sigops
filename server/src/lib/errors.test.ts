import { describe, it, expect } from "vitest";
import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  errorResponse,
} from "./errors.js";

describe("errors", () => {
  it("AppError carries code, message, status, details", () => {
    const e = new AppError("CODE", "msg", 418, { a: 1 });
    expect(e.code).toBe("CODE");
    expect(e.status).toBe(418);
    expect(e.details).toEqual({ a: 1 });
  });

  it("NotFoundError 404", () => {
    const e = new NotFoundError("User");
    expect(e.status).toBe(404);
    expect(e.message).toBe("User not found");
  });

  it("ValidationError 400", () => {
    const e = new ValidationError("bad", { x: 1 });
    expect(e.status).toBe(400);
  });

  it("UnauthorizedError 401", () => {
    expect(new UnauthorizedError().status).toBe(401);
    expect(new UnauthorizedError("custom").message).toBe("custom");
  });

  it("ForbiddenError 403", () => {
    expect(new ForbiddenError().status).toBe(403);
    expect(new ForbiddenError("nope").message).toBe("nope");
  });

  it("errorResponse handles AppError", () => {
    const r = errorResponse(new NotFoundError("X"));
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe("NOT_FOUND");
  });

  it("errorResponse handles unknown", () => {
    const r = errorResponse(new Error("x"));
    expect(r.status).toBe(500);
    expect(r.body.error.code).toBe("INTERNAL_ERROR");
  });
});
