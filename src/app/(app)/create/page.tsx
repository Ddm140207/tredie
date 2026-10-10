import type { Metadata } from "next";
import { CreateFlow } from "@/components/create/create-flow";

export const metadata: Metadata = {
  title: "Create a Tredie",
  description: "Send a payment and something small gets born.",
};

export default function CreatePage() {
  return (
    <div className="mx-auto w-full max-w-lg px-5 py-10 md:py-16">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Create a Tredie
        </h1>
        <p className="mt-2 text-ink-soft">
          The amount decides the rarity. You never pick the creature.
        </p>
      </header>
      <CreateFlow />
    </div>
  );
}
