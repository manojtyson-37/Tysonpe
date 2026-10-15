import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCommentAction } from "@/app/actions/community";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CommentForm } from "@/components/community/CommentForm";
import { EditPostForm } from "@/components/community/EditPostForm";
import { stamp } from "@/components/community/format";
import { LikeButton } from "@/components/community/LikeButton";
import { PostCard } from "@/components/community/PostCard";
import { requireUser } from "@/lib/auth/session";
import { getThread } from "@/lib/community/posts";
import { resolveCommunity } from "@/lib/community/viewer";
import { AppError } from "@/lib/errors";

export const metadata: Metadata = { title: "Community post" };

export default async function ThreadPage({ params }: { params: Promise<{ handle: string; channel: string; postId: string }> }) {
  const { handle, channel: slug, postId } = await params;
  const user = await requireUser(`/c/${handle}/community/${slug}/p/${postId}`);
  const ctx = await resolveCommunity(handle, user.id);
  if (!ctx) notFound();
  let thread: Awaited<ReturnType<typeof getThread>>;
  try {
    thread = await getThread(user.id, postId);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  // The URL must describe the post's real creator and channel; otherwise it's someone else's link.
  if (thread.channel.creatorId !== ctx.creator.id || thread.channel.slug !== slug) notFound();
  const { post, comments } = thread;
  const back = `/c/${ctx.creator.handle}/community/${slug}`;

  return (
    <div className="space-y-4">
      <Link href={back} className="text-sm font-medium text-muted transition-colors duration-150 hover:text-ink">← {thread.channel.name}</Link>
      <PostCard post={post} href="" viewerIsCreator={ctx.viewer.isCreator} thread />

      {post.canEdit && (
        <details className="card px-5 py-3">
          <summary className="cursor-pointer text-sm font-semibold">Edit your post</summary>
          <div className="mt-3"><EditPostForm postId={post.id} title={post.title} body={post.body} /></div>
        </details>
      )}

      <section aria-label="Comments" className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted">{comments.length} {comments.length === 1 ? "comment" : "comments"}</h3>
        {comments.map((c) => (
          <div key={c.id} className="card px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
              <span className="text-sm font-semibold text-ink">{c.author.name}</span>
              {c.author.isCreator && <span className="badge badge-brand">Creator</span>}
              <time dateTime={c.createdAt.toISOString()}>{stamp(c.createdAt)}</time>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{c.body}</p>
            <div className="mt-2.5 flex items-center gap-2">
              <LikeButton kind="comment" id={c.id} count={c.likeCount} liked={c.likedByMe} />
              {c.canDelete && (
                <form action={deleteCommentAction.bind(null, c.id)} className="ml-auto">
                  <ConfirmButton className="btn btn-danger btn-sm" message="Delete this comment?">Delete</ConfirmButton>
                </form>
              )}
            </div>
          </div>
        ))}
        <div className="card px-5 pb-4 pt-5"><CommentForm postId={post.id} /></div>
      </section>
    </div>
  );
}
