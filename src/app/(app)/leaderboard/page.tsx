import type { Metadata } from "next";
import { Leaderboard } from "@/components/collection/leaderboard";

export const metadata: Metadata = {
  title: "The board",
  description: "The rarest Tredies on testnet, ranked.",
};

export default function LeaderboardPage() {
  return <Leaderboard />;
}