import Link from "next/link";
import { DashNav } from "@/components/DashNav";
import { SiteNav } from "@/components/SiteNav";
import { Avatar } from "@/components/Brand";
import { CopyLink } from "@/components/CopyLink";
import { requireCreator } from "@/lib/auth/session";
import { ArrowUpRightIcon } from "@/components/dashboard/icons";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { creator } = await requireCreator();

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <SiteNav />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-7">
        {/* Cohesive SaaS Sidebar */}
        <aside className="lg:w-64 lg:shrink-0 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-line bg-surface p-3.5 shadow-2xs flex flex-col gap-4">
            {/* Creator Profile Header */}
            <div className="flex items-center gap-2.5 px-1 pt-1">
              <div className="relative">
                <Avatar name={creator.displayName} size={36} />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-good ring-2 ring-surface" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-ink leading-tight">
                  {creator.displayName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="truncate text-[11px] font-mono text-muted">
                    @{creator.handle}
                  </span>
                  <Link
                    href={`/c/${creator.handle}`}
                    target="_blank"
                    title="Open public storefront"
                    className="text-muted hover:text-brand transition-colors"
                  >
                    <ArrowUpRightIcon className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="border-t border-line/60" />

            {/* Categorized Navigation */}
            <DashNav />

            <div className="border-t border-line/60" />

            {/* Quick Storefront Link Dock */}
            <div className="space-y-2 px-1 pb-1">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted/70">
                <span>Storefront Link</span>
                <span className="text-[9px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded dark:bg-emerald-950/40 dark:text-emerald-400">
                  UPI Live
                </span>
              </div>
              <CopyLink path={`/c/${creator.handle}`} />
              <Link
                href="/dashboard/storefront"
                className="mt-1 block text-center text-[11px] font-semibold text-brand hover:underline"
              >
                Customize storefront →
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
