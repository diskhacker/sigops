import { describe, it, expect } from "vitest";
import { signAccessToken, verifyToken } from "./jwt.js";

describe("jwt", () => {
  const payload = {
    sub: "u1",
    tid: "t1",
    email: "a@b.c",
    name: "U",
    roles: ["admin"],
    perms: ["*"],
  };

  it("signs and verifies a token", async () => {
    const token = await signAccessToken(payload);
    const decoded = await verifyToken(token);
    expect(decoded.sub).toBe("u1");
    expect(decoded.tid).toBe("t1");
    expect(decoded.roles).toEqual(["admin"]);
  });

  it("rejects invalid token", async () => {
    await expect(verifyToken("garbage")).rejects.toThrow();
  });
});
