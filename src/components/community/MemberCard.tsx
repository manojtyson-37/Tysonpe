import Link from "next/link";
import { BADGES } from "@/lib/gamification/badges";
import type { getProfile } from "@/lib/gamification/service";
import { focusRing } from "./styles";

type Profile = Awaited<ReturnType<typeof getProfile>>;

export function MemberCard({ profile, leaderboardHref }: { profile: Profile; leaderboardHref: string }) {
  const { level, points, streak, badges } = profile;
  const pct = Math.min(100, Math.round((level.into / level.span) * 100));
  const earned = new Set(badges.map((b) => b.key));
  return (
    <section aria-label="Your progress" className="card px-5 pb-5 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Your level</p>
      <p className="mt-1 text-3xl font-extrabold tabular-nums">{level.level}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress to level ${level.level + 1}`}>
        <div className="h-full rounded-full bg-[color:var(--brand-ring)] transition-[width] duration-150" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted tabular-nums">{points} points · {level.next - points} to level {level.level + 1}</p>

      <p className="mt-4 text-sm font-semibold tabular-nums">{streak > 0 ? `${streak}-day streak` : "No active streak"}</p>
      <p className="text-xs text-muted">Finish a lesson each day to {streak > 0 ? "keep it going" : "start one"}.</p>

      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted">Badges</p>
      <ul className="space-y-1.5">
        {BADGES.map((b) => {
          const isEarned = earned.has(b.key);
          return (
            <li key={b.key} className={`rounded-xl px-3 py-2 ${isEarned ? "bg-brand-soft" : "border border-dashed border-muted bg-surface"}`}>
              <p className={`flex items-center gap-1.5 text-sm font-semibold ${isEarned ? "text-ink" : "text-muted"}`}>
                {isEarned && (
                  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 8.5 3.2 3L13 4.5" />
                  </svg>
                )}
                {b.label}
                <span className="sr-only"> ({isEarned ? "earned" : "not earned yet"})</span>
              </p>
              <p className={`text-xs ${isEarned ? "text-ink" : "text-muted"}`}>{b.description}</p>
            </li>
          );
        })}
      </ul>
      <Link href={leaderboardHref} className={`mt-3 inline-flex min-h-10 items-center rounded-lg text-sm font-semibold text-[color:var(--brand-text)] transition-all duration-150 hover:underline active:scale-[0.98] ${focusRing}`}>
        View leaderboard
      </Link>
    </section>
  );
}
