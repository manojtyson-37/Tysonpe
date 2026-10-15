import Link from "next/link";
import { BADGES } from "@/lib/gamification/badges";
import type { getProfile } from "@/lib/gamification/service";

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
        <div className="h-full rounded-full bg-brand transition-[width] duration-150" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted tabular-nums">{points} points · {level.next - points} to level {level.level + 1}</p>

      <p className="mt-4 text-sm font-semibold tabular-nums">{streak > 0 ? `${streak}-day streak` : "No active streak"}</p>
      <p className="text-xs text-muted">Complete a lesson today to {streak > 0 ? "keep it going" : "start one"}.</p>

      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted">Badges</p>
      <ul className="flex flex-wrap gap-1.5">
        {BADGES.map((b) => (
          <li key={b.key} title={b.description} className={`badge ${earned.has(b.key) ? "badge-brand" : "badge-muted opacity-60"}`}>
            {b.label}
          </li>
        ))}
      </ul>
      <Link href={leaderboardHref} className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">View leaderboard</Link>
    </section>
  );
}
