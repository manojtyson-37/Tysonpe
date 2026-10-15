import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Empty } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { ensureDefaultChannel, listChannelsFor } from "@/lib/community/channels";
import { resolveCommunity } from "@/lib/community/viewer";
import { getLeaderboard } from "@/lib/gamification/service";

export const metadata: Metadata = { title: "Leaderboard" };

export default async function LeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { handle } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/c/${handle}/community/leaderboard`);
  const ctx = await resolveCommunity(handle, user.id);
  if (!ctx || !ctx.creator.gamificationEnabled) notFound();
  if (ctx.viewer.isCreator) await ensureDefaultChannel(ctx.creator.id);
  if ((await listChannelsFor(ctx.creator.id, ctx.viewer)).length === 0) notFound(); // members only
  const period = sp.period === "all" ? "all" : "week";
  const lb = await getLeaderboard(ctx.creator.id, period, user.id);
  const base = `/c/${ctx.creator.handle}/community/leaderboard`;
  const tab = (p: "week" | "all", label: string) => (
    <Link
      href={`${base}?period=${p}`}
      aria-current={period === p ? "page" : undefined}
      className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-colors duration-150 ${period === p ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2 hover:text-ink"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold">Leaderboard</h2>
          <p className="text-sm text-muted">Points from lessons, quizzes, courses and community activity. Weeks start Monday, IST.</p>
        </div>
        <div className="flex gap-1">{tab("week", "This week")}{tab("all", "All time")}</div>
      </div>

      {lb.top.length === 0 ? (
        <Empty title="No points yet" body="Complete a lesson or start a conversation to get on the board." />
      ) : (
        <ol className="card divide-y divide-line">
          {lb.top.map((r, i) => (
            <li key={i} className={`flex items-center gap-4 px-5 py-3 ${r.isMe ? "bg-brand-soft/60" : ""}`}>
              <span className="w-7 text-right text-sm font-bold tabular-nums text-muted">{r.rank}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">{r.name}{r.isMe && <span className="ml-2 text-xs font-medium text-muted">you</span>}</span>
              <span className="badge badge-muted tabular-nums">Level {r.level}</span>
              <span className="w-16 text-right font-bold tabular-nums">{r.points}</span>
            </li>
          ))}
        </ol>
      )}
      {lb.me && !lb.top.some((r) => r.isMe) && (
        <p className="card px-5 py-3 text-sm">You&apos;re ranked <span className="font-bold tabular-nums">#{lb.me.rank}</span> with <span className="font-bold tabular-nums">{lb.me.points}</span> points.</p>
      )}
    </div>
  );
}
