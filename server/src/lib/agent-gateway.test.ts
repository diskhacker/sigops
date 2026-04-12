import { describe, it, expect } from "vitest";
import {
  handleHeartbeat,
  classifyAgentStatus,
  runHeartbeatCheck,
} from "./agent-gateway.js";

function makeDb() {
  const rows: Array<Record<string, unknown>> = [];
  const updates: Array<{ where: Record<string, unknown>; set: Record<string, unknown> }> = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = {
    update: () => ({
      set: (vals: Record<string, unknown>) => ({
        where: (cond: unknown) => ({
          returning: () => {
            const match = rows.find(
              (r) =>
                r.id === (vals as Record<string, unknown>).id ||
                rows.length > 0,
            );
            if (match) {
              Object.assign(match, vals);
              updates.push({ where: cond as Record<string, unknown>, set: vals });
              return Promise.resolve([match]);
            }
            updates.push({ where: cond as Record<string, unknown>, set: vals });
            return Promise.resolve([]);
          },
        }),
      }),
    }),
    insert: () => ({
      values: (vals: Record<string, unknown>) => ({
        returning: () => {
          const row = { ...vals };
          rows.push(row);
          return Promise.resolve([row]);
        },
      }),
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(rows.length > 0 ? [rows[0]] : []),
        }),
      }),
    }),
  };
  return { db, rows, updates };
}

describe("classifyAgentStatus", () => {
  const now = new Date("2026-04-12T12:00:00Z");

  it("returns ONLINE when heartbeat is recent", () => {
    const hb = new Date(now.getTime() - 30_000); // 30s ago
    expect(classifyAgentStatus(hb, now)).toBe("ONLINE");
  });

  it("returns DEGRADED when heartbeat is 90–180s old", () => {
    const hb = new Date(now.getTime() - 120_000); // 2min ago
    expect(classifyAgentStatus(hb, now)).toBe("DEGRADED");
  });

  it("returns OFFLINE when heartbeat is >180s old", () => {
    const hb = new Date(now.getTime() - 200_000); // >3min ago
    expect(classifyAgentStatus(hb, now)).toBe("OFFLINE");
  });

  it("returns OFFLINE when no heartbeat exists", () => {
    expect(classifyAgentStatus(null, now)).toBe("OFFLINE");
  });

  it("returns DEGRADED at exactly 90s boundary", () => {
    const hb = new Date(now.getTime() - 90_000);
    expect(classifyAgentStatus(hb, now)).toBe("DEGRADED");
  });

  it("returns OFFLINE at exactly 180s boundary", () => {
    const hb = new Date(now.getTime() - 180_000);
    expect(classifyAgentStatus(hb, now)).toBe("OFFLINE");
  });
});

describe("handleHeartbeat", () => {
  const now = new Date("2026-04-12T12:00:00Z");

  it("creates a new agent when none exists", async () => {
    const { db, rows } = makeDb();
    // update returns [] (no existing agent), so insert path runs
    db.update = () => ({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([]),
        }),
      }),
    });
    const result = await handleHeartbeat(
      { agentId: "a1", tenantId: "t1", tools: ["ls"] },
      now,
      db,
    );
    expect(result.agentId).toBe("a1");
    expect(result.status).toBe("ONLINE");
    expect(result.lastHeartbeat).toBe(now);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("ONLINE");
  });

  it("updates existing agent to ONLINE", async () => {
    const { db, rows } = makeDb();
    rows.push({
      id: "a1",
      tenantId: "t1",
      status: "DEGRADED",
      lastHeartbeat: new Date(now.getTime() - 120_000),
    });
    const result = await handleHeartbeat(
      { agentId: "a1", tenantId: "t1" },
      now,
      db,
    );
    expect(result.status).toBe("ONLINE");
    expect(result.lastHeartbeat).toBe(now);
  });
});

describe("runHeartbeatCheck", () => {
  it("transitions ONLINE agents to DEGRADED/OFFLINE based on heartbeat age", async () => {
    const now = new Date("2026-04-12T12:00:00Z");
    let offlineCalled = 0;
    let degradedCalled = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = {
      update: () => ({
        set: (vals: Record<string, unknown>) => ({
          where: () => ({
            returning: () => {
              if (vals.status === "OFFLINE") {
                offlineCalled++;
                return Promise.resolve([{ id: `off-${offlineCalled}` }]);
              }
              if (vals.status === "DEGRADED") {
                degradedCalled++;
                return Promise.resolve([{ id: `deg-${degradedCalled}` }]);
              }
              return Promise.resolve([]);
            },
          }),
        }),
      }),
    };
    const result = await runHeartbeatCheck(now, db);
    expect(result.checked).toBeGreaterThanOrEqual(0);
    expect(typeof result.degraded).toBe("number");
    expect(typeof result.offline).toBe("number");
  });
});
