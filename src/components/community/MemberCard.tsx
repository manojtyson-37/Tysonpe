import { IconCheck, IconChevronDown } from "@/components/icons";
import { ButtonLink, Progress } from "@/components/ui";
import { BADGES } from "@/lib/gamification/badges";
import type { getProfile } from "@/lib/gamification/service";
import { focusRing, touchButton } from "./styles";

type Profile = Awaited<ReturnType<typeof getProfile>>;

function Details({ profile, leaderboardHref }: { profile: Profile; leaderboardHref: string }) {
  const { level, points, streak, badges } = profile;
  const pct = Math.min(100, Math.round((level.into / level.span) * 100));
  const earned = new Set(badges.map((b) => b.key));
  return (
    <>
      <p className="t-label">Your level</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{level.level}</p>
      {/* The fill is the brand's ring shade, as the settings preview promises for progress bars; the percentage is printed beside it. */}
      <Progress value={pct} label={`Progress to level ${level.level + 1}`} tone="ring" className="mt-3" />
      <p className="mt-2 text-xs text-muted tabular-nums">{points} points · {level.next - points} to level {level.level + 1}</p>

      <p className="mt-4 text-sm font-semibold tabular-nums">{streak > 0 ? `${streak}-day streak` : "No active streak"}</p>
      <p className="text-xs text-muted">Finish a lesson each day to {streak > 0 ? "keep it going" : "start one"}.</p>

      <p className="t-label mb-1 mt-4">Badges</p>
      <ul className="divide-y divide-line">
        {BADGES.map((b) => {
          const isEarned = earned.has(b.key);
          return (
            <li key={b.key} className="py-2">
              {/* Earned is a drawn tick plus the words for assistive tech; an unearned badge is muted and has no tick. */}
              <p className={`flex items-center gap-1.5 text-sm font-semibold ${isEarned ? "text-ink" : "text-muted"}`}>
                {isEarned && <IconCheck size={14} className="shrink-0 text-good" />}
                {b.label}
                <span className="sr-only"> ({isEarned ? "earned" : "not earned yet"})</span>
              </p>
              <p className={`text-xs ${isEarned ? "text-ink" : "text-muted"}`}>{b.description}</p>
            </li>
          );
        })}
      </ul>
      <ButtonLink href={leaderboardHref} variant="secondary" size="sm" className={`mt-4 ${touchButton}`}>
        View leaderboard
      </ButtonLink>
    </>
  );
}

/** lg and up: the full panel, always visible, ruled rather than boxed. Hidden (display:none) below lg so only one copy is exposed. */
export function MemberCard({ profile, leaderboardHref }: { profile: Profile; leaderboardHref: string }) {
  return (
    <section aria-label="Your progress" className="hidden border-y border-line py-4 lg:block">
      <Details profile={profile} leaderboardHref={leaderboardHref} />
    </section>
  );
}

/** Below lg: a compact, collapsed-by-default summary that expands to the same detail content. */
export function MemberCardCompact({ profile, leaderboardHref }: { profile: Profile; leaderboardHref: string }) {
  const { level, points, streak } = profile;
  return (
    <details className="group border-y border-line lg:hidden">
      <summary className={`flex min-h-11 cursor-pointer list-none items-center gap-2 py-2 text-sm font-semibold tabular-nums transition-colors duration-150 hover:bg-surface-2 [&::-webkit-details-marker]:hidden ${focusRing}`}>
        <span className="min-w-0 flex-1">
          <span className="sr-only">Your progress: </span>Level {level.level} · {points} points{streak > 0 ? ` · ${streak}-day streak` : ""}
        </span>
        <IconChevronDown size={16} className="shrink-0 text-muted transition-transform duration-(--dur-fast) ease-(--ease-standard) group-open:rotate-180" />
      </summary>
      <div className="pb-4 pt-1">
        <Details profile={profile} leaderboardHref={leaderboardHref} />
      </div>
    </details>
  );
}
