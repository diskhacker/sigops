import type { Hono } from "hono";
import type { JwtPayload } from "../modules/auth/jwt.js";

export interface AppVariables {
  user: JwtPayload;
  tenantId: string;
  requestId: string;
}

export type AppHono = Hono<{ Variables: AppVariables }>;
