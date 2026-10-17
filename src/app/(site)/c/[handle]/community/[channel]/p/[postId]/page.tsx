import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCommentAction } from "@/app/actions/community";
import { banMemberAction } from "@/app/actions/community-admin";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CommentForm } from "@/components/community/CommentForm";
import { EditCommentForm } from "@/components/community/EditCommentForm";
import { EditPostForm } from "@/components/community/EditPostForm";
import { AuthorRow } from "@/components/community/AuthorRow";
import { LikeButton } from "@/components/community/LikeButton";
import { PostCard } from "@/components/community/PostCard";
import { focusRing, touchButton } from "@/components/community/styles";
import { IconArrowLeft, IconChevronDown } from "@/components/icons";
import { ButtonLink } from "@/components/ui";
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
    <div className="space-y-5">
      <Link href={back} className={`inline-flex min-w-0 items-center gap-1 break-words rounded-control text-sm text-muted transition-colors duration-150 hover:text-ink pointer-coarse:min-h-11 ${focusRing}`}>
        <IconArrowLeft size={16} className="shrink-0" />
        {thread.channel.name}
      </Link>
      <PostCard post={post} href="" viewerIsCreator={ctx.viewer.isCreator} thread />

      {post.canEdit && (
        <details className="group border-y border-line">
          <summary className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden ${focusRing}`}>
            Edit your post
            <IconChevronDown size={16} className="shrink-0 text-muted transition-transform duration-(--dur-fast) ease-(--ease-standard) group-open:rotate-180" />
          </summary>
          <div className="pb-5 pt-1"><EditPostForm postId={post.id} title={post.title} body={post.body} /></div>
        </details>
      )}

      <section aria-label="Comments" className="space-y-4">
        <h2 className="text-lg font-bold">{post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}</h2>
        {comments.length === 0 && !after ? (
          <p className="border-y border-line py-4 text-sm text-muted">No comments yet.</p>
        ) : (
          <ol className="divide-y divide-line border-y border-line">
            {comments.map((c) => {
              const mine = c.author.id === user.id;
              const canBan = ctx.viewer.isCreator && !c.author.isCreator;
              return (
                <li key={c.id} className="py-4">
                  <AuthorRow name={c.author.name} isCreator={c.author.isCreator} createdAt={c.createdAt} editedAt={c.editedAt} />
                  <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{c.body}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <LikeButton kind="comment" id={c.id} count={c.likeCount} liked={c.likedByMe} />
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      {canBan && (
                        <form action={banMemberAction.bind(null, c.author.id)}>
                          <ConfirmButton
                            variant="danger"
                            size="sm"
                            className={touchButton}
                            aria-label={`Remove from community: ${c.author.name}`}
                            confirmLabel="Remove from community"
                            message={`Remove ${c.author.name} from this community? They lose access to every channel until you unban them.`}
                          >
                            Remove from community
                          </ConfirmButton>
                        </form>
                      )}
                      {c.canDelete && (
                        <form action={deleteCommentAction.bind(null, c.id)}>
                          <ConfirmButton variant="danger" size="sm" className={touchButton} aria-label={`Delete comment by ${c.author.name}`} confirmLabel="Delete comment" message="Delete this comment?">
                            Delete
                          </ConfirmButton>
                        </form>
                      )}
                    </div>
                  </div>
                  {mine && (
                    <details className="group mt-3 border-t border-line">
                      <summary className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden ${focusRing}`}>
                        <span>Edit<span className="sr-only"> comment by {c.author.name}</span></span>
                        <IconChevronDown size={16} className="shrink-0 text-muted transition-transform duration-(--dur-fast) ease-(--ease-standard) group-open:rotate-180" />
                      </summary>
                      <div className="pb-2 pt-1"><EditCommentForm commentId={c.id} body={c.body} /></div>
                    </details>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        {(nextCommentCursor || after) && (
          <div className="flex flex-wrap items-center gap-2">
            {nextCommentCursor && (
              // Comments are oldest-first, so the cursor leads to LATER comments despite the "older" wording in the brief.
              <ButtonLink href={`${here}?after=${encodeURIComponent(nextCommentCursor)}`} variant="secondary" className={touchButton}>More comments</ButtonLink>
            )}
            {after && <ButtonLink href={here} variant="ghost" className={touchButton}>Back to the first comments</ButtonLink>}
          </div>
        )}
        <div className="border-t border-line pt-5"><CommentForm postId={post.id} /></div>
      </section>
    </div>
  );
}
