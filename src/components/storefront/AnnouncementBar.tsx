import Link from "next/link";
import type { StorefrontConfig } from "@/lib/storefront";

export function AnnouncementBar({ announcement }: { announcement?: StorefrontConfig["announcement"] }) {
  if (!announcement || !announcement.enabled || !announcement.text) return null;

  const content = (
    <div className="group relative flex items-center justify-center gap-2.5 overflow-hidden border-b border-line/80 bg-surface-2 px-4 py-2.5 text-center text-xs font-medium text-ink transition-colors hover:bg-brand-soft/70 sm:text-sm">
      {announcement.badge && (
        <span className="inline-flex items-center rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase text-brand-ink">
          {announcement.badge}
        </span>
      )}
      <span className="truncate">{announcement.text}</span>
      {announcement.link && (
        <span className="inline-block transition-transform duration-150 group-hover:translate-x-0.5 text-muted group-hover:text-ink">
          →
        </span>
      )}
    </div>
  );

  if (announcement.link) {
    return (
      <Link href={announcement.link} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
