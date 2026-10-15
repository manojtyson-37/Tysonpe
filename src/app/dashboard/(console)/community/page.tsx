import type { Metadata } from "next";
import Link from "next/link";
import {
  createChannelAction, deleteChannelAction, moveChannelAction, recalculatePointsAction, setGamificationAction,
  unbanMemberAction, updateChannelAction,
} from "@/app/actions/community-admin";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ChannelForm } from "@/components/community/ChannelForm";
import { PageHeader, dateFmt } from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { ensureDefaultChannel, listChannelsAdmin } from "@/lib/community/channels";
import { listBans } from "@/lib/community/posts";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Community" };

function deleteMessage(name: string, postCount: number) {
  if (postCount === 0) return `Delete "${name}"? This can't be undone.`;
  return `Delete "${name}" and its ${postCount} ${postCount === 1 ? "post" : "posts"}, comments and likes? Points members earned here are removed too. This can't be undone.`;
}

export default async function CommunityConsole() {
  const { creator } = await requireCreator();
  await ensureDefaultChannel(creator.id);
  const [channels, products, bans] = await Promise.all([
    listChannelsAdmin(creator.id),
    db.product.findMany({ where: { creatorId: creator.id }, select: { id: true, title: true }, orderBy: { createdAt: "asc" } }),
    listBans(creator.id),
  ]);
  return (
    <>
      <PageHeader
        title="Community"
        sub="Channels your customers talk in. Open to every buyer, or limited to buyers of chosen products."
        action={<Link href={`/c/${creator.handle}/community`} className="btn btn-secondary btn-sm">Open community ↗</Link>}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <section className="space-y-3" aria-label="Channels">
            {channels.map((c, i) => (
              <div key={c.id} className="card">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-5 py-4">
                    <span className="font-semibold">{c.name}</span>
                    <span className="badge badge-muted">{c.kind === "announcement" ? "Announcements" : "Discussion"}</span>
                    <span className="badge badge-muted">{c.access === "open" ? "All buyers" : `${c.productIds.length} product${c.productIds.length === 1 ? "" : "s"}`}</span>
                    <span className="ml-auto text-xs text-muted tabular-nums">{c.postCount} {c.postCount === 1 ? "post" : "posts"}</span>
                  </summary>
                  <div className="space-y-4 border-t border-line px-5 pb-5 pt-4">
                    <ChannelForm action={updateChannelAction.bind(null, c.id)} channel={c} products={products} submitLabel="Save channel" />
                    <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                      <form action={moveChannelAction.bind(null, c.id, "up")}><button className="btn btn-secondary btn-sm" disabled={i === 0}>Move up</button></form>
                      <form action={moveChannelAction.bind(null, c.id, "down")}><button className="btn btn-secondary btn-sm" disabled={i === channels.length - 1}>Move down</button></form>
                      <form action={deleteChannelAction.bind(null, c.id)} className="ml-auto">
                        <ConfirmButton className="btn btn-danger btn-sm" message={deleteMessage(c.name, c.postCount)}>Delete</ConfirmButton>
                      </form>
                    </div>
                  </div>
                </details>
              </div>
            ))}
          </section>

          <section className="card px-5 pb-5 pt-4" aria-label="Banned members">
            <h2 className="font-semibold">Banned members</h2>
            <p className="text-sm text-muted">Banned people can&apos;t see any channel. Ban someone from their post.</p>
            {bans.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Nobody is banned.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {bans.map((b) => (
                  <li key={b.userId} className="flex items-center gap-3 py-2.5">
                    <span className="font-medium">{b.name}</span>
                    <span className="text-xs text-muted">since {dateFmt(b.createdAt)}</span>
                    <form action={unbanMemberAction.bind(null, b.userId)} className="ml-auto"><button className="btn btn-secondary btn-sm">Unban</button></form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-6 xl:sticky xl:top-24 xl:self-start">
          <section className="card px-5 pb-5 pt-4">
            <h2 className="mb-3 font-semibold">New channel</h2>
            <ChannelForm action={createChannelAction} products={products} submitLabel="Create channel" />
          </section>

          <section className="card px-5 pb-5 pt-4" aria-label="Gamification">
            <h2 className="font-semibold">Points, levels and badges</h2>
            <p className="mt-1 text-sm text-muted">
              Learners earn points for lessons, quizzes, finishing a course and taking part in the community. {creator.gamificationEnabled ? "It's on." : "It's off: nothing is awarded and the leaderboard is hidden."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={setGamificationAction.bind(null, !creator.gamificationEnabled)}>
                <button className="btn btn-secondary btn-sm">{creator.gamificationEnabled ? "Turn off" : "Turn on"}</button>
              </form>
              {creator.gamificationEnabled && (
                <form action={recalculatePointsAction}>
                  <button className="btn btn-secondary btn-sm" title="Replays existing lesson and quiz progress. Safe to repeat: nothing is awarded twice.">Recalculate from progress</button>
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
