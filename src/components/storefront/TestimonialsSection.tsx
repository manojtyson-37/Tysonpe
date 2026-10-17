import type { StorefrontTestimonial } from "@/lib/storefront";
import { StarIcon, CheckCircleIcon } from "./icons";

export function TestimonialsSection({ testimonials }: { testimonials?: StorefrontTestimonial[] }) {
  if (!testimonials || testimonials.length === 0) return null;

  return (
    <section className="border-t border-line/80 bg-surface py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Learner Stories & Outcomes
          </span>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Trusted by Professionals Across India
          </h2>
          <p className="mt-1 text-xs text-muted">
            Real outcomes from engineers, product leaders, and verified students.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="card flex flex-col p-6 transition-all duration-150 hover:border-brand/40 hover:shadow-xs"
            >
              {/* Star Rating */}
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon
                    key={i}
                    filled={i < t.rating}
                    className="h-4 w-4 text-amber-500"
                  />
                ))}
                {t.highlight && (
                  <span className="ml-2 rounded-full bg-good-soft px-2 py-0.5 text-[10px] font-bold text-good">
                    {t.highlight}
                  </span>
                )}
              </div>

              {/* Quote */}
              <p className="mt-4 flex-1 text-xs leading-relaxed text-ink/90 sm:text-sm">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author Info */}
              <div className="mt-6 flex items-center gap-3 border-t border-line/60 pt-4">
                {t.avatarUrl ? (
                  <img
                    src={t.avatarUrl}
                    alt={t.name}
                    className="h-10 w-10 rounded-full object-cover ring-1 ring-line"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                    {t.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-bold text-ink sm:text-sm">
                      {t.name}
                    </p>
                    <CheckCircleIcon
                      className="h-3.5 w-3.5 text-good"
                      title="Verified Buyer"
                    />
                  </div>
                  {(t.role || t.company) && (
                    <p className="truncate text-[11px] text-muted">
                      {t.role}
                      {t.role && t.company ? " · " : ""}
                      {t.company}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
