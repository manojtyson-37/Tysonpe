"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { slug: string; name: string; kind: string; access: string };

export function ChannelNav({ handle, channels, showLeaderboard }: { handle: string; channels: Item[]; showLeaderboard: boolean }) {
  const path = usePathname();
  const base = `/c/${handle}/community`;
  const link = (href: string, label: string, hint?: string) => {
    const active = path === href || path.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex items-baseline justify-between gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-colors duration-150 ${active ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2 hover:text-ink"}`}
      >
        <span className="truncate">{label}</span>
        {hint && <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{hint}</span>}
      </Link>
    );
  };
  return (
    <nav aria-label="Community channels" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {channels.map((c) => link(`${base}/${c.slug}`, c.name, c.kind === "announcement" ? "News" : c.access === "product_gated" ? "Gated" : undefined))}
      {showLeaderboard && link(`${base}/leaderboard`, "Leaderboard")}
    </nav>
  );
}
