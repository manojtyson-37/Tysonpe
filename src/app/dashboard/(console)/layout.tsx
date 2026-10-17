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

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:gap-8">
        {/* Modern Sidebar */}
        <aside className="lg:w-60 lg:shrink-0 space-y-5">
          {/* Creator Profile Mini Card */}
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <Avatar name={creator.displayName} size={42} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">
                  {creator.displayName}
                </p>
                <p className="truncate text-xs font-mono text-muted">
                  @{creator.handle}
                </p>
              </div>
            </div>

            <div className="mt-3.5 flex items-center justify-between border-t border-line/60 pt-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-good">
                <span className="h-2 w-2 rounded-full bg-good animate-pulse" />
                Live Store
              </span>
              <Link
                href={`/c/${creator.handle}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
              >
                <span>Storefront</span>
                <ArrowUpRightIcon className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Navigation Links */}
          <DashNav />

          {/* Quick Store Link Widget (Desktop) */}
          <div className="hidden lg:block rounded-2xl border border-line bg-surface p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Your Store Link
              </p>
              <span className="text-[10px] text-muted">UPI Ready</span>
            </div>
            <CopyLink path={`/c/${creator.handle}`} />
            <Link
              href="/dashboard/storefront"
              className="mt-2 block text-center text-xs font-semibold text-brand hover:underline"
            >
              Customize storefront appearance →
            </Link>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
