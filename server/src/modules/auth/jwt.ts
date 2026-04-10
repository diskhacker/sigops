import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "../../config/env.js";

export interface TokenPayload extends JWTPayload {
  sub: string;
  tid: string;
  email: string;
  name: string;
  roles: Record<string, string[]>;
  perms: Record<string, string[]>;
}

const secret = new TextEncoder().encode(env.JWT_SECRET);
const ISSUER = "uap";
const ACCESS_TOKEN_TTL = "15m";

export async function signAccessToken(payload: {
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  roles: Record<string, string[]>;
  perms: Record<string, string[]>;
}): Promise<string> {
  return new SignJWT({
    tid: payload.tenantId,
    email: payload.email,
    name: payload.name,
    roles: payload.roles,
    perms: payload.perms,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, secret, { issuer: ISSUER });
  return payload as TokenPayload;
}
