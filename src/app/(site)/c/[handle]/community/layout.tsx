import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandScope } from "@/components/Brand";
import { ChannelNav } from "@/components/community/ChannelNav";
import { MemberCard } from "@/components/community/MemberCard";
import { getCurrentUser } from "@/lib/auth/session";
import { ensureDefaultChannel, listChannelsFor } from "@/lib/community/channels";
import { resolveCommunity } from "@/lib/community/viewer";
import { getProfile } from "@/lib/gamification/service";

export default async function CommunityLayout({ children, params }: { children: React.ReactNode; params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const user = await getCurrentUser();
  // SECURITY: every page under community/ MUST call requireUser(<its own full path>) first.
  // This layout skips auth for logged-out visitors so deep links survive the login redirect.
  if (!user) return <>{children}</>;
  const ctx = await resolveCommunity(handle, user.id);
  if (!ctx) notFound();
  const { creator, viewer } = ctx;
  if (viewer.isCreator) await ensureDefaultChannel(creator.id);
  const channels = await listChannelsFor(creator.id, viewer);
  const profile = creator.gamificationEnabled && !viewer.isCreator && channels.length > 0 ? await getProfile(user.id, creator.id) : null;

  return (
    <BrandScope color={creator.brandColor}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p aria-hidden className="text-xs font-semibold uppercase tracking-wider text-muted">Community</p>
        <h1 className="min-w-0 break-words text-2xl font-extrabold sm:text-3xl">
          <span className="sr-only">Community: </span>
          <Link href={`/c/${creator.handle}`} className="transition-colors duration-150 hover:text-[color:var(--brand-text)]">{creator.displayName}</Link>
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
                  : "Customers of this creator get access here."}
            </p>
            {!viewer.banned && viewer.enrolledProductIds.length === 0 && (
              <Link href={`/c/${creator.handle}`} className="btn btn-primary mt-5">See what {creator.displayName} offers</Link>
            )}
          </div>
        ) : (
          // Mobile: one column, progress card first. lg: nav + feed (card under the nav). xl: nav + feed + card.
          <div className={`mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 ${profile ? "lg:grid-cols-[200px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] xl:grid-cols-[200px_minmax(0,1fr)_240px] xl:grid-rows-[auto]" : "lg:grid-cols-[200px_minmax(0,1fr)]"}`}>
            <div className={`min-w-0 ${profile ? "lg:col-start-1 lg:row-start-1 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:self-start xl:overflow-y-auto" : "lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto"}`}>
              <ChannelNav
                handle={creator.handle}
                channels={channels.map((c) => ({ slug: c.slug, name: c.name, kind: c.kind, access: c.access }))}
                showLeaderboard={creator.gamificationEnabled}
              />
            </div>
            <div className={`min-w-0 ${profile ? "lg:col-start-2 lg:row-span-2 lg:row-start-1 xl:row-span-1" : ""}`}>{children}</div>
            {profile && (
              <div className="order-first min-w-0 lg:sticky lg:top-24 lg:order-none lg:col-start-1 lg:row-start-2 lg:self-start xl:col-start-3 xl:row-start-1">
                <MemberCard profile={profile} leaderboardHref={`/c/${creator.handle}/community/leaderboard`} />
              </div>
            )}
          </div>
        )}
      </div>
    </BrandScope>
  );
}
