import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, toErrorResponse } from "@/lib/api";
import { MAX_PIN_ATTEMPTS, PIN_WINDOW_MS, verifyPin } from "@/lib/pin";
import { publicKeySchema } from "@/services/stellar";
import { getRepository } from "@/services/persistence";
import { attachWalletCookie, publicAccount } from "@/services/wallet-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unlockSchema = z.object({
  publicKey: publicKeySchema,
  pin: z.string().regex(/^\d{4}$/),
});

/** Unlocks a wallet that already has a PIN: rate-limited, server-verified. */
export async function POST(request: Request) {
  try {
    const body = unlockSchema.parse(await request.json());
    const repository = getRepository();

    const account = await repository.getWalletAccount(body.publicKey);
    if (!account) {
      return jsonError("This wallet has no PIN here yet. Set one first.", 404);
    }

    const attempts = await repository.countPinAttempts(
      body.publicKey,
      Date.now() - PIN_WINDOW_MS,
    );
    if (attempts >= MAX_PIN_ATTEMPTS) {
      return jsonError(
        "Too many wrong tries on this wallet. Try again in about 15 minutes.",
        429,
      );
    }

    if (!verifyPin(body.pin, account.pinSalt, account.pinHash)) {
      const remaining = MAX_PIN_ATTEMPTS - attempts - 1;
      await repository.recordPinAttempt(body.publicKey, Date.now());
      const message =
        remaining > 0
          ? `That PIN isn't right. ${remaining} tr${remaining === 1 ? "y" : "ies"} left in this window.`
          : "Too many wrong tries on this wallet. Try again in about 15 minutes.";
      return jsonError(message, remaining > 0 ? 401 : 429);
    }

    await repository.clearPinAttempts(body.publicKey);
    await repository.touchWalletUnlock(body.publicKey);

    const unlocked = await repository.getWalletAccount(body.publicKey);
    const response = NextResponse.json({
      account: unlocked ? publicAccount(unlocked) : publicAccount(account),
    });
    return attachWalletCookie(response, body.publicKey);
  } catch (error) {
    return toErrorResponse(error);
  }
}