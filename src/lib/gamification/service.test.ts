import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { addItem, addQuiz, enroll, makeChannel, makeCreatorWithProduct, makePost, makeUser } from "@/test/factories";
import { awardPoints, backfillPoints, evaluateBadges, getLeaderboard, getProfile } from "./service";

let ctx: Awaited<ReturnType<typeof setup>>;
async function setup() {
  const { user: creatorUser, creator, product } = await makeCreatorWithProduct();
  const learner = await makeUser("Meera Learner");
  await enroll(learner.id, product.id);
  return { creatorUser, creator, product, learner };
}
beforeEach(async () => {
  ctx = await setup();
});
const award = (kind: Parameters<typeof awardPoints>[0]["kind"], refId: string, extra: Partial<Parameters<typeof awardPoints>[0]> = {}) =>
  awardPoints({ userId: ctx.learner.id, creatorId: ctx.creator.id, kind, refId, ...extra });

describe("awardPoints", () => {
  it("awards the rule's points once; a replay is a no-op", async () => {
    expect(await award("lesson_complete", "item1")).toEqual({ awarded: true, points: 10 });
    expect(await award("lesson_complete", "item1")).toEqual({ awarded: false, points: 0 });
    expect(await db.pointEvent.count({ where: { userId: ctx.learner.id } })).toBe(1);
  });

  it("does nothing when the creator turned gamification off", async () => {
    await db.creator.update({ where: { id: ctx.creator.id }, data: { gamificationEnabled: false } });
    expect((await award("lesson_complete", "item1")).awarded).toBe(false);
    expect(await db.pointEvent.count({ where: { creatorId: ctx.creator.id } })).toBe(0);
  });

  it("the creator earns no points in their own community", async () => {
    const r = await awardPoints({ userId: ctx.creatorUser.id, creatorId: ctx.creator.id, kind: "post_created", refId: "p1" });
    expect(r.awarded).toBe(false);
    expect(await db.pointEvent.count({ where: { userId: ctx.creatorUser.id } })).toBe(0);
  });

  it("stops at the daily cap (3 awarded posts) but resumes the next IST day", async () => {
    const day1 = new Date("2026-10-15T08:00:00Z");
    for (const id of ["a", "b", "c"]) expect((await award("post_created", id, { at: day1 })).awarded).toBe(true);
    expect((await award("post_created", "d", { at: day1 })).awarded).toBe(false);
    const day2 = new Date("2026-10-15T20:00:00Z"); // after 18:30 UTC = next IST day
    expect((await award("post_created", "e", { at: day2 })).awarded).toBe(true);
  });

  it("caps are per kind, per user and per creator", async () => {
    const at = new Date("2026-10-15T08:00:00Z");
    for (const id of ["a", "b", "c"]) await award("post_created", id, { at });
    expect((await award("comment_created", "c1", { at })).awarded).toBe(true);
    const other = await makeUser();
    await enroll(other.id, ctx.product.id);
    expect((await awardPoints({ userId: other.id, creatorId: ctx.creator.id, kind: "post_created", refId: "z", at })).awarded).toBe(true);
  });

  it("stores sourceId so deleting content can remove its points", async () => {
    const ch = await makeChannel(ctx.creator.id);
    const post = await makePost(ch.id, ctx.learner.id);
    await award("post_created", post.id, { sourceId: post.id });
    expect((await db.pointEvent.findFirstOrThrow({ where: { refId: post.id } })).sourceId).toBe(post.id);
  });

  it("awards for a comment source too", async () => {
    const ch = await makeChannel(ctx.creator.id);
    const post = await makePost(ch.id, ctx.learner.id);
    const c = await db.comment.create({ data: { postId: post.id, authorId: ctx.learner.id, body: "hi" } });
    expect((await award("comment_created", c.id, { sourceId: c.id })).awarded).toBe(true);
  });

  it("does not award when the source post was deleted meanwhile (award-after-delete race)", async () => {
    const ch = await makeChannel(ctx.creator.id);
    const post = await makePost(ch.id, ctx.learner.id);
    await db.post.delete({ where: { id: post.id } });
    expect(await award("post_created", post.id, { sourceId: post.id })).toEqual({ awarded: false, points: 0 });
    expect(await db.pointEvent.count({ where: { userId: ctx.learner.id } })).toBe(0);
  });

  it("does not award when the source comment was deleted meanwhile", async () => {
    const ch = await makeChannel(ctx.creator.id);
    const post = await makePost(ch.id, ctx.learner.id);
    const c = await db.comment.create({ data: { postId: post.id, authorId: ctx.learner.id, body: "hi" } });
    await db.comment.delete({ where: { id: c.id } });
    expect((await award("comment_created", c.id, { sourceId: c.id })).awarded).toBe(false);
    expect(await db.pointEvent.count({ where: { userId: ctx.learner.id } })).toBe(0);
  });

  it("awards without a sourceId (lessons) are unaffected", async () => {
    expect((await award("lesson_complete", "noSource")).awarded).toBe(true);
  });
});

describe("evaluateBadges", () => {
  it("awards first_lesson after a completed lesson, once", async () => {
    const item = await addItem(ctx.product.id);
    await db.lessonProgress.create({ data: { userId: ctx.learner.id, itemId: item.id, productId: ctx.product.id } });
    expect(await evaluateBadges(ctx.learner.id, ctx.creator.id)).toEqual(["first_lesson"]);
    expect(await evaluateBadges(ctx.learner.id, ctx.creator.id)).toEqual([]);
    expect(await db.userBadge.count({ where: { userId: ctx.learner.id } })).toBe(1);
  });

  it("awards first_post and popular_post (10 likes from OTHER users)", async () => {
    const ch = await makeChannel(ctx.creator.id);
    const post = await makePost(ch.id, ctx.learner.id);
    expect(await evaluateBadges(ctx.learner.id, ctx.creator.id)).toEqual(["first_post"]);
    for (let i = 0; i < 9; i++) {
      const u = await makeUser();
      await db.like.create({ data: { userId: u.id, postId: post.id } });
    }
    await db.like.create({ data: { userId: ctx.learner.id, postId: post.id } }); // self-like must not count
    expect(await evaluateBadges(ctx.learner.id, ctx.creator.id)).toEqual([]);
    const tenth = await makeUser();
    await db.like.create({ data: { userId: tenth.id, postId: post.id } });
    expect(await evaluateBadges(ctx.learner.id, ctx.creator.id)).toEqual(["popular_post"]);
  });

  it("awards streak_7 after 7 consecutive IST days of lesson completions", async () => {
    for (let i = 0; i < 7; i++) {
      const item = await addItem(ctx.product.id, { position: i });
      await db.lessonProgress.create({
        data: { userId: ctx.learner.id, itemId: item.id, productId: ctx.product.id, completedAt: new Date(Date.UTC(2026, 9, 1 + i, 8)) },
      });
    }
    expect(await evaluateBadges(ctx.learner.id, ctx.creator.id)).toEqual(["first_lesson", "streak_7"]);
  });

  it("awards nothing when gamification is off", async () => {
    const item = await addItem(ctx.product.id);
    await db.lessonProgress.create({ data: { userId: ctx.learner.id, itemId: item.id, productId: ctx.product.id } });
    await db.creator.update({ where: { id: ctx.creator.id }, data: { gamificationEnabled: false } });
    expect(await evaluateBadges(ctx.learner.id, ctx.creator.id)).toEqual([]);
  });
});

describe("getProfile", () => {
  it("sums points, derives level and lists badges", async () => {
    await award("lesson_complete", "i1");
    await award("quiz_pass", "q1");
    await award("course_complete", "p1");
    const p = await getProfile(ctx.learner.id, ctx.creator.id);
    expect(p.points).toBe(135);
    expect(p.level.level).toBe(2);
    expect(p.streak).toBe(0);
    expect(p.badges).toEqual([]);
  });

  it("maps earned badges to their catalog label, description and earnedAt (unknown keys dropped)", async () => {
    const early = new Date("2026-10-01T08:00:00Z");
    const late = new Date("2026-10-05T08:00:00Z");
    await db.userBadge.create({ data: { userId: ctx.learner.id, creatorId: ctx.creator.id, badgeKey: "streak_7", earnedAt: late } });
    await db.userBadge.create({ data: { userId: ctx.learner.id, creatorId: ctx.creator.id, badgeKey: "first_post", earnedAt: early } });
    await db.userBadge.create({ data: { userId: ctx.learner.id, creatorId: ctx.creator.id, badgeKey: "retired_badge", earnedAt: early } });
    const p = await getProfile(ctx.learner.id, ctx.creator.id);
    expect(p.badges).toEqual([
      { key: "first_post", label: "First post", description: "Started a conversation in the community.", earnedAt: early },
      { key: "streak_7", label: "7-day streak", description: "Learned on 7 days in a row.", earnedAt: late },
    ]);
  });

  it("reports a live streak from lesson completions today", async () => {
    const now = new Date("2026-10-15T08:00:00Z");
    for (const [i, d] of [14, 15].entries()) {
      const item = await addItem(ctx.product.id, { position: i });
      await db.lessonProgress.create({ data: { userId: ctx.learner.id, itemId: item.id, productId: ctx.product.id, completedAt: new Date(Date.UTC(2026, 9, d, 8)) } });
    }
    expect((await getProfile(ctx.learner.id, ctx.creator.id, now)).streak).toBe(2);
  });
});

describe("getLeaderboard", () => {
  it("ranks by points, uses short names, never exposes email", async () => {
    const asha = await makeUser("Asha Rao");
    await enroll(asha.id, ctx.product.id);
    await awardPoints({ userId: asha.id, creatorId: ctx.creator.id, kind: "course_complete", refId: "p1" });
    await award("lesson_complete", "i1");
    const lb = await getLeaderboard(ctx.creator.id, "all", ctx.learner.id);
    expect(lb.top.map((r) => [r.name, r.points, r.rank])).toEqual([["Asha R.", 100, 1], ["Meera L.", 10, 2]]);
    expect(lb.me).toEqual({ rank: 2, points: 10 });
    expect(JSON.stringify(lb)).not.toContain("@");
  });

  it("never exposes user ids: rows carry isMe instead", async () => {
    const asha = await makeUser("Asha Rao");
    await enroll(asha.id, ctx.product.id);
    await awardPoints({ userId: asha.id, creatorId: ctx.creator.id, kind: "course_complete", refId: "p1" });
    await award("lesson_complete", "i1");
    const lb = await getLeaderboard(ctx.creator.id, "all", ctx.learner.id);
    expect(lb.top.map((r) => [r.name, r.isMe])).toEqual([["Asha R.", false], ["Meera L.", true]]);
    const json = JSON.stringify(lb);
    for (const id of [asha.id, ctx.learner.id]) expect(json).not.toContain(id);
    for (const row of lb.top) expect(Object.keys(row).sort()).toEqual(["isMe", "level", "name", "points", "rank"]);
    expect(Object.keys(lb.me!).sort()).toEqual(["points", "rank"]);
    expect((await getLeaderboard(ctx.creator.id, "all", null)).top.every((r) => r.isMe === false)).toBe(true);
  });

  it("the weekly board only counts events since Monday 00:00 IST", async () => {
    const now = new Date("2026-10-15T06:30:00Z"); // Thu
    await award("lesson_complete", "old", { at: new Date("2026-10-10T08:00:00Z") }); // previous week
    await award("lesson_complete", "new", { at: new Date("2026-10-13T08:00:00Z") });
    const week = await getLeaderboard(ctx.creator.id, "week", ctx.learner.id, now);
    const all = await getLeaderboard(ctx.creator.id, "all", ctx.learner.id, now);
    expect(week.top[0].points).toBe(10);
    expect(all.top[0].points).toBe(20);
  });

  it("excludes banned members and the creator, and caps the list at 20", async () => {
    // The creator is enrolled in their own product and has points: only the exclusion keeps them off the board.
    await enroll(ctx.creatorUser.id, ctx.product.id);
    await db.pointEvent.create({ data: { userId: ctx.creatorUser.id, creatorId: ctx.creator.id, kind: "course_complete", points: 100, refId: "x" } });
    const banned = await makeUser("Bad Actor");
    await enroll(banned.id, ctx.product.id);
    await awardPoints({ userId: banned.id, creatorId: ctx.creator.id, kind: "course_complete", refId: "p1" });
    await db.communityBan.create({ data: { creatorId: ctx.creator.id, userId: banned.id } });
    for (let i = 0; i < 22; i++) {
      const u = await makeUser(`User ${i}`);
      await enroll(u.id, ctx.product.id);
      await awardPoints({ userId: u.id, creatorId: ctx.creator.id, kind: "lesson_complete", refId: `x${i}` });
    }
    const lb = await getLeaderboard(ctx.creator.id, "all", null);
    expect(lb.top).toHaveLength(20);
    expect(lb.top.some((r) => r.name === "Bad A.")).toBe(false);
    expect(lb.top.some((r) => r.name === "Creator P.")).toBe(false); // makeCreatorWithProduct's account name
    expect(lb.top.every((r) => r.points === 10)).toBe(true); // nobody with 100 slipped in
    expect(lb.me).toBeNull();
    // A banned viewer has no standing on the board either.
    expect((await getLeaderboard(ctx.creator.id, "all", banned.id)).me).toBeNull();
  });

  it("excludes the creator even when the creator is enrolled and has point events", async () => {
    await enroll(ctx.creatorUser.id, ctx.product.id);
    await db.pointEvent.create({ data: { userId: ctx.creatorUser.id, creatorId: ctx.creator.id, kind: "course_complete", points: 100, refId: "x" } });
    await award("lesson_complete", "i1");
    const lb = await getLeaderboard(ctx.creator.id, "all", ctx.creatorUser.id);
    expect(lb.top.map((r) => r.name)).toEqual(["Meera L."]);
    expect(lb.top.some((r) => r.isMe)).toBe(false);
    expect(lb.me).toBeNull();
  });

  it("ties keep competition ranking for a viewer outside the top 20", async () => {
    // 22 members tied at 100 points: top shows 20 of them; the viewer (also 100) is rank 1, not 21.
    const ids: string[] = [];
    for (let i = 0; i < 21; i++) {
      const u = await makeUser(`Tie ${i}`);
      await enroll(u.id, ctx.product.id);
      await awardPoints({ userId: u.id, creatorId: ctx.creator.id, kind: "course_complete", refId: `t${i}` });
      ids.push(u.id);
    }
    await award("course_complete", "mine");
    const lb = await getLeaderboard(ctx.creator.id, "all", ctx.learner.id);
    expect(lb.top).toHaveLength(20);
    expect(lb.top.every((r) => r.rank === 1)).toBe(true);
    expect(lb.me).toEqual({ rank: 1, points: 100 });
    // Someone below the tie sits at rank 23 (22 strictly higher + 1).
    const low = await makeUser("Low Scorer");
    await enroll(low.id, ctx.product.id);
    await awardPoints({ userId: low.id, creatorId: ctx.creator.id, kind: "lesson_complete", refId: "l" });
    expect((await getLeaderboard(ctx.creator.id, "all", low.id)).me).toEqual({ rank: 23, points: 10 });
  });

  it("returns the viewer's rank even when outside the top 20", async () => {
    for (let i = 0; i < 21; i++) {
      const u = await makeUser(`Top ${i}`);
      await enroll(u.id, ctx.product.id);
      await awardPoints({ userId: u.id, creatorId: ctx.creator.id, kind: "course_complete", refId: `t${i}` });
    }
    await award("lesson_complete", "mine");
    const lb = await getLeaderboard(ctx.creator.id, "all", ctx.learner.id);
    expect(lb.top).toHaveLength(20);
    expect(lb.me).toEqual({ rank: 22, points: 10 });
  });

  it("a refunded member (no enrolment left) leaves the board", async () => {
    await award("lesson_complete", "i1");
    await db.enrollment.deleteMany({ where: { userId: ctx.learner.id } });
    expect((await getLeaderboard(ctx.creator.id, "all", null)).top).toEqual([]);
  });
});

describe("backfillPoints", () => {
  it("replays lessons, passed quizzes and finished courses idempotently", async () => {
    const a = await addItem(ctx.product.id, { position: 0 });
    const { item: qItem, quiz } = await addQuiz(ctx.product.id, { position: 1 });
    await db.lessonProgress.create({ data: { userId: ctx.learner.id, itemId: a.id, productId: ctx.product.id } });
    await db.lessonProgress.create({ data: { userId: ctx.learner.id, itemId: qItem.id, productId: ctx.product.id } });
    const first = await backfillPoints(ctx.creator.id);
    expect(first.awarded).toBe(3); // lesson + quiz_pass + course_complete
    const profile = await getProfile(ctx.learner.id, ctx.creator.id);
    expect(profile.points).toBe(10 + 25 + 100);
    expect(await db.pointEvent.findFirst({ where: { kind: "quiz_pass", refId: quiz.id } })).toBeTruthy();
    const badges = await db.userBadge.findMany({ where: { userId: ctx.learner.id }, select: { badgeKey: true } });
    expect(badges.map((b) => b.badgeKey).sort()).toEqual(["course_complete", "first_lesson"]);
    expect((await backfillPoints(ctx.creator.id)).awarded).toBe(0);
  });

  it("also lights badges for post authors who have no lessons (first_post, popular_post)", async () => {
    const ch = await makeChannel(ctx.creator.id);
    const poster = await makeUser("Post Only");
    await enroll(poster.id, ctx.product.id);
    const post = await makePost(ch.id, poster.id);
    for (let i = 0; i < 10; i++) {
      const u = await makeUser();
      await db.like.create({ data: { userId: u.id, postId: post.id } });
    }
    expect(await db.userBadge.count({ where: { userId: poster.id } })).toBe(0);
    await backfillPoints(ctx.creator.id);
    const keys = (await db.userBadge.findMany({ where: { userId: poster.id }, select: { badgeKey: true } })).map((b) => b.badgeKey).sort();
    expect(keys).toEqual(["first_post", "popular_post"]);
  });

  it("does nothing for a creator with gamification off", async () => {
    const ch = await makeChannel(ctx.creator.id);
    await makePost(ch.id, ctx.learner.id);
    await db.creator.update({ where: { id: ctx.creator.id }, data: { gamificationEnabled: false } });
    await backfillPoints(ctx.creator.id);
    expect(await db.userBadge.count({ where: { creatorId: ctx.creator.id } })).toBe(0);
  });
});
