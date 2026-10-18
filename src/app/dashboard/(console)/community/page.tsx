import type { Metadata } from "next";
import {
  createChannelAction, deleteChannelAction, moveChannelAction, recalculatePointsAction, setGamificationAction,
  unbanMemberAction, updateChannelAction,
} from "@/app/actions/community-admin";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ChannelForm } from "@/components/community/ChannelForm";
import { IconArrowDown, IconArrowUp, IconExternal } from "@/components/icons";
import { Button, ButtonLink, DateCell, Disclosure, PageHeader, RowActions, Table, Td, Th, Tr } from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { ensureDefaultChannel, listChannelsAdmin } from "@/lib/community/channels";
import { listBans } from "@/lib/community/posts";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Community" };

const COARSE = "pointer-coarse:min-h-11";

const GAMIFICATION_OFF_CONFIRM =
  "Turn off points, levels and badges? Nothing new is awarded, the leaderboard is hidden, and members stop seeing their own points and level. Points members already earned are kept.";

function deleteMessage(name: string, postCount: number) {
  if (postCount === 0) return `Delete "${name}"? This can't be undone.`;
  return `Delete "${name}" and its ${postCount} ${postCount === 1 ? "post" : "posts"}, comments and likes? Points members earned here are removed too. This can't be undone.`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

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
        actions={
          <ButtonLink href={`/c/${creator.handle}/community`} variant="secondary" size="sm" className={COARSE} icon={<IconExternal size={16} />}>
            Open community
          </ButtonLink>
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-10 xl:grid-cols-[minmax(0,1fr)_380px] xl:grid-rows-[auto_1fr]">
        <section aria-labelledby="new-channel-h" className="min-w-0 xl:col-start-2 xl:row-start-1 xl:self-start xl:border-l xl:border-line xl:pl-8">
          <h2 id="new-channel-h" className="mb-3 text-base font-semibold">New channel</h2>
          <ChannelForm action={createChannelAction} products={products} submitLabel="Create channel" />
        </section>

        <div className="min-w-0 space-y-10 xl:col-start-1 xl:row-span-2 xl:row-start-1">
          <section aria-labelledby="channels-h">
            <h2 id="channels-h" className="sr-only">Channels</h2>
            <ul className="divide-y divide-line border-y border-line" aria-labelledby="channels-h">
              {channels.map((c, i) => (
                <li key={c.id}>
                  <Disclosure
                    className="px-1.5"
                    label={
                      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                        <span className="min-w-0 wrap-anywhere font-semibold">{c.name}</span>
                        <span className="t-meta">
                          {c.kind === "announcement" ? "Announcements" : "Discussion"}{" "}
                          <span aria-hidden="true">·</span>{" "}
                          {c.access === "open" ? "All customers" : plural(c.productIds.length, "product", "products")}
                        </span>
                        <span className="t-meta tabular-nums sm:ml-auto">{plural(c.postCount, "post", "posts")}</span>
                      </span>
                    }
                  >
                    <div className="space-y-4 pb-5 pt-1">
                      <ChannelForm action={updateChannelAction.bind(null, c.id)} channel={c} products={products} submitLabel="Save channel" />
                      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                        <form action={moveChannelAction.bind(null, c.id, "up")}>
                          <Button type="submit" variant="secondary" size="sm" className={COARSE} icon={<IconArrowUp size={16} />} aria-label={`Move up: ${c.name}`} disabled={i === 0}>
                            Move up
                          </Button>
                        </form>
                        <form action={moveChannelAction.bind(null, c.id, "down")}>
                          <Button type="submit" variant="secondary" size="sm" className={COARSE} icon={<IconArrowDown size={16} />} aria-label={`Move down: ${c.name}`} disabled={i === channels.length - 1}>
                            Move down
                          </Button>
                        </form>
                        <form action={deleteChannelAction.bind(null, c.id)} className="ml-auto">
                          <ConfirmButton
                            variant="danger"
                            size="sm"
                            className={COARSE}
                            aria-label={`Delete channel ${c.name}`}
                            message={deleteMessage(c.name, c.postCount)}
                            confirmLabel="Delete channel"
                          >
                            Delete
                          </ConfirmButton>
                        </form>
                      </div>
                    </div>
                  </Disclosure>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="bans-h">
            <h2 id="bans-h" className="text-base font-semibold">Banned members</h2>
            <p className="mt-1 text-sm text-muted">Banned people can&apos;t see any channel. Ban someone from their post or comment.</p>
            {bans.length === 0 ? (
              <p className="mt-3 border-y border-line py-4 text-sm text-muted">Nobody is banned.</p>
            ) : (
              <div className="mt-3 border-t border-line">
                <Table aria-label="Banned members" stack>
                  <thead>
                    <tr>
                      <Th>Member</Th>
                      <Th>Since</Th>
                      <Th><span className="sr-only">Actions</span></Th>
                    </tr>
                  </thead>
                  <tbody>
                    {bans.map((b) => (
                      <Tr key={b.userId}>
                        <Td label="Member" className="min-w-0 wrap-anywhere font-medium">{b.name}</Td>
                        <DateCell date={b.createdAt} label="Since" />
                        <RowActions>
                          <form action={unbanMemberAction.bind(null, b.userId)}>
                            <Button type="submit" variant="secondary" size="sm" className={COARSE} aria-label={`Unban ${b.name}`}>Unban</Button>
                          </form>
                        </RowActions>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </section>
        </div>

        <section
          aria-labelledby="gamification-h"
          className="min-w-0 border-t border-line pt-6 xl:col-start-2 xl:row-start-2 xl:self-start xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0"
        >
          <h2 id="gamification-h" className="text-base font-semibold">Points, levels and badges</h2>
          <p className="mt-1 text-sm text-muted">
            Learners earn points for lessons, quizzes, finishing a course and taking part in the community. {creator.gamificationEnabled ? "It's on." : "It's off: nothing is awarded and the leaderboard is hidden."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {creator.gamificationEnabled ? (
              <form action={setGamificationAction.bind(null, false)}>
                <ConfirmButton variant="secondary" size="sm" className={COARSE} message={GAMIFICATION_OFF_CONFIRM} confirmLabel="Turn off" destructive={false}>
                  Turn off
                </ConfirmButton>
              </form>
            ) : (
              <form action={setGamificationAction.bind(null, true)}>
                <Button type="submit" variant="secondary" size="sm" className={COARSE}>Turn on</Button>
              </form>
            )}
            {creator.gamificationEnabled && (
              <form action={recalculatePointsAction}>
                <Button type="submit" variant="secondary" size="sm" className={COARSE}>Recalculate from progress</Button>
              </form>
            )}
          </div>
          {creator.gamificationEnabled && <p className="hint">Recalculate replays existing lesson and quiz progress. Safe to repeat: nothing is awarded twice.</p>}
        </section>
      </div>
    </>
  );
}
