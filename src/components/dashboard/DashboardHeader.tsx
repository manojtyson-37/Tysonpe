import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Brand";
import { ArrowUpRightIcon } from "@/components/dashboard/icons";

interface DashboardHeaderProps {
  creator: {
    displayName: string;
    handle: string;
    avatarUrl?: string | null;
  };
}

export function DashboardHeader({ creator }: DashboardHeaderProps) {
  return (
    <header className="h-14 shrink-0 border-b border-line bg-surface/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30">
      {/* Left: Brand Mark & Creator Workspace Chip */}
      <div className="flex items-center gap-3.5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          aria-label="Tysonpe Dashboard Home"
        >
          <Logo className="!text-lg text-ink" />
        </Link>

        <span className="hidden sm:inline-block h-4 w-px bg-line/80" />

        {/* Workspace Switcher / Identity Badge */}
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-line/70 bg-surface-2/60 px-2.5 py-1 text-xs shadow-2xs">
          <Avatar name={creator.displayName} size={22} />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate max-w-[120px] font-bold text-ink text-xs">
              {creator.displayName}
            </span>
            <span className="font-mono text-[10px] text-muted">@{creator.handle}</span>
          </div>
          <span className="rounded bg-brand/10 px-1.5 py-0.2 text-[9px] font-bold text-brand uppercase tracking-wider border border-brand/20">
            Pro
          </span>
        </div>
      </div>

      {/* Center: Command Palette Trigger */}
      <div className="hidden md:flex items-center gap-2.5 rounded-xl border border-line bg-bg px-3 py-1.5 text-xs text-muted hover:border-line-strong hover:bg-surface-2/40 transition-all cursor-pointer w-72 justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="h-3.5 w-3.5 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span className="text-[11px]">Search leads, orders, products...</span>
        </div>
        <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 text-[9px] font-mono text-muted shadow-2xs">
          ⌘K
        </kbd>
      </div>

      {/* Right: Meta Status, Public Store Link, and Account Session */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Meta Cloud API Status */}
        <div className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/60 bg-emerald-50/70 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-medium">Meta Cloud API Live</span>
        </div>

        {/* View Live Storefront */}
        <Link
          href={`/c/${creator.handle}`}
          target="_blank"
          title="Open live public storefront"
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-2xs hover:bg-surface-2 hover:border-line-strong transition-all duration-150 active:scale-[0.98]"
        >
          <span>View Store</span>
          <ArrowUpRightIcon className="h-3.5 w-3.5 text-muted" />
        </Link>

        {/* Log out Action */}
        <form action={logout}>
          <button
            type="submit"
            className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-muted hover:text-bad hover:bg-bad-soft transition-all duration-150"
          >
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
