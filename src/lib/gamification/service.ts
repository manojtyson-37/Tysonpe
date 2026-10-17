import { db, lockKey } from "../db";
import { isUniqueViolation } from "../errors";
import { computeProgress } from "../learning/progress";
import { BADGES, badgesToAward } from "./badges";
import { levelFor } from "./levels";
import { rankRows, shortName } from "./ranking";
import { POINT_RULES, type PointKind } from "./rules";
import { currentStreak, longestStreak } from "./streak";
import { istDayKey, istDayStart, istWeekStart } from "./time";

export type AwardInput = { userId: string; creatorId: string; kind: PointKind; refId: string; sourceId?: string; at?: Date };

/**
 * Idempotent: the unique key (user, creator, kind, refId) makes a replay a no-op. Returns awarded:false when
 * gamification is off, the user owns the community, the daily cap is reached, or the event already exists.
 */
type CreatorGate = { gamificationEnabled: boolean; userId: string } | null;

async function awardGated(creator: CreatorGate, a: AwardInput): Promise<{ awarded: boolean; points: number }> {
  const none = { awarded: false, points: 0 };
  if (!creator || !creator.gamificationEnabled || creator.userId === a.userId) return none;

  const rule = POINT_RULES[a.kind];
  const at = a.at ?? new Date();
  try {
    return await db.$transaction(async (tx) => {
      if (a.sourceId) {
        // The post/comment this award came from may have been deleted since the caller created it (its cleanup
        // already ran): don't leave an orphaned PointEvent.
        const [posts, comments] = await Promise.all([
          tx.post.count({ where: { id: a.sourceId } }),
          tx.comment.count({ where: { id: a.sourceId } }),
        ]);
        if (posts + comments === 0) return none;
      }
      if (rule.dailyCap !== undefined) {
        // Serialise concurrent awards of one kind to one user so the cap can't be overshot (no-op on SQLite).
        await lockKey(tx, `pts:${a.userId}:${a.creatorId}:${a.kind}`);
        const dayStart = istDayStart(istDayKey(at));
        const today = await tx.pointEvent.count({
          where: { userId: a.userId, creatorId: a.creatorId, kind: a.kind, createdAt: { gte: dayStart, lt: new Date(dayStart.getTime() + 86_400_000) } },
        });
        if (today >= rule.dailyCap) return none;
      }
      await tx.pointEvent.create({
        data: { userId: a.userId, creatorId: a.creatorId, kind: a.kind, points: rule.points, refId: a.refId, sourceId: a.sourceId ?? null, createdAt: at },
      });
      return { awarded: true, points: rule.points };
    });
  } catch (e) {
    if (isUniqueViolation(e)) return none; // replay or a concurrent identical award
    throw e;
  }
}

export async function awardPoints(a: AwardInput): Promise<{ awarded: boolean; points: number }> {
  const creator = await db.creator.findUnique({ where: { id: a.creatorId }, select: { gamificationEnabled: true, userId: true } });
  return awardGated(creator, a);
}

async function activityDays(userId: string, creatorId: string): Promise<string[]> {
  const rows = await db.lessonProgress.findMany({ where: { userId, product: { creatorId } }, select: { completedAt: true } });
  return rows.map((r) => istDayKey(r.completedAt));
}

/** Award any badges whose conditions are now met. Returns the newly earned keys, in catalog order. */
export async function evaluateBadges(userId: string, creatorId: string): Promise<string[]> {
  const creator = await db.creator.findUnique({ where: { id: creatorId }, select: { gamificationEnabled: true, userId: true } });
  if (!creator || !creator.gamificationEnabled || creator.userId === userId) return [];

  const [lessonsCompleted, coursesCompleted, postsCreated, days, likeGroups, earnedRows] = await Promise.all([
    db.lessonProgress.count({ where: { userId, product: { creatorId } } }),
    db.pointEvent.count({ where: { userId, creatorId, kind: "course_complete" } }),
    db.post.count({ where: { authorId: userId, channel: { creatorId } } }),
    activityDays(userId, creatorId),
    db.like.groupBy({
      by: ["postId"],
      where: { postId: { not: null }, userId: { not: userId }, post: { authorId: userId, channel: { creatorId } } },
      _count: { _all: true },
    }),
    db.userBadge.findMany({ where: { userId, creatorId }, select: { badgeKey: true } }),
  ]);
  const maxLikesOnOnePost = likeGroups.reduce((m, g) => Math.max(m, g._count._all), 0);
  const fresh = badgesToAward(
    { lessonsCompleted, coursesCompleted, postsCreated, longestStreak: longestStreak(days), maxLikesOnOnePost },
    new Set(earnedRows.map((b) => b.badgeKey)),
  );
  for (const badgeKey of fresh) {
    await db.userBadge.upsert({
      where: { userId_creatorId_badgeKey: { userId, creatorId, badgeKey } },
      create: { userId, creatorId, badgeKey },
      update: {},
    });
  }
  return fresh;
}

export async function getProfile(userId: string, creatorId: string, now = new Date()) {
  const [sum, days, badgeRows] = await Promise.all([
    db.pointEvent.aggregate({ where: { userId, creatorId }, _sum: { points: true } }),
    activityDays(userId, creatorId),
    db.userBadge.findMany({ where: { userId, creatorId }, orderBy: { earnedAt: "asc" } }),
  ]);
  const points = sum._sum.points ?? 0;
  const catalog = new Map(BADGES.map((b) => [b.key as string, b]));
  return {
    points,
    level: levelFor(points),
    streak: currentStreak(days, istDayKey(now)),
    badges: badgeRows.flatMap((b) => {
      const def = catalog.get(b.badgeKey);
      return def ? [{ key: def.key, label: def.label, description: def.description, earnedAt: b.earnedAt }] : [];
    }),
  };
}

const LEADERBOARD_SIZE = 20;

/**
 * Top 20 by points (week or all-time) plus the viewer's rank. Ranking is done in the database. Rows never carry user
 * ids: `isMe` marks the viewer's own row. Ties share a rank (1, 2, 2, 4).
 */
export async function getLeaderboard(creatorId: string, period: "week" | "all", viewerId: string | null, now = new Date()) {
  const creator = await db.creator.findUniqueOrThrow({ where: { id: creatorId }, select: { userId: true } });
  const where = {
    creatorId,
    userId: { not: creator.userId },
    user: {
      enrollments: { some: { product: { creatorId } } }, // a refunded member (no enrolment left) leaves the board
      bans: { none: { creatorId } },
    },
    ...(period === "week" ? { createdAt: { gte: istWeekStart(now) } } : {}),
  };
  const groups = await db.pointEvent.groupBy({
    by: ["userId"],
    where,
    _sum: { points: true },
    having: { points: { _sum: { gt: 0 } } },
    orderBy: [{ _sum: { points: "desc" } }, { userId: "asc" }],
    take: LEADERBOARD_SIZE,
  });
  const ids = groups.map((g) => g.userId);
  const [users, totals] = await Promise.all([
    db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    // Levels use all-time points regardless of the board's period.
    db.pointEvent.groupBy({ by: ["userId"], where: { creatorId, userId: { in: ids } }, _sum: { points: true } }),
  ]);
  const nameOf = new Map(users.map((u) => [u.id, u.name]));
  const totalOf = new Map(totals.map((t) => [t.userId, t._sum.points ?? 0]));
  const ranked = rankRows(groups.map((g) => ({ userId: g.userId, name: nameOf.get(g.userId) ?? "", points: g._sum.points ?? 0 })));
  const top = ranked.map((r) => ({
    rank: r.rank, name: shortName(r.name), points: r.points, level: levelFor(totalOf.get(r.userId) ?? r.points).level, isMe: r.userId === viewerId,
  }));

  let me: { rank: number; points: number } | null = null;
  const inTop = ranked.find((r) => r.userId === viewerId);
  if (inTop) me = { rank: inTop.rank, points: inTop.points };
  else if (viewerId) {
    // Same filters as the board (so a banned/refunded viewer has no standing), then count earners strictly above.
    const mine = (await db.pointEvent.aggregate({ where: { AND: [where, { userId: viewerId }] }, _sum: { points: true } }))._sum.points ?? 0;
    if (mine > 0) {
      const higher = await db.pointEvent.groupBy({ by: ["userId"], where, having: { points: { _sum: { gt: mine } } } });
      me = { rank: higher.length + 1, points: mine };
    }
  }
  return { top, me };
}

/** Replay existing progress through the idempotent award path (turning gamification on later, or a missed award). */
export async function backfillPoints(creatorId: string): Promise<{ awarded: number }> {
  const creator = await db.creator.findUnique({ where: { id: creatorId }, select: { gamificationEnabled: true, userId: true } });
  if (!creator?.gamificationEnabled) return { awarded: 0 };
  let awarded = 0;
  const people = new Set<string>();
  const rows = await db.lessonProgress.findMany({
    where: { product: { creatorId } },
    include: { item: { select: { id: true, kind: true, quiz: { select: { id: true } } } } },
  });
  for (const r of rows) {
    const quiz = r.item.kind === "quiz" && r.item.quiz;
    people.add(r.userId);
    const res = await awardGated(creator, {
      userId: r.userId, creatorId, kind: quiz ? "quiz_pass" : "lesson_complete", refId: quiz ? quiz.id : r.item.id, at: r.completedAt,
    });
    if (res.awarded) awarded++;
  }
  const enrollments = await db.enrollment.findMany({
    where: { product: { creatorId } },
    select: { userId: true, productId: true, product: { select: { items: { select: { id: true, requiredForCompletion: true } } } } },
  });
  for (const e of enrollments) {
    const done = await db.lessonProgress.findMany({ where: { userId: e.userId, productId: e.productId }, select: { itemId: true, completedAt: true } });
    const progress = computeProgress(e.product.items.map((i) => ({ id: i.id, required: i.requiredForCompletion })), new Set(done.map((d) => d.itemId)));
    if (!progress.complete) continue;
    people.add(e.userId);
    const at = done.reduce((m, d) => (d.completedAt > m ? d.completedAt : m), done[0].completedAt);
    if ((await awardGated(creator, { userId: e.userId, creatorId, kind: "course_complete", refId: e.productId, at })).awarded) awarded++;
  }
  // Post authors too: first_post / popular_post need no lessons, and likes on their posts count toward popular_post.
  const authors = await db.post.findMany({ where: { channel: { creatorId } }, distinct: ["authorId"], select: { authorId: true } });
  for (const a of authors) people.add(a.authorId);
  // Badges too, so "Turn on" / "Recalculate" don't leave earned badges unlit until the learner's next action.
  for (const userId of people) await evaluateBadges(userId, creatorId);
  return { awarded };
}
