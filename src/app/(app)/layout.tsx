import { Suspense } from "react";
import { MotionConfig } from "motion/react";
import { BottomTabBar } from "@/components/site/bottom-tab-bar";
import { SiteHeader } from "@/components/site/site-header";
import { WalletProvider } from "@/components/wallet/wallet-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <WalletProvider>
        <div className="flex min-h-dvh flex-col">
          <SiteHeader />
          <main className="flex-1 pb-32 sm:pb-0">{children}</main>
          <footer className="hidden border-t border-line px-5 py-8 text-center text-xs text-ink-faint sm:block">
            Tredie runs on Stellar. Transfers are real, testnet for now.
          </footer>
          <Suspense fallback={null}>
            <BottomTabBar />
          </Suspense>
        </div>
      </WalletProvider>
    </MotionConfig>
  );
}
