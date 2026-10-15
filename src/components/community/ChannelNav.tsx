"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { chipActive, chipIdle, focusRingInset } from "./styles";

type Item = { slug: string; name: string; kind: string; access: string };

export function ChannelNav({ handle, channels, showLeaderboard }: { handle: string; channels: Item[]; showLeaderboard: boolean }) {
  const path = usePathname().toLowerCase();
  const base = `/c/${handle}/community`;
  const link = (href: string, label: string, hint?: string) => {
    const target = href.toLowerCase();
    const exact = path === target;
    const within = path.startsWith(`${target}/`); // a thread under this channel
    return (
      <Link
        key={href}
        href={href}
        aria-current={exact ? "page" : within ? "true" : undefined}
        className={`flex min-h-10 max-w-[14rem] shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.98] lg:max-w-none ${focusRingInset} ${exact || within ? chipActive : chipIdle}`}
      >
        <span className="truncate">{label}</span>
        {hint && <span className="badge badge-muted shrink-0">{hint}</span>}
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
