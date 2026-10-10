import { z } from "zod";
import { toErrorResponse } from "@/lib/api";
import { fundTestnetAccount, publicKeySchema } from "@/services/stellar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ publicKey: publicKeySchema });

/**
 * Testnet only. Makes a connected wallet demo-ready through friendbot so the
 * core loop can be walked without a pre-funded wallet. Idempotent: a wallet
 * that already holds the demo balance is reported back untouched, which is what
 * lets the client call it automatically on every connect. Rejected outright on
 * public network.
 */
export async function POST(request: Request) {
  try {
    const { publicKey } = bodySchema.parse(await request.json());
    const result = await fundTestnetAccount(publicKey);
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}