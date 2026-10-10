import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api";
import { getRepository } from "@/services/persistence";
import { publicAccount } from "@/services/wallet-api";
import { readWalletFromRequest } from "@/services/wallet-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Who is unlocked in this browser? The client calls this on load and reconnect. */
export async function GET(request: Request) {
  try {
    const wallet = readWalletFromRequest(request);
    if (!wallet) return NextResponse.json({ account: null });

    const account = await getRepository().getWalletAccount(wallet);
    return NextResponse.json({ account: account ? publicAccount(account) : null });
  } catch (error) {
    return toErrorResponse(error);
  }
}