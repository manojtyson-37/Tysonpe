import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar, Callout, EmptyRow, Table, Tabs, Td, Th, Tr } from "@/components/ui";
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
  const periods = [
    { period: "week", label: "This week", empty: "No points this week yet" },
    { period: "all", label: "All time", empty: "No points yet" },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="min-w-0">
        <h2 className="text-xl font-bold">Leaderboard</h2>
        <p className="mt-0.5 text-sm text-muted">Points from lessons, quizzes, courses and community activity. Weeks start Monday, IST.</p>
        <p className="t-meta">Members are shown by first name and last initial.</p>
      </div>

      {/* The period lives in the query string; the server already resolved it, so `current` says which tab is on. */}
      <Tabs
        ariaLabel="Leaderboard period"
        // Brand ring colour; the global outside offset stays (a horizontal row in the page flow, nothing clips it).
        className="[&>a:focus-visible]:outline-[color:var(--brand-ring)]"
        items={periods.map((p) => ({ href: `${base}?period=${p.period}`, label: p.label, current: period === p.period }))}
      />

      <Table aria-label="Leaderboard" stack>
        <thead>
          <tr>
            <Th>Rank</Th>
            <Th>Member</Th>
            <Th>Level</Th>
            <Th align="right">Points</Th>
          </tr>
        </thead>
        <tbody>
          {lb.top.length === 0 ? (
            <EmptyRow colSpan={4} title={(period === "all" ? periods[1] : periods[0]).empty} body="Complete a lesson or start a conversation to get on the board." />
          ) : (
            lb.top.map((r, i) => (
              // `isMe` is marked in words ("you") and in aria-current, with the tint only as reinforcement.
              <Tr key={`${r.rank}-${i}`} aria-current={r.isMe ? "true" : undefined} className={r.isMe ? "bg-brand-soft" : undefined}>
                <Td label="Rank" className="font-semibold tabular-nums text-muted sm:w-16">{r.rank}</Td>
                <Td label="Member">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={r.name} size="sm" />
                    <span className="min-w-0 break-words font-semibold">{r.name}</span>
                    {r.isMe && <span className="shrink-0 text-xs font-semibold">(you)</span>}
                  </div>
                </Td>
                <Td label="Level" className="tabular-nums text-muted">{r.level}</Td>
                <Td label="Points" align="right" className="font-bold tabular-nums">{r.points}</Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>
      {lb.me && !lb.top.some((r) => r.isMe) && (
        <Callout tone="info">You&apos;re ranked <span className="font-bold tabular-nums">#{lb.me.rank}</span> with <span className="font-bold tabular-nums">{lb.me.points}</span> points.</Callout>
      )}
    </div>
  );
}
