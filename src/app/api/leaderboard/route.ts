import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api";
import { getRepository } from "@/services/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEADERBOARD_LIMIT = 50;

/**
 * Public hall of fame. Ranking is a pure rarity score (golden ≫ legendary ≫
 * epic ≫ rare) with total sent as the tiebreaker. Only the owner's chosen
 * display name (or the derived "Otter #XXXX") and the best Tredie's art are
 * shown — never a note, never a full address, never an amount detail.
 */
export async function GET() {
  try {
    const entries = await getRepository().getLeaderboard(LEADERBOARD_LIMIT);
    return NextResponse.json({ entries });
  } catch (error) {
    return toErrorResponse(error);
  }
}