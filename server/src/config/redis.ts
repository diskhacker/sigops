import { createClient, type RedisClientType } from "redis";
import { env } from "./env.js";
import { logger } from "./logger.js";

let redis: RedisClientType;

export async function getRedis(): Promise<RedisClientType> {
  if (!redis) {
    redis = createClient({ url: env.REDIS_URL });
    redis.on("error", (err) => logger.error({ err }, "Redis connection error"));
    await redis.connect();
    logger.info("Redis connected");
  }
  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
  }
}
