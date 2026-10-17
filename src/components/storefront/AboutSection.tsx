import type { StorefrontConfig } from "@/lib/storefront";
import { CheckCircleIcon } from "./icons";

interface AboutSectionProps {
  about?: StorefrontConfig["about"];
  stats?: StorefrontConfig["stats"];
  creatorName: string;
}

export function AboutSection({ about, stats, creatorName }: AboutSectionProps) {
  const showAbout = about?.enabled !== false && (about?.content || stats?.length);
  if (!showAbout) return null;

  return (
    <section className="border-t border-line/80 bg-surface-2/60 py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          {/* Left Column: Story & Narrative (7 cols) */}
          <div className="lg:col-span-7">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Creator Background
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {about?.title || `About ${creatorName}`}
            </h2>

            {about?.content && (
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted sm:text-base">
                {about.content.split("\n\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            )}

            {/* Credentials Badges */}
            {about?.credentials && about.credentials.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Verified Credentials & Highlights
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {about.credentials.map((cred, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-2xs"
                    >
                      <CheckCircleIcon className="h-3.5 w-3.5 text-good" />
                      {cred}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: High Impact Stat Counters (5 cols) */}
          {stats && stats.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className="card p-5 transition-all duration-150 hover:border-brand/30 hover:shadow-xs"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {stat.label}
                  </p>
                  <p className="mt-2 font-display text-2xl font-extrabold tabular-nums tracking-tight text-ink sm:text-3xl">
                    {stat.value}
                  </p>
                  {stat.sub && (
                    <p className="mt-1 text-xs text-muted">{stat.sub}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
