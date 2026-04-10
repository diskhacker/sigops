import { describe, it, expect } from "vitest";
import { signAccessToken, verifyToken } from "./jwt.js";

describe("jwt", () => {
  it("signs and verifies an access token", async () => {
    const token = await signAccessToken({
      userId: "u1",
      tenantId: "t1",
      email: "a@b.com",
      name: "Alice",
      roles: { sigops: ["operator"] },
      perms: { sigops: ["signals:*"] },
    });
    const payload = await verifyToken(token);
    expect(payload.sub).toBe("u1");
    expect(payload.tid).toBe("t1");
    expect(payload.email).toBe("a@b.com");
    expect(payload.name).toBe("Alice");
    expect(payload.roles.sigops).toEqual(["operator"]);
    expect(payload.perms.sigops).toEqual(["signals:*"]);
  });

  it("rejects invalid tokens", async () => {
    await expect(verifyToken("not-a-token")).rejects.toThrow();
  });
});
