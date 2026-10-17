import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/community/PostCard";
import { PostComposer } from "@/components/community/PostComposer";
import { touchButton } from "@/components/community/styles";
import { ButtonLink, Callout, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { canPost } from "@/lib/community/access";
import { getChannelFor } from "@/lib/community/channels";
import { listPosts } from "@/lib/community/posts";
import { resolveCommunity } from "@/lib/community/viewer";
import { AppError } from "@/lib/errors";

export const metadata: Metadata = { title: "Community" };

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string; channel: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { handle, channel: slug } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/c/${handle}/community/${slug}`);
  const ctx = await resolveCommunity(handle, user.id);
  if (!ctx) notFound();
  const { creator, viewer } = ctx;
  const channel = await getChannelFor(creator.id, slug, viewer);
  if (!channel) notFound(); // missing OR no access: same answer
  const cursor = typeof sp.cursor === "string" ? sp.cursor.slice(0, 64) : undefined;
  let page: Awaited<ReturnType<typeof listPosts>>;
  try {
    page = await listPosts({ creatorId: creator.id, channelId: channel.id, userId: user.id, cursor });
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  const { posts, nextCursor } = page;
  const base = `/c/${creator.handle}/community/${channel.slug}`;

  const mayPost = canPost(channel, viewer);

  return (
    <div className="space-y-5">
      <div className="min-w-0">
        <h2 className="min-w-0 break-words text-xl font-bold">{channel.name}</h2>
        {channel.description && <p className="mt-0.5 break-words text-sm text-muted">{channel.description}</p>}
        {/* Two facts about the channel, said once as a quiet line (the labels are for screen readers). */}
        <p className="t-meta mt-1">
          <span className="sr-only">Type: </span>
          {channel.kind === "announcement" ? "Announcements" : "Discussion"} · <span className="sr-only">Access: </span>
          {channel.access === "open" ? "All customers" : "Selected products"}
        </p>
      </div>

      {mayPost ? (
        <PostComposer channelId={channel.id} />
      ) : (
        <Callout tone="info">Only {creator.displayName} posts here. You can still comment and like.</Callout>
      )}

      {posts.length === 0 ? (
        <div className="border-y border-line">
          <EmptyState inline title="No posts yet" body={mayPost ? "Be the first to post." : "Check back soon."} />
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {posts.map((p) => (
            <li key={p.id} className="py-5 first:pt-0">
              <PostCard post={p} href={`${base}/p/${p.id}`} viewerIsCreator={viewer.isCreator} />
            </li>
          ))}
        </ul>
      )}

      {nextCursor && (
        <ButtonLink href={`${base}?cursor=${encodeURIComponent(nextCursor)}`} variant="secondary" className={touchButton}>Older posts</ButtonLink>
      )}
    </div>
  );
}
