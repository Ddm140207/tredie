import { z } from "zod";
import { toErrorResponse } from "@/lib/api";
import { submitSignedTransaction } from "@/services/stellar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ signedXdr: z.string().min(1) });

/**
 * Broadcasts an already signed transaction. Signing happened in the wallet; the
 * server only relays, and the transaction is verified separately before any
 * Tredie record exists.
 */
export async function POST(request: Request) {
  try {
    const { signedXdr } = bodySchema.parse(await request.json());
    const result = await submitSignedTransaction(signedXdr);
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}