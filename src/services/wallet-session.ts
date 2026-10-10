import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Wallet session cookie.
 *
 * Unlocking is a 30-day, signed, HttpOnly cookie (`tredie_wallet`) that only
 * names the address that was unlocked in this browser. The signature is an
 * HMAC over `publicKey.expiry` using `TREDIE_PIN_COOKIE_SECRET`.
 *
 * In dev with no secret configured we fall back to a per-process random key so
 * the app always boots — sessions just do not survive a restart, which is the
 * desired local behaviour anyway.
 */

export const WALLET_COOKIE_NAME = "tredie_wallet";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface SessionGlobals {
  __trediePinSecret?: string;
}

/**
 * The signed cookie secret.
 *
 * `TREDIE_PIN_COOKIE_SECRET` is the stable key; set it anywhere users will see
 * the app. Without it we fall back to a random per-process key so the app still
 * boots locally. That key is cached on `globalThis` rather than in a module
 * variable because Turbopack may instantiate this module once per server chunk
 * (routes vs pages) — with a module-local cache each copy would sign and verify
 * with different keys and every page gate would reject its own cookie.
 * Multi-instance deployments without the env secret accept this: sessions just
 * do not survive a restart, exactly like a plain dev fallback.
 */
function secret(): string {
  const configured = process.env.TREDIE_PIN_COOKIE_SECRET;
  if (configured) return configured;
  const globals = globalThis as SessionGlobals;
  if (!globals.__trediePinSecret) {
    globals.__trediePinSecret = createHmac(
      "sha256",
      `${process.pid}.${Date.now()}`,
    ).digest("base64url");
    console.warn(
      "[session] TREDIE_PIN_COOKIE_SECRET is not set — using a per-process random key. " +
        "Wallet sessions will not survive a server restart.",
    );
  }
  return globals.__trediePinSecret;
}

export function walletCookieName(): string {
  return WALLET_COOKIE_NAME;
}

export function signWalletToken(publicKey: string): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = Buffer.from(`${publicKey}.${exp}`, "utf8").toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

/** Returns the unlocked public key, or null when the token is absent/forged/expired. */
export function verifyWalletToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot === -1) return null;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const received = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (received.length !== wanted.length || !timingSafeEqual(received, wanted)) return null;

  const decoded = Buffer.from(payload, "base64url").toString("utf8");
  const sep = decoded.lastIndexOf(".");
  const publicKey = decoded.slice(0, sep);
  const exp = Number(decoded.slice(sep + 1));
  if (!PUBLIC_KEY_LIKE.test(publicKey) || !Number.isFinite(exp) || exp <= Date.now()) {
    return null;
  }
  return publicKey;
}

/** Reads and verifies the wallet cookie from an API route's Request. */
export function readWalletFromRequest(request: Pick<Request, "headers">): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  return verifyWalletToken(parseCookieHeader(cookieHeader)[WALLET_COOKIE_NAME] ?? null);
}

const PUBLIC_KEY_LIKE = /^G[A-Z2-7]{55}$/;

function parseCookieHeader(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}