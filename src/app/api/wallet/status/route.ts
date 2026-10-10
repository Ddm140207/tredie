import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api";
import { publicKeySchema } from "@/services/stellar";
import { getRepository } from "@/services/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public, offline-safe check that the UI uses to decide between "set your PIN"
 * and "enter your PIN" without leaking anything besides that a wallet exists
 * here.
 */
export async function GET(request: Request) {
  try {
    const publicKey = publicKeySchema.parse(
      new URL(request.url).searchParams.get("publicKey"),
    );
    const account = await getRepository().getWalletAccount(publicKey);
    return NextResponse.json({ registered: account !== null });
  } catch (error) {
    return toErrorResponse(error);
  }
}