import Link from "next/link";
import { deletePostAction, setPinnedAction } from "@/app/actions/community";
import { banMemberAction } from "@/app/actions/community-admin";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Button, ButtonLink } from "@/components/ui";
import type { PostView } from "@/lib/community/posts";
import { AuthorRow } from "./AuthorRow";
import { LikeButton } from "./LikeButton";
import { focusRing, touchButton } from "./styles";

/** One post: a ruled item, not a card (the feed draws the rules between posts). */
export function PostCard({ post, href, viewerIsCreator, thread = false }: { post: PostView; href: string; viewerIsCreator: boolean; thread?: boolean }) {
  // The thread page owns the h1/h2 outline: the post title is an h2 there, an h3 inside the channel feed.
  const Heading = thread ? "h2" : "h3";
  const by = post.author.name;
  return (
    <article className="min-w-0">
      <AuthorRow name={by} isCreator={post.author.isCreator} pinned={post.pinned} createdAt={post.createdAt} editedAt={post.editedAt} />
      {post.title && (
        <Heading className="mt-3 min-w-0 break-words text-lg font-bold leading-snug">
          {thread ? post.title : <Link href={href} className={`transition-colors duration-150 hover:text-[color:var(--brand-text)] ${focusRing}`}>{post.title}</Link>}
        </Heading>
      )}
      <p className={`${post.title ? "mt-1.5" : "mt-3"} whitespace-pre-wrap break-words text-[15px] leading-relaxed`}>{post.body}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <LikeButton kind="post" id={post.id} count={post.likeCount} liked={post.likedByMe} />
        {!thread && (
          <ButtonLink href={href} variant="ghost" size="sm" className={touchButton}>
            {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
          </ButtonLink>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {viewerIsCreator && (
            <form action={setPinnedAction.bind(null, post.id, !post.pinned)}>
              <Button type="submit" variant="secondary" size="sm" aria-label={`${post.pinned ? "Unpin" : "Pin"} post by ${by}`} className={touchButton}>
                {post.pinned ? "Unpin" : "Pin"}
              </Button>
            </form>
          )}
          {viewerIsCreator && !post.author.isCreator && (
            <form action={banMemberAction.bind(null, post.author.id)}>
              <ConfirmButton
                variant="danger"
                size="sm"
                className={touchButton}
                aria-label={`Remove from community: ${by}`}
                confirmLabel="Remove from community"
                message={`Remove ${by} from this community? They lose access to every channel until you unban them.`}
              >
                Remove from community
              </ConfirmButton>
            </form>
          )}
          {post.canDelete && (
            <form action={deletePostAction.bind(null, post.id, thread)}>
              <ConfirmButton
                variant="danger"
                size="sm"
                className={touchButton}
                aria-label={`Delete post by ${by}`}
                confirmLabel="Delete post"
                message="Delete this post and its comments? Points earned from it are removed too."
              >
                Delete
              </ConfirmButton>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
