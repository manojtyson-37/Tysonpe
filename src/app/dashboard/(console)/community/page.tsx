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
        sub="Channels your customers talk in. Open to every paying customer, or limited to buyers of chosen products."
        action={<Link href={`/c/${creator.handle}/community`} className="btn btn-secondary btn-sm min-h-10">Open community <span aria-hidden>↗</span></Link>}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <section className="space-y-3" aria-label="Channels">
            {channels.map((c, i) => (
              <div key={c.id} className="card">
                <details className="group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-5 py-4 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand group-open:rounded-b-none [&::-webkit-details-marker]:hidden">
                    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none">
                      <path d="m6 3 5 5-5 5" />
                    </svg>
                    <span className="min-w-0 break-words font-semibold">{c.name}</span>
                    <span className="badge badge-muted">{c.kind === "announcement" ? "Announcements" : "Discussion"}</span>
                    <span className="badge badge-muted">{c.access === "open" ? "All customers" : `${c.productIds.length} product${c.productIds.length === 1 ? "" : "s"}`}</span>
                    <span className="ml-auto text-xs text-muted tabular-nums">{c.postCount} {c.postCount === 1 ? "post" : "posts"}</span>
                  </summary>
                  <div className="space-y-4 border-t border-line px-5 pb-5 pt-4">
                    <ChannelForm action={updateChannelAction.bind(null, c.id)} channel={c} products={products} submitLabel="Save channel" />
                    <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                      <form action={moveChannelAction.bind(null, c.id, "up")}><button aria-label={`Move ${c.name} up`} className="btn btn-secondary btn-sm min-h-10" disabled={i === 0}>Move up</button></form>
                      <form action={moveChannelAction.bind(null, c.id, "down")}><button aria-label={`Move ${c.name} down`} className="btn btn-secondary btn-sm min-h-10" disabled={i === channels.length - 1}>Move down</button></form>
                      <form action={deleteChannelAction.bind(null, c.id)} className="ml-auto">
                        <ConfirmButton className="btn btn-danger btn-sm min-h-10" aria-label={`Delete channel ${c.name}`} message={deleteMessage(c.name, c.postCount)}>Delete</ConfirmButton>
                      </form>
                    </div>
                  </div>
                </details>
              </div>
            ))}
          </section>

          <section className="card px-5 pb-5 pt-4" aria-label="Banned members">
            <h2 className="font-semibold">Banned members</h2>
            <p className="text-sm text-muted">Banned people can&apos;t see any channel. Ban someone from their post or comment.</p>
            {bans.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Nobody is banned.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {bans.map((b) => (
                  <li key={b.userId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                    <span className="min-w-0 break-words font-medium">{b.name}</span>
                    <span className="text-xs text-muted">since {dateFmt(b.createdAt)}</span>
                    <form action={unbanMemberAction.bind(null, b.userId)} className="ml-auto"><button className="btn btn-secondary btn-sm min-h-10">Unban</button></form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* `contents` below xl lets "New channel" jump to the top on small screens while Gamification stays last. */}
        <div className="contents xl:sticky xl:top-24 xl:block xl:min-w-0 xl:space-y-6 xl:self-start">
          <section className="card order-first min-w-0 px-5 pb-5 pt-4 xl:order-none">
            <h2 className="mb-3 font-semibold">New channel</h2>
            <ChannelForm action={createChannelAction} products={products} submitLabel="Create channel" />
          </section>

          <section className="card min-w-0 px-5 pb-5 pt-4" aria-label="Gamification">
            <h2 className="font-semibold">Points, levels and badges</h2>
            <p className="mt-1 text-sm text-muted">
              Learners earn points for lessons, quizzes, finishing a course and taking part in the community. {creator.gamificationEnabled ? "It's on." : "It's off: nothing is awarded and the leaderboard is hidden."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={setGamificationAction.bind(null, !creator.gamificationEnabled)}>
                <button className="btn btn-secondary btn-sm min-h-10">{creator.gamificationEnabled ? "Turn off" : "Turn on"}</button>
              </form>
              {creator.gamificationEnabled && (
                <form action={recalculatePointsAction}>
                  <button className="btn btn-secondary btn-sm min-h-10">Recalculate from progress</button>
                </form>
              )}
            </div>
            {creator.gamificationEnabled && <p className="hint">Recalculate replays existing lesson and quiz progress. Safe to repeat: nothing is awarded twice.</p>}
          </section>
        </div>
      </div>
    </>
  );
}
