import { Hono } from "hono";

const health = new Hono();

health.get("/", (c) => c.json({ status: "ok", service: "sigops" }));
health.get("/ready", (c) => c.json({ status: "ready" }));
health.get("/live", (c) => c.json({ status: "alive" }));

export default health;
