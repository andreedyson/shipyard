import { timingSafeEqual } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import { env } from "../env.js";

export const PIN_HEADER = "x-shipyard-pin";
export const PIN_QUERY_PARAM = "pin";

export function isValidPin(pin: string | null | undefined) {
  if (!pin) {
    return false;
  }

  const candidate = Buffer.from(pin);
  const expected = Buffer.from(env.SHIPYARD_PIN);

  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}

export const auth = (): MiddlewareHandler => async (c, next) => {
  const pin = c.req.header(PIN_HEADER) ?? c.req.query(PIN_QUERY_PARAM);

  if (!isValidPin(pin)) {
    return c.json({ error: "Invalid PIN" }, 401);
  }

  await next();
};
