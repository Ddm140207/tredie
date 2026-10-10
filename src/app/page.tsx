import type { Metadata } from "next";
import { Landing } from "@/components/landing/landing";

export const metadata: Metadata = {
  title: "Tredie — Your transactions, alive.",
  description:
    "Every Stellar transaction becomes a unique little creature. Pay, and something is born.",
};

export default function Page() {
  return <Landing />;
}