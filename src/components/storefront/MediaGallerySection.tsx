import type { StorefrontGalleryItem } from "@/lib/storefront";
import { ExternalLinkIcon } from "./icons";

export function MediaGallerySection({ items }: { items?: StorefrontGalleryItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Visual Showcase
        </span>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Workshops, Media & Highlights
        </h2>
        <p className="mt-1 text-xs text-muted">
          A glimpse into recent live cohorts, keynotes, and press features.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const content = (
            <div className="card group overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-md">
              <div className="relative aspect-16/10 w-full overflow-hidden bg-surface-2">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-103"
                />
                {item.tag && (
                  <span className="absolute top-3 left-3 rounded-md bg-surface/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink backdrop-blur-xs shadow-2xs">
                    {item.tag}
                  </span>
                )}
                {item.link && (
                  <span className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-surface/90 text-muted backdrop-blur-xs transition group-hover:text-ink shadow-2xs">
                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>

              <div className="p-4">
                <h3 className="text-sm font-bold text-ink transition-colors group-hover:text-brand">
                  {item.title}
                </h3>
                {item.caption && (
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">
                    {item.caption}
                  </p>
                )}
              </div>
            </div>
          );

          if (item.link) {
            return (
              <a
                key={item.id}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                {content}
              </a>
            );
          }

          return <div key={item.id}>{content}</div>;
        })}
      </div>
    </section>
  );
}
