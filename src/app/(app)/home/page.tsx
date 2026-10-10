import { Suspense } from "react";
import type { Metadata } from "next";
import { CollectionHub, HubFallback } from "@/components/collection/collection-hub";

export const metadata: Metadata = {
  title: "Collection",
  description: "Your little transactions, side by side.",
};

export default function HomePage() {
  return (
    <Suspense fallback={<HubFallback />}>
      <CollectionHub defaultMode="grid" />
    </Suspense>
  );
}