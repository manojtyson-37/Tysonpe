import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/community/PostCard";
import { PostComposer } from "@/components/community/PostComposer";
import { focusRing } from "@/components/community/styles";
import { Empty } from "@/components/ui";
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="min-w-0 break-words text-xl font-extrabold">{channel.name}</h2>
          {channel.description && <p className="text-sm text-muted">{channel.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-muted"><span className="sr-only">Type: </span>{channel.kind === "announcement" ? "Announcements" : "Discussion"}</span>
          <span className="badge badge-muted"><span className="sr-only">Access: </span>{channel.access === "open" ? "All customers" : "Selected products"}</span>
        </div>
      </div>

      {canPost(channel, viewer) ? (
        <PostComposer channelId={channel.id} />
      ) : (
        <p className="card px-5 py-4 text-sm text-muted">Only {creator.displayName} posts here. You can still comment and like.</p>
      )}

      {posts.length === 0 ? (
        <Empty title="No posts yet" body={canPost(channel, viewer) ? "Be the first to post." : "Check back soon."} />
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id}>
              <PostCard post={p} href={`${base}/p/${p.id}`} viewerIsCreator={viewer.isCreator} />
            </li>
          ))}
        </ul>
      )}

      {nextCursor && (
        <Link href={`${base}?cursor=${encodeURIComponent(nextCursor)}`} className={`btn btn-secondary min-h-10 ${focusRing}`}>Older posts</Link>
      )}
    </div>
  );
}
