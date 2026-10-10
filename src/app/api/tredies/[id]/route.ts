import { NextResponse } from "next/server";
import { jsonError, toErrorResponse } from "@/lib/api";
import { getRepository } from "@/services/persistence";
import { readWalletFromRequest } from "@/services/wallet-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Tredie detail. The polling client (and the retry button) belong to the
 * owner, so the record only comes back when the browser holds an unlocked
 * session for that owner's wallet. A locked wallet sees nothing at all.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tredie = await getRepository().getById(id);
    if (!tredie) return jsonError("That Tredie does not exist.", 404);

    const wallet = readWalletFromRequest(request);
    if (!wallet || wallet !== tredie.ownerAddress) {
      return jsonError("That Tredie is locked in this browser.", 403);
    }

    return NextResponse.json({ tredie });
  } catch (error) {
    return toErrorResponse(error);
  }
}