import { Suspense } from "react";
import type { Metadata } from "next";
import { CollectionHub, HubFallback } from "@/components/collection/collection-hub";

export const metadata: Metadata = {
  title: "Timeline",
  description: "Every payment, in the order you made them.",
};

export default function TimelinePage() {
  return (
    <Suspense fallback={<HubFallback />}>
      <CollectionHub defaultMode="timeline" />
    </Suspense>
  );
}