import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { env } from "../env.js";

export const SESSION_COOKIE = "shipyard_session";
const SESSION_VERSION = 1;
type SessionPayload = { v: number; exp: number; nonce: string };

const sign = (value: string) =>
  createHmac("sha256", env.SESSION_SECRET ?? env.SHIPYARD_PIN)
    .update(value)
    .digest("base64url");

export function isValidPin(pin: string | null | undefined) {
  if (!pin) return false;
  const candidate = Buffer.from(pin);
  const expected = Buffer.from(env.SHIPYARD_PIN);
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}

export function createSession(c: Context) {
  const maxAge = env.SESSION_TTL_HOURS * 60 * 60;
  const payload: SessionPayload = {
    v: SESSION_VERSION,
    exp: Date.now() + maxAge * 1_000,
    nonce: randomBytes(16).toString("base64url"),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  setCookie(c, SESSION_COOKIE, `${encoded}.${sign(encoded)}`, {
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export function clearSession(c: Context) {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

export function hasValidSession(c: Context) {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  const actual = Buffer.from(signature);
  const expected = Buffer.from(sign(encoded));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return false;
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString(),
    ) as SessionPayload;
    return payload.v === SESSION_VERSION && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function getClientIp(c: Context) {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    null
  );
}

export const auth = (): MiddlewareHandler => async (c, next) => {
  if (!hasValidSession(c)) return c.json({ error: "Unauthorized" }, 401);
  await next();
};
