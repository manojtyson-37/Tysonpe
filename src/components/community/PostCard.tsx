import Link from "next/link";
import { deletePostAction, setPinnedAction } from "@/app/actions/community";
import { banMemberAction } from "@/app/actions/community-admin";
import { ConfirmButton } from "@/components/ConfirmButton";
import type { PostView } from "@/lib/community/posts";
import { stamp } from "./format";
import { LikeButton } from "./LikeButton";

export function PostCard({ post, href, viewerIsCreator, thread = false }: { post: PostView; href: string; viewerIsCreator: boolean; thread?: boolean }) {
  return (
    <article className={`card ${post.pinned ? "border-brand/40" : ""}`}>
      <div className="px-5 pb-3 pt-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span className="text-sm font-semibold text-ink">{post.author.name}</span>
          {post.author.isCreator && <span className="badge badge-brand">Creator</span>}
          {post.pinned && <span className="badge badge-warn">Pinned</span>}
          <time dateTime={post.createdAt.toISOString()}>{stamp(post.createdAt)}</time>
          {post.editedAt && <span>edited</span>}
        </div>
        {post.title && (
          <h3 className="mt-2 text-lg font-bold leading-snug">
            {thread ? post.title : <Link href={href} className="transition-colors duration-150 hover:text-brand">{post.title}</Link>}
          </h3>
        )}
        <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{post.body}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-2.5">
        <LikeButton kind="post" id={post.id} count={post.likeCount} liked={post.likedByMe} />
        {!thread && (
          <Link href={href} className="btn btn-ghost btn-sm">
            {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
          </Link>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {viewerIsCreator && (
            <form action={setPinnedAction.bind(null, post.id, !post.pinned)}>
              <button className="btn btn-secondary btn-sm active:scale-[0.98]">{post.pinned ? "Unpin" : "Pin"}</button>
            </form>
          )}
          {viewerIsCreator && !post.author.isCreator && (
            <form action={banMemberAction.bind(null, post.author.id)}>
              <ConfirmButton className="btn btn-danger btn-sm" message={`Remove ${post.author.name} from this community? They lose access to every channel until you unban them.`}>
                Ban author
              </ConfirmButton>
            </form>
          )}
          {post.canDelete && (
            <form action={deletePostAction.bind(null, post.id, thread)}>
              <ConfirmButton className="btn btn-danger btn-sm" message="Delete this post and its comments? Points earned from it are removed too.">Delete</ConfirmButton>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
