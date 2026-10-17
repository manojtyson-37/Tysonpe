import Link from "next/link";
import { deletePostAction, setPinnedAction } from "@/app/actions/community";
import { banMemberAction } from "@/app/actions/community-admin";
import { ConfirmButton } from "@/components/ConfirmButton";
import { IconPin } from "@/components/icons";
import { Avatar, Button, ButtonLink } from "@/components/ui";
import type { PostView } from "@/lib/community/posts";
import { stamp } from "./format";
import { LikeButton } from "./LikeButton";
import { focusRing, touchButton } from "./styles";

/**
 * One post: a ruled item, not a card (the feed draws the rules between posts). The author row has no pills: "Creator" and
 * "Pinned" are plain words, so the state is in the text and not in a coloured fill.
 */
export function PostCard({ post, href, viewerIsCreator, thread = false }: { post: PostView; href: string; viewerIsCreator: boolean; thread?: boolean }) {
  // The thread page owns the h1/h2 outline: the post title is an h2 there, an h3 inside the channel feed.
  const Heading = thread ? "h2" : "h3";
  const by = post.author.name;
  return (
    <article className="min-w-0">
      <div className="flex items-center gap-3">
        <Avatar name={by} size="sm" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="min-w-0 break-words text-sm font-semibold text-ink">{by}</span>
            {post.author.isCreator && <span className="text-xs font-semibold text-ink">Creator</span>}
            {post.pinned && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink">
                <IconPin size={14} className="shrink-0" />
                Pinned
              </span>
            )}
          </div>
          <p className="t-meta">
            <time dateTime={post.createdAt.toISOString()}>{stamp(post.createdAt)}</time>
            {post.editedAt && <span> · edited</span>}
          </p>
        </div>
      </div>
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
