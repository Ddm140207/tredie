import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, toErrorResponse } from "@/lib/api";
import { hashPin, isValidPin } from "@/lib/pin";
import { publicKeySchema } from "@/services/stellar";
import { getStellarSettings } from "@/services/stellar/config";
import { getRepository } from "@/services/persistence";
import { attachWalletCookie, publicAccount } from "@/services/wallet-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const registerSchema = z.object({
  publicKey: publicKeySchema,
  pin: z.string().regex(/^\d{4}$/),
  displayName: z.string().trim().max(32).optional(),
});

/** Sets a 4-digit PIN for a wallet and unlocks this browser. */
export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    if (!isValidPin(body.pin)) {
      return jsonError("Your PIN is four digits, 0000 to 9999.", 422);
    }

    const repository = getRepository();
    const existing = await repository.getWalletAccount(body.publicKey);
    if (existing) {
      return jsonError("This wallet already has a PIN here. Enter it to unlock.", 409);
    }

    const { hash, salt } = hashPin(body.pin);
    const account = await repository.createWalletAccount({
      walletAddress: body.publicKey,
      displayName: body.displayName?.trim() || null,
      pinHash: hash,
      pinSalt: salt,
      network: getStellarSettings().network,
    });

    const response = NextResponse.json({ account: publicAccount(account) }, { status: 201 });
    return attachWalletCookie(response, account.walletAddress);
  } catch (error) {
    return toErrorResponse(error);
  }
}