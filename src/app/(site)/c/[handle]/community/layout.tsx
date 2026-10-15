import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandScope } from "@/components/Brand";
import { ChannelNav } from "@/components/community/ChannelNav";
import { requireUser } from "@/lib/auth/session";
import { ensureDefaultChannel, listChannelsFor } from "@/lib/community/channels";
import { resolveCommunity } from "@/lib/community/viewer";

export default async function CommunityLayout({ children, params }: { children: React.ReactNode; params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const user = await requireUser(`/c/${handle}/community`);
  const ctx = await resolveCommunity(handle, user.id);
  if (!ctx) notFound();
  const { creator, viewer } = ctx;
  if (viewer.isCreator) await ensureDefaultChannel(creator.id);
  const channels = await listChannelsFor(creator.id, viewer);

  return (
    <BrandScope color={creator.brandColor}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Community</p>
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          <Link href={`/c/${creator.handle}`} className="transition-colors duration-150 hover:text-brand">{creator.displayName}</Link>
        </h1>

        {channels.length === 0 ? (
          <div className="card mt-6 max-w-xl px-6 py-8">
            <p className="text-lg font-semibold">
              {viewer.banned
                ? "You've been removed from this community"
                : viewer.enrolledProductIds.length > 0
                  ? "No channels are open to you yet"
                  : "This community is for people who've bought from this creator"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {viewer.banned
                ? "The creator has removed your access. Contact them if you think this is a mistake."
                : viewer.enrolledProductIds.length > 0
                  ? `${creator.displayName} hasn't opened a channel for your purchase yet. Check back soon.`
                  : "Buy any of their products and the community opens up here straight away."}
            </p>
            {!viewer.banned && viewer.enrolledProductIds.length === 0 && (
              <Link href={`/c/${creator.handle}`} className="btn btn-primary mt-5">See what {creator.displayName} offers</Link>
            )}
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <ChannelNav
                handle={creator.handle}
                channels={channels.map((c) => ({ slug: c.slug, name: c.name, kind: c.kind, access: c.access }))}
                showLeaderboard={creator.gamificationEnabled}
              />
            </aside>
            <div className="min-w-0">{children}</div>
          </div>
        )}
      </div>
    </BrandScope>
  );
}
