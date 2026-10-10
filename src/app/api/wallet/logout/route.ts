import { NextResponse } from "next/server";
import { clearWalletCookie } from "@/services/wallet-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Drops the unlock cookie. The wallet connection itself is untouched. */
export async function POST() {
  return clearWalletCookie(NextResponse.json({ ok: true }));
}