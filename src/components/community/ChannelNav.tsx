"use client";

import { usePathname } from "next/navigation";
import { Badge, Tabs, isLinkActive } from "@/components/ui";

type Item = { slug: string; name: string; kind: string; access: string };

export function ChannelNav({ handle, channels, showLeaderboard }: { handle: string; channels: Item[]; showLeaderboard: boolean }) {
  const path = usePathname().toLowerCase();
  const base = `/c/${handle}/community`;
  // Case-insensitive on purpose (a hand-typed /Community/General is still General), and a thread under a channel keeps
  // that channel current: isLinkActive's default `prefix` rule respects segment boundaries. The route is the only input.
  const item = (href: string, name: string, hint?: string) => ({
    href,
    current: isLinkActive(path, href.toLowerCase()),
    label: (
      <span className="flex min-w-0 items-center gap-2">
        <span className="max-w-[12rem] min-w-0 whitespace-normal break-words text-left">{name}</span>
        {hint && <Badge className="shrink-0">{hint}</Badge>}
      </span>
    ),
  });
  return (
    <Tabs
      ariaLabel="Community channels"
      orientation="vertical"
      // From lg a column; below it one scrolling row (max-lg:p-1 is just spacing round the row).
      // The focus ring is drawn INSIDE each link (-outline-offset-2) in the brand ring colour: from lg the nav sits in an
      // overflow-y-auto wrapper with no gap to its edge, so the global outside ring (offset 2) would be clipped.
      className="max-lg:flex-row max-lg:items-center max-lg:overflow-x-auto max-lg:p-1 max-lg:[&>a]:shrink-0 [&>a:focus-visible]:-outline-offset-2 [&>a:focus-visible]:outline-[color:var(--brand-ring)]"
      items={[
        ...channels.map((c) => item(`${base}/${c.slug}`, c.name, c.kind === "announcement" ? "News" : c.access === "product_gated" ? "Gated" : undefined)),
        ...(showLeaderboard ? [item(`${base}/leaderboard`, "Leaderboard")] : []),
      ]}
    />
  );
}
