import { Hono } from "hono";
import { checkDbConnection } from "../db/index.js";
import { getRedis } from "../config/redis.js";

export const healthRoutes = new Hono();

healthRoutes.get("/health", async (c) => {
  const dbOk = await checkDbConnection();

  let redisOk = false;
  try {
    const redis = await getRedis();
    const pong = await redis.ping();
    redisOk = pong === "PONG";
  } catch {
    redisOk = false;
  }

  const status = dbOk && redisOk ? "healthy" : "degraded";
  const code = status === "healthy" ? 200 : 503;

  return c.json(
    {
      status,
      product: "sigops",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      checks: {
        database: dbOk ? "ok" : "fail",
        redis: redisOk ? "ok" : "fail",
      },
    },
    code,
  );
});
