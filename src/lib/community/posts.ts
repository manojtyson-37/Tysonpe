import { z } from "zod";
import { db, lockKey } from "../db";
import { AppError, isUniqueViolation } from "../errors";
import { awardSafely } from "../gamification/hooks";
import { canAccessChannel, canComment, canModerate, canPost, type ChannelAccessInfo, type Viewer } from "./access";
import { LIMITS, commentSchema, postSchema } from "./validation";
import { loadViewer } from "./viewer";

export type AuthorView = { id: string; name: string; isCreator: boolean };
export type PostView = {
  id: string; title: string; body: string; pinned: boolean; createdAt: Date; editedAt: Date | null;
  author: AuthorView; commentCount: number; likeCount: number; likedByMe: boolean; canEdit: boolean; canDelete: boolean;
};
export type CommentView = {
  id: string; body: string; createdAt: Date; author: AuthorView; likeCount: number; likedByMe: boolean; canDelete: boolean;
};

const notFound = () => new AppError("not_found", "Not found.");
const forbidden = () => new AppError("forbidden", "You can't do that.");

function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const r = schema.safeParse(input);
  if (!r.success) throw new AppError("invalid", r.error.issues[0]?.message ?? "Check what you wrote.");
  return r.data;
}

async function channelInfo(channelId: string) {
  const ch = await db.channel.findUnique({ where: { id: channelId }, include: { products: { select: { productId: true } } } });
  if (!ch) return null;
  const info: ChannelAccessInfo = { access: ch.access as ChannelAccessInfo["access"], kind: ch.kind as ChannelAccessInfo["kind"], productIds: ch.products.map((p) => p.productId) };
  return { ch, info };
}

/** Channel + viewer, or not_found when the channel doesn't exist OR the user can't see it. */
async function gate(userId: string | null, channelId: string) {
  const found = await channelInfo(channelId);
  if (!found) throw notFound();
  const viewer = await loadViewer(found.ch.creatorId, userId);
  if (!canAccessChannel(found.info, viewer)) throw notFound();
  return { ...found, viewer };
}

async function gatePost(userId: string | null, postId: string) {
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) throw notFound();
  return { post, ...(await gate(userId, post.channelId)) };
}

/* ---------- views ---------- */

/** The creator shows their store name; everyone else shows their account name. Never an email. */
const authorView = (u: { id: string; name: string }, creator: { userId: string; displayName: string }): AuthorView =>
  u.id === creator.userId ? { id: u.id, name: creator.displayName, isCreator: true } : { id: u.id, name: u.name, isCreator: false };

type PostRow = { id: string; title: string; body: string; pinned: boolean; createdAt: Date; editedAt: Date | null; authorId: string; author: { id: string; name: string } };

async function toPostViews(rows: PostRow[], viewer: Viewer, userId: string | null, creator: { userId: string; displayName: string }): Promise<PostView[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [comments, likes, mine] = await Promise.all([
    db.comment.groupBy({ by: ["postId"], where: { postId: { in: ids } }, _count: { _all: true } }),
    db.like.groupBy({ by: ["postId"], where: { postId: { in: ids } }, _count: { _all: true } }),
    userId ? db.like.findMany({ where: { userId, postId: { in: ids } }, select: { postId: true } }) : Promise.resolve([]),
  ]);
  const cc = new Map(comments.map((c) => [c.postId, c._count._all]));
  const lc = new Map(likes.map((l) => [l.postId, l._count._all]));
  const liked = new Set(mine.map((m) => m.postId));
  return rows.map((r) => ({
    id: r.id, title: r.title, body: r.body, pinned: r.pinned, createdAt: r.createdAt, editedAt: r.editedAt,
    author: authorView(r.author, creator),
    commentCount: cc.get(r.id) ?? 0, likeCount: lc.get(r.id) ?? 0, likedByMe: liked.has(r.id),
    canEdit: r.authorId === userId, canDelete: r.authorId === userId || canModerate(viewer),
  }));
}

const postSelect = { id: true, title: true, body: true, pinned: true, createdAt: true, editedAt: true, authorId: true, author: { select: { id: true, name: true } } } as const;

export async function listPosts(a: { creatorId: string; channelId: string; userId: string | null; cursor?: string }) {
  const { ch, viewer } = await gate(a.userId, a.channelId);
  if (ch.creatorId !== a.creatorId) throw notFound();
  const creator = await db.creator.findUniqueOrThrow({ where: { id: a.creatorId }, select: { userId: true, displayName: true } });

  // The cursor must be one of THIS channel's unpinned posts; anything else is ignored (no probing other channels' ids).
  const cursor = a.cursor && (await db.post.count({ where: { id: a.cursor, channelId: ch.id, pinned: false } })) > 0 ? a.cursor : undefined;
  // Pinned posts (max 3) lead page one only; the cursor walks the unpinned posts newest-first.
  const pinned = cursor ? [] : await db.post.findMany({ where: { channelId: ch.id, pinned: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: postSelect });
  const rest = await db.post.findMany({
    where: { channelId: ch.id, pinned: false },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: LIMITS.pageSize + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: postSelect,
  });
  const hasMore = rest.length > LIMITS.pageSize;
  const page = hasMore ? rest.slice(0, LIMITS.pageSize) : rest;
  const posts = await toPostViews([...pinned, ...page], viewer, a.userId, creator);
  return { posts, nextCursor: hasMore ? page[page.length - 1].id : null };
}

export async function getThread(userId: string | null, postId: string) {
  const { post, ch, viewer } = await gatePost(userId, postId);
  const creator = await db.creator.findUniqueOrThrow({ where: { id: ch.creatorId }, select: { userId: true, displayName: true } });
  const row = await db.post.findUniqueOrThrow({ where: { id: post.id }, select: postSelect });
  const [postView] = await toPostViews([row], viewer, userId, creator);
  const rows = await db.comment.findMany({
    where: { postId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, body: true, createdAt: true, authorId: true, author: { select: { id: true, name: true } } },
  });
  const ids = rows.map((r) => r.id);
  const [likes, mine] = await Promise.all([
    db.like.groupBy({ by: ["commentId"], where: { commentId: { in: ids } }, _count: { _all: true } }),
    userId && ids.length ? db.like.findMany({ where: { userId, commentId: { in: ids } }, select: { commentId: true } }) : Promise.resolve([]),
  ]);
  const lc = new Map(likes.map((l) => [l.commentId, l._count._all]));
  const liked = new Set(mine.map((m) => m.commentId));
  const comments: CommentView[] = rows.map((r) => ({
    id: r.id, body: r.body, createdAt: r.createdAt,
    author: authorView(r.author, creator),
    likeCount: lc.get(r.id) ?? 0, likedByMe: liked.has(r.id), canDelete: r.authorId === userId || canModerate(viewer),
  }));
  return { post: postView, channel: { id: ch.id, slug: ch.slug, name: ch.name, creatorId: ch.creatorId }, comments };
}

/* ---------- posts ---------- */

export async function createPost(userId: string, channelId: string, input: unknown): Promise<{ id: string }> {
  const { ch, info, viewer } = await gate(userId, channelId);
  if (!canPost(info, viewer)) throw forbidden();
  const data = parse(postSchema, input);
  const post = await db.post.create({ data: { channelId, authorId: userId, ...data }, select: { id: true } });
  await awardSafely({ userId, creatorId: ch.creatorId, kind: "post_created", refId: post.id, sourceId: post.id });
  return post;
}

export async function editPost(userId: string, postId: string, input: unknown): Promise<void> {
  const { post } = await gatePost(userId, postId);
  if (post.authorId !== userId) throw forbidden();
  const data = parse(postSchema, input);
  await db.post.update({ where: { id: postId }, data: { ...data, editedAt: new Date() } });
}

export async function deletePost(userId: string, postId: string): Promise<void> {
  const { post, viewer } = await gatePost(userId, postId);
  if (post.authorId !== userId && !canModerate(viewer)) throw forbidden();
  const comments = await db.comment.findMany({ where: { postId }, select: { id: true } });
  await db.$transaction([
    db.pointEvent.deleteMany({ where: { sourceId: { in: [postId, ...comments.map((c) => c.id)] } } }),
    db.post.delete({ where: { id: postId } }),
  ]);
}

export async function setPinned(userId: string, postId: string, pinned: boolean): Promise<void> {
  const { post, viewer } = await gatePost(userId, postId);
  if (!canModerate(viewer)) throw forbidden();
  await db.$transaction(async (tx) => {
    await lockKey(tx, `pin:${post.channelId}`); // two simultaneous pins can't both squeeze under the limit (no-op on SQLite)
    if (pinned && !post.pinned) {
      const count = await tx.post.count({ where: { channelId: post.channelId, pinned: true } });
      if (count >= LIMITS.maxPinned) throw new AppError("limit", `You can pin up to ${LIMITS.maxPinned} posts per channel.`);
    }
    await tx.post.update({ where: { id: postId }, data: { pinned } });
  });
}

/* ---------- comments ---------- */

export async function addComment(userId: string, postId: string, input: unknown): Promise<{ id: string }> {
  const { ch, info, viewer } = await gatePost(userId, postId);
  if (!canComment(info, viewer)) throw forbidden();
  const data = parse(commentSchema, input);
  const c = await db.comment.create({ data: { postId, authorId: userId, body: data.body }, select: { id: true } });
  await awardSafely({ userId, creatorId: ch.creatorId, kind: "comment_created", refId: c.id, sourceId: c.id });
  return c;
}

export async function deleteComment(userId: string, commentId: string): Promise<void> {
  const comment = await db.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw notFound();
  const { viewer } = await gatePost(userId, comment.postId);
  if (comment.authorId !== userId && !canModerate(viewer)) throw forbidden();
  await db.$transaction([
    db.pointEvent.deleteMany({ where: { sourceId: commentId } }),
    db.comment.delete({ where: { id: commentId } }),
  ]);
}

/* ---------- likes ---------- */

export async function toggleLike(userId: string, target: { postId: string } | { commentId: string }) {
  let postId: string;
  let targetId: string;
  let targetAuthorId: string;
  if ("postId" in target) {
    const p = await db.post.findUnique({ where: { id: target.postId }, select: { id: true, authorId: true } });
    if (!p) throw notFound();
    postId = p.id; targetId = p.id; targetAuthorId = p.authorId;
  } else {
    const c = await db.comment.findUnique({ where: { id: target.commentId }, select: { id: true, postId: true, authorId: true } });
    if (!c) throw notFound();
    postId = c.postId; targetId = c.id; targetAuthorId = c.authorId;
  }
  const { ch, info, viewer } = await gatePost(userId, postId);
  if (!canComment(info, viewer)) throw forbidden();

  const key = "postId" in target ? { userId, postId: target.postId } : { userId, commentId: target.commentId };
  // deleteMany + create-and-catch: two simultaneous toggles (a double-click) can't throw a raw unique violation.
  let liked: boolean;
  if ((await db.like.deleteMany({ where: key })).count > 0) {
    liked = false;
  } else {
    liked = true;
    try {
      await db.like.create({ data: key });
      if (targetAuthorId !== userId) {
        // refId is stable per (liker, target): unlike + re-like can never farm points.
        await awardSafely({ userId: targetAuthorId, creatorId: ch.creatorId, kind: "like_received", refId: `${userId}:${targetId}`, sourceId: targetId });
      }
    } catch (e) {
      if (!isUniqueViolation(e)) throw e; // a concurrent toggle created it first: the like exists
    }
  }
  const likeCount = await db.like.count({ where: "postId" in target ? { postId: target.postId } : { commentId: target.commentId } });
  return { liked, likeCount };
}

/* ---------- moderation ---------- */

export async function banMember(actorUserId: string, creatorId: string, targetUserId: string): Promise<void> {
  const creator = await db.creator.findUnique({ where: { id: creatorId }, select: { userId: true } });
  if (!creator || creator.userId !== actorUserId) throw forbidden();
  if (targetUserId === creator.userId) throw new AppError("invalid", "You can't ban yourself.");
  const user = await db.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
  if (!user) throw notFound();
  await db.communityBan.upsert({
    where: { creatorId_userId: { creatorId, userId: targetUserId } },
    create: { creatorId, userId: targetUserId },
    update: {},
  });
}

export async function unbanMember(creatorId: string, targetUserId: string): Promise<void> {
  await db.communityBan.deleteMany({ where: { creatorId, userId: targetUserId } });
}

export async function listBans(creatorId: string) {
  const rows = await db.communityBan.findMany({ where: { creatorId }, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } });
  return rows.map((r) => ({ userId: r.userId, name: r.user.name, createdAt: r.createdAt }));
}
