import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCommentAction } from "@/app/actions/community";
import { banMemberAction } from "@/app/actions/community-admin";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CommentForm } from "@/components/community/CommentForm";
import { EditCommentForm } from "@/components/community/EditCommentForm";
import { EditPostForm } from "@/components/community/EditPostForm";
import { stamp } from "@/components/community/format";
import { LikeButton } from "@/components/community/LikeButton";
import { PostCard } from "@/components/community/PostCard";
import { creatorBadge, focusRing } from "@/components/community/styles";
import { requireUser } from "@/lib/auth/session";
import { getThread } from "@/lib/community/posts";
import { resolveCommunity } from "@/lib/community/viewer";
import { AppError } from "@/lib/errors";

export const metadata: Metadata = { title: "Community post" };

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string; channel: string; postId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { handle, channel: slug, postId } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/c/${handle}/community/${slug}/p/${postId}`);
  const ctx = await resolveCommunity(handle, user.id);
  if (!ctx) notFound();
  const after = typeof sp.after === "string" && sp.after ? sp.after.slice(0, 64) : undefined;
  let thread: Awaited<ReturnType<typeof getThread>>;
  try {
    thread = await getThread(user.id, postId, { after });
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  // The URL must describe the post's real creator and channel; otherwise it's someone else's link.
  if (thread.channel.creatorId !== ctx.creator.id || thread.channel.slug !== slug) notFound();
  const { post, comments, nextCommentCursor } = thread;
  const back = `/c/${ctx.creator.handle}/community/${slug}`;
  const here = `${back}/p/${postId}`;

  return (
    <div className="space-y-4">
      <Link href={back} className={`inline-flex min-h-10 min-w-0 items-center break-words rounded-lg text-sm font-medium text-muted transition-all duration-150 hover:text-ink active:scale-[0.98] ${focusRing}`}>
        <span aria-hidden>←&nbsp;</span>{thread.channel.name}
      </Link>
      <PostCard post={post} href="" viewerIsCreator={ctx.viewer.isCreator} thread />

      {post.canEdit && (
        <details className="card px-5 py-3">
          <summary className="cursor-pointer text-sm font-semibold">Edit your post</summary>
          <div className="mt-3"><EditPostForm postId={post.id} title={post.title} body={post.body} /></div>
        </details>
      )}

      <section aria-label="Comments" className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted">{post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}</h2>
        {comments.length === 0 && !after ? (
          <p className="card px-5 py-4 text-sm text-muted">No comments yet.</p>
        ) : (
          <ol className="space-y-3">
            {comments.map((c) => {
              const mine = c.author.id === user.id;
              const canBan = ctx.viewer.isCreator && !c.author.isCreator;
              return (
                <li key={c.id} className="card px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span className="min-w-0 break-words text-sm font-semibold text-ink">{c.author.name}</span>
                    {c.author.isCreator && <span className={creatorBadge}>Creator</span>}
                    <time dateTime={c.createdAt.toISOString()}>{stamp(c.createdAt)}</time>
                    {c.editedAt && <span>edited</span>}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{c.body}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <LikeButton kind="comment" id={c.id} count={c.likeCount} liked={c.likedByMe} />
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      {canBan && (
                        <form action={banMemberAction.bind(null, c.author.id)}>
                          <ConfirmButton
                            className={`btn btn-danger btn-sm min-h-10 ${focusRing}`}
                            aria-label={`Remove from community: ${c.author.name}`}
                            message={`Remove ${c.author.name} from this community? They lose access to every channel until you unban them.`}
                          >
                            Remove from community
                          </ConfirmButton>
                        </form>
                      )}
                      {c.canDelete && (
                        <form action={deleteCommentAction.bind(null, c.id)}>
                          <ConfirmButton className={`btn btn-danger btn-sm min-h-10 ${focusRing}`} aria-label={`Delete comment by ${c.author.name}`} message="Delete this comment?">
                            Delete
                          </ConfirmButton>
                        </form>
                      )}
                    </div>
                  </div>
                  {mine && (
                    <details className="mt-2.5 border-t border-line pt-2.5">
                      <summary className={`inline-flex min-h-10 cursor-pointer items-center rounded-lg text-sm font-semibold ${focusRing}`}>
                        Edit<span className="sr-only"> comment by {c.author.name}</span>
                      </summary>
                      <div className="mt-2"><EditCommentForm commentId={c.id} body={c.body} /></div>
                    </details>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        {nextCommentCursor && (
          // Comments are oldest-first, so the cursor leads to LATER comments despite the "older" wording in the brief.
          <Link href={`${here}?after=${encodeURIComponent(nextCommentCursor)}`} className={`btn btn-secondary min-h-10 ${focusRing}`}>More comments</Link>
        )}
        {after && (
          <Link href={here} className={`btn btn-ghost min-h-10 ${focusRing}`}>Back to the first comments</Link>
        )}
        <div className="card px-5 pb-4 pt-5"><CommentForm postId={post.id} /></div>
      </section>
    </div>
  );
}
