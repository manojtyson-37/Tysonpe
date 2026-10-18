import Link from "next/link";
import { DashNav } from "@/components/DashNav";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ConsoleMain } from "@/components/dashboard/ConsoleMain";
import { CopyLink } from "@/components/CopyLink";
import { requireCreator } from "@/lib/auth/session";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { creator } = await requireCreator();

  return (
    <div className="h-screen w-screen overflow-hidden bg-bg text-ink flex flex-col font-sans">
      {/* 52px Sleek Executive Console Header */}
      <DashboardHeader creator={creator} />

      {/* Edge-to-Edge Application Workspace Shell */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Full-Height Anchored Sidebar */}
        <aside className="hidden lg:flex w-60 shrink-0 flex-col justify-between border-r border-line bg-surface z-20">
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <DashNav />
          </div>

          {/* Bottom Dock: Public Storefront Link & Instant UPI Health */}
          <div className="border-t border-line/70 p-3 bg-surface-2/30 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted">
              <span>Public Store</span>
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400">
                <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                UPI Active
              </span>
            </div>
            <CopyLink path={`/c/${creator.handle}`} />
            <Link
              href="/dashboard/storefront"
              className="flex items-center justify-center gap-1 text-[11px] font-semibold text-brand hover:underline pt-0.5"
            >
              <span>Customize storefront</span>
              <span>→</span>
            </Link>
          </div>
        </aside>

        {/* Dynamic Canvas: Full-Bleed for CRM, Padded Container for Analytics/Tables */}
        <ConsoleMain>{children}</ConsoleMain>
      </div>
    </div>
  );
}
