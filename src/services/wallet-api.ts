import "server-only";
import { NextResponse } from "next/server";
import { otterTag } from "@/lib/utils";
import type { WalletAccountRecord } from "@/types";
import {
  signWalletToken,
  walletCookieName,
} from "@/services/wallet-session";
import type { WalletAccountRow } from "@/services/persistence/repository";

/** Public API shape of a wallet account — PIN material never leaves the server. */
export function publicAccount(row: WalletAccountRow): WalletAccountRecord {
  return {
    walletAddress: row.walletAddress,
    displayName: row.displayName,
    otterTag: otterTag(row.walletAddress),
    createdAt: row.createdAt,
    lastUnlockedAt: row.lastUnlockedAt,
  };
}

export function attachWalletCookie(
  response: NextResponse,
  publicKey: string,
): NextResponse {
  response.cookies.set(walletCookieName(), signWalletToken(publicKey), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export function clearWalletCookie(response: NextResponse): NextResponse {
  response.cookies.set(walletCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}