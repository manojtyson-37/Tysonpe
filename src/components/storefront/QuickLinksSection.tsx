import type { StorefrontLink } from "@/lib/storefront";
import {
  CalendarIcon,
  VideoIcon,
  BookOpenIcon,
  SparklesIcon,
  ExternalLinkIcon,
  LinkIcon,
  TelegramIcon,
  WhatsappIcon,
  SubstackIcon,
} from "./icons";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  calendar: CalendarIcon,
  video: VideoIcon,
  book: BookOpenIcon,
  sparkles: SparklesIcon,
  link: LinkIcon,
  telegram: TelegramIcon,
  whatsapp: WhatsappIcon,
  newsletter: SubstackIcon,
};

export function QuickLinksSection({ links }: { links?: StorefrontLink[] }) {
  if (!links || links.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Featured Links & Consultations
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => {
          const IconComp = (link.icon && ICON_MAP[link.icon]) || LinkIcon;
          const isExternal = link.url.startsWith("http");

          return (
            <a
              key={link.id}
              href={link.url}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noreferrer" : undefined}
              className={`group relative flex items-center gap-4 rounded-2xl border p-4 transition-all duration-150 ease-out active:scale-[0.98] ${
                link.isHighlighted
                  ? "border-brand/40 bg-brand-soft/30 shadow-xs hover:border-brand hover:shadow-sm"
                  : "border-line bg-surface hover:border-line/80 hover:bg-surface-2"
              }`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  link.isHighlighted
                    ? "bg-brand text-brand-ink"
                    : "bg-surface-2 text-muted group-hover:bg-brand-soft group-hover:text-brand"
                }`}
              >
                <IconComp className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-bold text-ink group-hover:text-brand">
                    {link.title}
                  </span>
                  {link.badge && (
                    <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">
                      {link.badge}
                    </span>
                  )}
                </div>
                {link.subtitle && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                    {link.subtitle}
                  </p>
                )}
              </div>

              <div className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink">
                <ExternalLinkIcon className="h-4 w-4" />
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
