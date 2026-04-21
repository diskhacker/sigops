import { Hono } from "hono";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { env } from "../config/env.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
let _version = "0.0.0";
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf-8"));
  _version = pkg.version ?? "0.0.0";
} catch {
  // package.json not found in dist — use default
}

const STARTED_AT = new Date().toISOString();

const health = new Hono();

health.get("/", (c) =>
  c.json({
    status: "ok",
    service: "sigops",
    version: _version,
    commit_sha: env.GIT_COMMIT,
    built_at: env.BUILD_TIME,
    uptime_seconds: Math.floor(process.uptime()),
  }),
);
health.get("/ready", (c) => c.json({ status: "ready" }));
health.get("/live", (c) => c.json({ status: "alive" }));

export { STARTED_AT };
export default health;
