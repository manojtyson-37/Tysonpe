import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, isPostgres } from "@/lib/db";
import { enroll, makeChannel, makeCreatorWithProduct, makeUser } from "@/test/factories";
import {
  addComment, banMember, createPost, deleteComment, deletePost, editComment, editPost, getThread, listBans, listPosts,
  setPinned, toggleLike, unbanMember,
} from "./posts";
import { LIMITS } from "./validation";

let failAward = false;
vi.mock("../gamification/service", async (orig) => {
  const mod = await orig<typeof import("../gamification/service")>();
  return {
    ...mod,
    awardPoints: (...a: Parameters<typeof mod.awardPoints>) => {
      if (failAward) throw new Error("boom");
      return mod.awardPoints(...a);
    },
  };
});

let ctx: Awaited<ReturnType<typeof setup>>;
async function setup() {
  const { user: creatorUser, creator, product } = await makeCreatorWithProduct();
  const member = await makeUser("Meera Learner");
  const member2 = await makeUser("Ravi Kumar");
  const stranger = await makeUser("Stranger Danger");
  await enroll(member.id, product.id);
  await enroll(member2.id, product.id);
  const channel = await makeChannel(creator.id, { slug: "general" });
  return { creatorUser, creator, product, member, member2, stranger, channel };
}
beforeEach(async () => {
  failAward = false;
  ctx = await setup();
});
const feed = (userId: string | null, cursor?: string) =>
  listPosts({ creatorId: ctx.creator.id, channelId: ctx.channel.id, userId, cursor });
const points = (userId: string) => db.pointEvent.aggregate({ where: { userId }, _sum: { points: true } }).then((r) => r._sum.points ?? 0);

describe("access (server-side, every operation)", () => {
  it("a stranger cannot read, post, comment or like in an open channel", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "hello" });
    await expect(feed(ctx.stranger.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(feed(null)).rejects.toMatchObject({ code: "not_found" });
    await expect(createPost(ctx.stranger.id, ctx.channel.id, { body: "x" })).rejects.toMatchObject({ code: "not_found" });
    await expect(getThread(ctx.stranger.id, id)).rejects.toMatchObject({ code: "not_found" });
    await expect(addComment(ctx.stranger.id, id, { body: "x" })).rejects.toMatchObject({ code: "not_found" });
    await expect(toggleLike(ctx.stranger.id, { postId: id })).rejects.toMatchObject({ code: "not_found" });
  });

  it("a stranger cannot edit, pin, delete, or like a comment (not_found, not forbidden)", async () => {
    const { id } = await createPost(ctx.creatorUser.id, ctx.channel.id, { body: "hello" });
    const c = await addComment(ctx.member.id, id, { body: "c" });
    await expect(editPost(ctx.stranger.id, id, { body: "hack" })).rejects.toMatchObject({ code: "not_found" });
    await expect(setPinned(ctx.stranger.id, id, true)).rejects.toMatchObject({ code: "not_found" });
    await expect(deletePost(ctx.stranger.id, id)).rejects.toMatchObject({ code: "not_found" });
    await expect(deleteComment(ctx.stranger.id, c.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(editComment(ctx.stranger.id, c.id, { body: "hack" })).rejects.toMatchObject({ code: "not_found" });
    await expect(editComment(ctx.stranger.id, "no-such-comment", { body: "hack" })).rejects.toMatchObject({ code: "not_found" });
    expect((await db.comment.findUniqueOrThrow({ where: { id: c.id } })).body).toBe("c");
    await expect(toggleLike(ctx.stranger.id, { commentId: c.id })).rejects.toMatchObject({ code: "not_found" });
    expect(await db.like.count({ where: { OR: [{ userId: ctx.stranger.id }, { commentId: c.id }, { postId: id }] } })).toBe(0);
  });

  it("an anonymous visitor cannot read a thread", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "hello" });
    await expect(getThread(null, id)).rejects.toMatchObject({ code: "not_found" });
  });

  it.each(["refunded", "banned"] as const)("a %s author loses every operation on their own content", async (how) => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "mine" });
    const c = await addComment(ctx.member.id, id, { body: "my comment" });
    if (how === "refunded") await db.enrollment.deleteMany({ where: { userId: ctx.member.id } });
    else await banMember(ctx.creatorUser.id, ctx.creator.id, ctx.member.id);
    await expect(deleteComment(ctx.member.id, c.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(editComment(ctx.member.id, c.id, { body: "edit" })).rejects.toMatchObject({ code: "not_found" });
    await expect(editPost(ctx.member.id, id, { body: "edit" })).rejects.toMatchObject({ code: "not_found" });
    await expect(deletePost(ctx.member.id, id)).rejects.toMatchObject({ code: "not_found" });
    await expect(setPinned(ctx.member.id, id, true)).rejects.toMatchObject({ code: "not_found" });
    await expect(addComment(ctx.member.id, id, { body: "again" })).rejects.toMatchObject({ code: "not_found" });
    await expect(toggleLike(ctx.member.id, { commentId: c.id })).rejects.toMatchObject({ code: "not_found" });
    await expect(getThread(ctx.member.id, id)).rejects.toMatchObject({ code: "not_found" });
    expect(await db.comment.count({ where: { id: c.id } })).toBe(1);
    expect((await db.comment.findUniqueOrThrow({ where: { id: c.id } })).body).toBe("my comment");
  });

  it("a gated channel is invisible to members of other products", async () => {
    const vip = await makeChannel(ctx.creator.id, { slug: "vip", access: "product_gated" });
    await db.channelProduct.create({ data: { channelId: vip.id, productId: ctx.product.id } });
    const other = await db.product.create({ data: { creatorId: ctx.creator.id, slug: "other", type: "course", title: "Other", pricePaise: 0, status: "published" } });
    const outsider = await makeUser();
    await enroll(outsider.id, other.id);
    await expect(createPost(outsider.id, vip.id, { body: "x" })).rejects.toMatchObject({ code: "not_found" });
    await expect(listPosts({ creatorId: ctx.creator.id, channelId: vip.id, userId: outsider.id })).rejects.toMatchObject({ code: "not_found" });
    await expect(createPost(ctx.member.id, vip.id, { body: "x" })).resolves.toBeTruthy();
  });

  it("a refund (enrolment deleted) removes access to existing posts too", async () => {
    const e = await db.enrollment.findFirstOrThrow({ where: { userId: ctx.member.id } });
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "mine" });
    await db.enrollment.delete({ where: { id: e.id } });
    await expect(getThread(ctx.member.id, id)).rejects.toMatchObject({ code: "not_found" });
    await expect(deletePost(ctx.member.id, id)).rejects.toMatchObject({ code: "not_found" });
  });

  it("a banned member loses read and write access; unban restores it", async () => {
    await banMember(ctx.creatorUser.id, ctx.creator.id, ctx.member.id);
    await expect(feed(ctx.member.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(createPost(ctx.member.id, ctx.channel.id, { body: "x" })).rejects.toMatchObject({ code: "not_found" });
    await unbanMember(ctx.creator.id, ctx.member.id);
    await expect(feed(ctx.member.id)).resolves.toBeTruthy();
  });

  it("only announcement-channel creators post; members cannot (forbidden) but may comment", async () => {
    const ann = await makeChannel(ctx.creator.id, { slug: "news", kind: "announcement" });
    await expect(createPost(ctx.member.id, ann.id, { body: "x" })).rejects.toMatchObject({ code: "forbidden" });
    const { id } = await createPost(ctx.creatorUser.id, ann.id, { body: "Big news" });
    await expect(addComment(ctx.member.id, id, { body: "congrats" })).resolves.toBeTruthy();
  });
});

describe("posts", () => {
  it("creates plain-text posts, trims input, and rejects empty/oversized bodies", async () => {
    await expect(createPost(ctx.member.id, ctx.channel.id, { body: "   " })).rejects.toMatchObject({ code: "invalid" });
    await expect(createPost(ctx.member.id, ctx.channel.id, { body: "x".repeat(2001) })).rejects.toMatchObject({ code: "invalid" });
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { title: " T ", body: "  <b>hi</b>  " });
    const row = await db.post.findUniqueOrThrow({ where: { id } });
    expect([row.title, row.body]).toEqual(["T", "<b>hi</b>"]);
  });

  it("feed returns newest first with counts, author names, never emails", async () => {
    const a = await createPost(ctx.member.id, ctx.channel.id, { body: "first" });
    await new Promise((r) => setTimeout(r, 5));
    const b = await createPost(ctx.member2.id, ctx.channel.id, { body: "second" });
    await addComment(ctx.member2.id, a.id, { body: "c" });
    await toggleLike(ctx.member2.id, { postId: a.id });
    const { posts } = await feed(ctx.member.id);
    expect(posts.map((p) => p.id)).toEqual([b.id, a.id]);
    const first = posts.find((p) => p.id === a.id)!;
    expect([first.commentCount, first.likeCount, first.likedByMe, first.author.name]).toEqual([1, 1, false, "Meera Learner"]);
    expect(JSON.stringify(posts)).not.toContain("@t.test");
  });

  it("pinned posts come first and appear only on page one; pagination is stable", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 25; i++) {
      ids.push((await createPost(ctx.creatorUser.id, ctx.channel.id, { body: `p${i}` })).id);
    }
    await setPinned(ctx.creatorUser.id, ids[0], true);
    const page1 = await feed(ctx.member.id);
    expect(page1.posts[0].id).toBe(ids[0]);
    expect(page1.posts).toHaveLength(21); // 1 pinned + 20
    expect(page1.nextCursor).not.toBeNull();
    const page2 = await feed(ctx.member.id, page1.nextCursor!);
    expect(page2.posts).toHaveLength(4);
    expect(page2.nextCursor).toBeNull();
    const seen = new Set([...page1.posts, ...page2.posts].map((p) => p.id));
    expect(seen.size).toBe(25);
  });

  it("the creator's posts show the store name, never the account name or email", async () => {
    await createPost(ctx.creatorUser.id, ctx.channel.id, { body: "from the creator" });
    const { posts } = await feed(ctx.member.id);
    expect(posts[0].author).toEqual({ id: ctx.creatorUser.id, name: "Creator Co", isCreator: true });
  });

  it("an out-of-channel cursor is ignored", async () => {
    const other = await makeChannel(ctx.creator.id, { slug: "other" });
    const foreign = await createPost(ctx.creatorUser.id, other.id, { body: "elsewhere" });
    await createPost(ctx.member.id, ctx.channel.id, { body: "here" });
    const normal = await feed(ctx.member.id);
    const probed = await feed(ctx.member.id, foreign.id);
    expect(probed.posts.map((p) => p.id)).toEqual(normal.posts.map((p) => p.id));
  });

  it("only the author edits; edit sets editedAt", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "v1" });
    await expect(editPost(ctx.member2.id, id, { body: "hack" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(editPost(ctx.creatorUser.id, id, { body: "hack" })).rejects.toMatchObject({ code: "forbidden" });
    await editPost(ctx.member.id, id, { body: "v2" });
    const row = await db.post.findUniqueOrThrow({ where: { id } });
    expect(row.body).toBe("v2");
    expect(row.editedAt).not.toBeNull();
  });

  it("author or creator may delete; another member may not", async () => {
    const a = await createPost(ctx.member.id, ctx.channel.id, { body: "x" });
    await expect(deletePost(ctx.member2.id, a.id)).rejects.toMatchObject({ code: "forbidden" });
    await deletePost(ctx.member.id, a.id);
    const b = await createPost(ctx.member.id, ctx.channel.id, { body: "y" });
    await deletePost(ctx.creatorUser.id, b.id);
    expect(await db.post.count({ where: { channelId: ctx.channel.id } })).toBe(0);
  });

  it("pin is creator-only and capped at 3 per channel", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) ids.push((await createPost(ctx.creatorUser.id, ctx.channel.id, { body: `p${i}` })).id);
    await expect(setPinned(ctx.member.id, ids[0], true)).rejects.toMatchObject({ code: "forbidden" });
    for (const id of ids.slice(0, 3)) await setPinned(ctx.creatorUser.id, id, true);
    await expect(setPinned(ctx.creatorUser.id, ids[3], true)).rejects.toMatchObject({ code: "limit" });
    await setPinned(ctx.creatorUser.id, ids[0], false);
    await expect(setPinned(ctx.creatorUser.id, ids[3], true)).resolves.toBeUndefined();
  });

  // Postgres-only: SQLite serialises writers, so the pin-count race cannot occur there.
  it.runIf(isPostgres)("concurrent pins never exceed the per-channel cap", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 8; i++) ids.push((await createPost(ctx.creatorUser.id, ctx.channel.id, { body: `c${i}` })).id);
    await Promise.allSettled(ids.map((id) => setPinned(ctx.creatorUser.id, id, true)));
    expect(await db.post.count({ where: { channelId: ctx.channel.id, pinned: true } })).toBe(LIMITS.maxPinned);
  });
});

describe("comments", () => {
  it("adds, lists oldest-first, and rejects empty bodies", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "q" });
    await expect(addComment(ctx.member2.id, id, { body: " " })).rejects.toMatchObject({ code: "invalid" });
    await addComment(ctx.member2.id, id, { body: "first" });
    await new Promise((r) => setTimeout(r, 5));
    await addComment(ctx.member.id, id, { body: "second" });
    const t = await getThread(ctx.member.id, id);
    expect(t.comments.map((c) => c.body)).toEqual(["first", "second"]);
    expect(t.comments[1].canDelete).toBe(true);
    expect(t.comments[0].canDelete).toBe(false);
  });

  it("author or creator deletes a comment; others cannot", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "q" });
    const c = await addComment(ctx.member2.id, id, { body: "x" });
    await expect(deleteComment(ctx.member.id, c.id)).rejects.toMatchObject({ code: "forbidden" });
    await deleteComment(ctx.creatorUser.id, c.id);
    expect(await db.comment.count({ where: { postId: id } })).toBe(0);
  });
});

describe("thread comment pagination", () => {
  async function seedComments(postId: string, n: number, authorId = ctx.member2.id) {
    const base = Date.now() - n * 1000;
    // Identical timestamps in pairs exercise the (createdAt, id) tiebreak.
    await db.comment.createMany({
      data: Array.from({ length: n }, (_, i) => ({ id: `c${postId.slice(-6)}${String(i).padStart(3, "0")}`, postId, authorId, body: `c${i}`, createdAt: new Date(base + Math.floor(i / 2) * 1000) })),
    });
  }

  it("small threads are unchanged: all comments, no cursor", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "q" });
    await seedComments(id, 3);
    const t = await getThread(ctx.member.id, id);
    expect(t.comments.map((c) => c.body)).toEqual(["c0", "c1", "c2"]);
    expect(t.nextCommentCursor).toBeNull();
  });

  it("returns the first 50 oldest-first plus a cursor, then the rest on the next call", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "q" });
    await seedComments(id, 55);
    const first = await getThread(ctx.member.id, id);
    expect(first.comments).toHaveLength(50);
    expect(first.comments[0].body).toBe("c0");
    expect(first.comments[49].body).toBe("c49");
    expect(first.nextCommentCursor).toBe(first.comments[49].id);
    const second = await getThread(ctx.member.id, id, { after: first.nextCommentCursor! });
    expect(second.comments.map((c) => c.body)).toEqual(["c50", "c51", "c52", "c53", "c54"]);
    expect(second.nextCommentCursor).toBeNull();
    expect(new Set([...first.comments, ...second.comments].map((c) => c.id)).size).toBe(55);
  });

  it("exactly 50 comments has no next page", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "q" });
    await seedComments(id, 50);
    const t = await getThread(ctx.member.id, id);
    expect(t.comments).toHaveLength(50);
    expect(t.nextCommentCursor).toBeNull();
  });

  it("a cursor belonging to another post (or nothing) is ignored", async () => {
    const a = await createPost(ctx.member.id, ctx.channel.id, { body: "a" });
    const b = await createPost(ctx.member.id, ctx.channel.id, { body: "b" });
    await seedComments(a.id, 3);
    await seedComments(b.id, 60);
    const foreign = (await db.comment.findFirstOrThrow({ where: { postId: b.id }, orderBy: { id: "desc" } })).id;
    const t = await getThread(ctx.member.id, a.id, { after: foreign });
    expect(t.comments.map((c) => c.body)).toEqual(["c0", "c1", "c2"]);
    const u = await getThread(ctx.member.id, b.id, { after: "nope" });
    expect(u.comments[0].body).toBe("c0");
    expect(u.nextCommentCursor).not.toBeNull();
  });

  it("like counts and likedByMe are correct on a later page", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "q" });
    await seedComments(id, 52);
    const late = await db.comment.findFirstOrThrow({ where: { postId: id, body: "c51" } });
    await toggleLike(ctx.member.id, { commentId: late.id });
    const first = await getThread(ctx.member.id, id);
    const page2 = await getThread(ctx.member.id, id, { after: first.nextCommentCursor! });
    const view = page2.comments.find((c) => c.id === late.id)!;
    expect(view.likeCount).toBe(1);
    expect(view.likedByMe).toBe(true);
  });
});

describe("editing comments", () => {
  it("only the author edits; edit sets editedAt and the thread exposes it", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "q" });
    const c = await addComment(ctx.member2.id, id, { body: "v1" });
    expect((await getThread(ctx.member.id, id)).comments[0].editedAt).toBeNull();
    await editComment(ctx.member2.id, c.id, { body: "  v2  " });
    const row = await db.comment.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.body).toBe("v2");
    expect(row.editedAt).not.toBeNull();
    const view = (await getThread(ctx.member.id, id)).comments[0];
    expect(view.body).toBe("v2");
    expect(view.editedAt).toBeInstanceOf(Date);
  });

  it("another member or even the creator cannot edit someone else's comment (forbidden)", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "q" });
    const c = await addComment(ctx.member2.id, id, { body: "mine" });
    await expect(editComment(ctx.member.id, c.id, { body: "hack" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(editComment(ctx.creatorUser.id, c.id, { body: "hack" })).rejects.toMatchObject({ code: "forbidden" });
    const row = await db.comment.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.body).toBe("mine");
    expect(row.editedAt).toBeNull();
  });

  it("validates with the comment schema and leaves the comment untouched on failure", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "q" });
    const c = await addComment(ctx.member2.id, id, { body: "keep" });
    await expect(editComment(ctx.member2.id, c.id, { body: "   " })).rejects.toMatchObject({ code: "invalid" });
    await expect(editComment(ctx.member2.id, c.id, { body: "\u200B\uFEFF" })).rejects.toMatchObject({ code: "invalid" });
    await expect(editComment(ctx.member2.id, c.id, { body: "x".repeat(LIMITS.commentBody + 1) })).rejects.toMatchObject({ code: "invalid" });
    const row = await db.comment.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.body).toBe("keep");
    expect(row.editedAt).toBeNull();
  });
});

describe("likes", () => {
  it("toggles on and off; counts reflect it", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "x" });
    expect(await toggleLike(ctx.member2.id, { postId: id })).toEqual({ liked: true, likeCount: 1 });
    expect(await toggleLike(ctx.member2.id, { postId: id })).toEqual({ liked: false, likeCount: 0 });
  });
  it("two simultaneous toggles never throw (double-click)", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "x" });
    await expect(Promise.all([toggleLike(ctx.member2.id, { postId: id }), toggleLike(ctx.member2.id, { postId: id })])).resolves.toHaveLength(2);
    expect([0, 1]).toContain(await db.like.count({ where: { postId: id } }));
  });
  it("likes a comment too", async () => {
    const p = await createPost(ctx.member.id, ctx.channel.id, { body: "x" });
    const c = await addComment(ctx.member.id, p.id, { body: "c" });
    expect(await toggleLike(ctx.member2.id, { commentId: c.id })).toEqual({ liked: true, likeCount: 1 });
  });
});

describe("points from community actions", () => {
  it("post +5, comment +2, like received +1 (to the author); self-like earns nothing", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "x" });
    expect(await points(ctx.member.id)).toBe(5);
    await addComment(ctx.member2.id, id, { body: "hi" });
    expect(await points(ctx.member2.id)).toBe(2);
    await toggleLike(ctx.member2.id, { postId: id });
    expect(await points(ctx.member.id)).toBe(6);
    await toggleLike(ctx.member.id, { postId: id }); // self-like
    expect(await points(ctx.member.id)).toBe(6);
  });

  it("unlike then re-like does not award again", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "x" });
    await toggleLike(ctx.member2.id, { postId: id });
    await toggleLike(ctx.member2.id, { postId: id });
    await toggleLike(ctx.member2.id, { postId: id });
    expect(await points(ctx.member.id)).toBe(6);
  });

  it("deleting a post removes the points it and its comments and likes earned", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "x" });
    await addComment(ctx.member2.id, id, { body: "hi" });
    await toggleLike(ctx.member2.id, { postId: id });
    await deletePost(ctx.member.id, id);
    expect(await points(ctx.member.id)).toBe(0);
    expect(await points(ctx.member2.id)).toBe(0);
  });

  it("deleting a comment removes its points", async () => {
    const { id } = await createPost(ctx.member.id, ctx.channel.id, { body: "x" });
    const c = await addComment(ctx.member2.id, id, { body: "hi" });
    await deleteComment(ctx.member2.id, c.id);
    expect(await points(ctx.member2.id)).toBe(0);
  });

  it("a failing award never breaks the community action (rows still written, no points)", async () => {
    failAward = true;
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const p = await createPost(ctx.member.id, ctx.channel.id, { body: "x" });
      const c = await addComment(ctx.member2.id, p.id, { body: "hi" });
      await expect(toggleLike(ctx.member2.id, { postId: p.id })).resolves.toEqual({ liked: true, likeCount: 1 });
      expect(await db.post.count({ where: { id: p.id } })).toBe(1);
      expect(await db.comment.count({ where: { id: c.id } })).toBe(1);
      expect(await db.like.count({ where: { postId: p.id } })).toBe(1);
      expect(err).toHaveBeenCalledTimes(3); // awardSafely's catch swallowed each failure
      expect(await points(ctx.member.id)).toBe(0);
    } finally {
      err.mockRestore();
    }
  });

  it("posting still works when gamification is off (and earns nothing)", async () => {
    await db.creator.update({ where: { id: ctx.creator.id }, data: { gamificationEnabled: false } });
    await expect(createPost(ctx.member.id, ctx.channel.id, { body: "x" })).resolves.toBeTruthy();
    expect(await points(ctx.member.id)).toBe(0);
  });
});

describe("bans", () => {
  it("only the creator can ban, never themselves; banning twice is harmless", async () => {
    await expect(banMember(ctx.member.id, ctx.creator.id, ctx.member2.id)).rejects.toMatchObject({ code: "forbidden" });
    await expect(banMember(ctx.creatorUser.id, ctx.creator.id, ctx.creatorUser.id)).rejects.toMatchObject({ code: "invalid" });
    await banMember(ctx.creatorUser.id, ctx.creator.id, ctx.member.id);
    await banMember(ctx.creatorUser.id, ctx.creator.id, ctx.member.id); // idempotent
    expect((await listBans(ctx.creator.id)).map((b) => b.name)).toEqual(["Meera Learner"]);
  });
});
