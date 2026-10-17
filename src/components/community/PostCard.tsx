import Link from "next/link";
import { deletePostAction, setPinnedAction } from "@/app/actions/community";
import { banMemberAction } from "@/app/actions/community-admin";
import { ConfirmButton } from "@/components/ConfirmButton";
import type { PostView } from "@/lib/community/posts";
import { stamp } from "./format";
import { LikeButton } from "./LikeButton";
import { creatorBadge, focusRing } from "./styles";

export function PostCard({ post, href, viewerIsCreator, thread = false }: { post: PostView; href: string; viewerIsCreator: boolean; thread?: boolean }) {
  // The thread page owns the h1/h2 outline: the post title is an h2 there, an h3 inside the channel feed.
  const Heading = thread ? "h2" : "h3";
  const by = post.author.name;
  return (
    <article className={`card ${post.pinned ? "border-brand/40" : ""}`}>
      <div className="px-5 pb-3 pt-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span className="min-w-0 break-words text-sm font-semibold text-ink">{by}</span>
          {post.author.isCreator && <span className={creatorBadge}>Creator</span>}
          {post.pinned && <span className="badge badge-warn">Pinned</span>}
          <time dateTime={post.createdAt.toISOString()}>{stamp(post.createdAt)}</time>
          {post.editedAt && <span>edited</span>}
        </div>
        {post.title && (
          <Heading className="mt-2 min-w-0 break-words text-lg font-bold leading-snug">
            {thread ? post.title : <Link href={href} className="transition-colors duration-150 hover:text-[color:var(--brand-text)]">{post.title}</Link>}
          </Heading>
        )}
        <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{post.body}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-2.5">
        <LikeButton kind="post" id={post.id} count={post.likeCount} liked={post.likedByMe} />
        {!thread && (
          <Link href={href} className={`btn btn-ghost btn-sm min-h-10 ${focusRing}`}>
            {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
          </Link>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {viewerIsCreator && (
            <form action={setPinnedAction.bind(null, post.id, !post.pinned)}>
              <button aria-label={`${post.pinned ? "Unpin" : "Pin"} post by ${by}`} className={`btn btn-secondary btn-sm min-h-10 ${focusRing}`}>{post.pinned ? "Unpin" : "Pin"}</button>
            </form>
          )}
          {viewerIsCreator && !post.author.isCreator && (
            <form action={banMemberAction.bind(null, post.author.id)}>
              <ConfirmButton
                className={`btn btn-danger btn-sm min-h-10 ${focusRing}`}
                aria-label={`Remove from community: ${by}`}
                message={`Remove ${by} from this community? They lose access to every channel until you unban them.`}
              >
                Remove from community
              </ConfirmButton>
            </form>
          )}
          {post.canDelete && (
            <form action={deletePostAction.bind(null, post.id, thread)}>
              <ConfirmButton
                className={`btn btn-danger btn-sm min-h-10 ${focusRing}`}
                aria-label={`Delete post by ${by}`}
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
