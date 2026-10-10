import { after, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, toErrorResponse } from "@/lib/api";
import { getStellarSettings } from "@/services/stellar/config";
import { publicKeySchema, verifyPayment } from "@/services/stellar";
import { getRepository } from "@/services/persistence";
import { createTredieFromPayment, generateImageFor } from "@/services/tredies";
import { readWalletFromRequest } from "@/services/wallet-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  txHash: z.string().min(8),
  /** The amount the user reviewed, used to prove the chain confirmed at least this. */
  amountUsd: z.number().positive(),
  /** Human label for the recipient, e.g. "Luis". */
  recipientName: z.string().trim().max(80).optional(),
  destination: publicKeySchema,
  note: z.string().trim().max(120).optional(),
  ownerPublicKey: publicKeySchema,
});

/**
 * Creates a Tredie from a payment that has already landed on Stellar.
 *
 * The transaction is re-read from Horizon here, and every field stored on the
 * Tredie comes from that response rather than from the request body. Image
 * generation runs after the response is sent and can be retried without ever
 * touching payment again.
 *
 * The browser must have unlocked exactly the wallet signing the payment — that
 * way a Tredie and its private note only ever land under an unlocked owner.
 */
export async function POST(request: Request) {
  let txHash: string | null = null;
  try {
    const body = bodySchema.parse(await request.json());
    txHash = body.txHash;

    const unlockedWallet = readWalletFromRequest(request);
    if (!unlockedWallet || unlockedWallet !== body.ownerPublicKey) {
      return jsonError(
        "Unlock the wallet that signs the payment first. Tredie never trusts a bare address.",
        401,
      );
    }

    const settings = getStellarSettings();

    const payment = await verifyPayment({
      txHash: body.txHash,
      destination: body.destination,
      amountUsd: body.amountUsd,
      sourcePublicKey: body.ownerPublicKey,
    });

    const { tredie, created } = await createTredieFromPayment({
      payment,
      recipientName: body.recipientName ?? null,
      note: body.note ?? null,
      ownerAddress: body.ownerPublicKey,
      network: settings.network,
    });

    if (created) {
      after(async () => {
        try {
          await generateImageFor(tredie.id);
        } catch (error) {
          console.error("[tredie] generation failed for", tredie.id, error);
        }
      });
    }

    return NextResponse.json({ tredie, created }, { status: created ? 201 : 200 });
  } catch (error) {
    // Verification and persistence failures usually carry a 4xx status, which
    // toErrorResponse deliberately does not log. Log them here — with the hash
    // that was being processed — so a failed payment is diagnosable from the
    // server logs alone.
    console.error(
      "[tredies] POST /api/tredies failed",
      txHash ?? "(body not parsed)",
      error instanceof Error ? error.message : error,
    );
    return toErrorResponse(error);
  }
}

/**
 * A collection only exists through an unlocked wallet. No `owner` is allowed:
 * the unlocked session decides whose Tredies come back.
 */
export async function GET(request: Request) {
  try {
    const wallet = readWalletFromRequest(request);
    if (!wallet) {
      return jsonError("Unlock your wallet to see a collection.", 401);
    }

    const owner = new URL(request.url).searchParams.get("owner");
    if (owner && owner !== wallet) {
      return jsonError("That wallet is locked in this browser.", 401);
    }

    const tredies = await getRepository().listByOwner(wallet);
    return NextResponse.json({ tredies });
  } catch (error) {
    return toErrorResponse(error);
  }
}