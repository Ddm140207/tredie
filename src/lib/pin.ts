import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * PIN primitives.
 *
 * Four digits on purpose: a chunk short enough to type in a music venue, and
 * short enough to brute-force if left unprotected. The PIN hash is scrypt with
 * a per-wallet salt, and the server rate-limits attempts (5 per 15 minutes per
 * wallet). That combination makes the weak-but-usable PIN credible as a
 * product lock — never as a real security boundary.
 */

export const PIN_LENGTH = 4;
export const MAX_PIN_ATTEMPTS = 5;
export const PIN_WINDOW_MS = 15 * 60 * 1000;

const PIN_RE = /^\d{4}$/;

export function isValidPin(pin: string): boolean {
  return PIN_RE.test(pin);
}

export interface PinHash {
  hash: string;
  salt: string;
}

/** scryptSync keeps this cheap enough for a request, expensive enough for a scan. */
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export function hashPin(pin: string): PinHash {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64, SCRYPT_OPTIONS).toString("hex");
  return { hash, salt };
}

export function verifyPin(pin: string, salt: string, hash: string): boolean {
  try {
    const candidate = scryptSync(pin, salt, 64, SCRYPT_OPTIONS);
    const expected = Buffer.from(hash, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

/** Whole seconds a wallet must wait after its most recent failed attempt. */
export function waitSecondsAfter(attemptedAtMs: number): number {
  return Math.max(0, Math.ceil((PIN_WINDOW_MS - (Date.now() - attemptedAtMs)) / 1000));
}