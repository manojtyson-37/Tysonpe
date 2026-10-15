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

export async function getLeaderboard(creatorId: string, period: "week" | "all", viewerId: string | null, now = new Date()) {
  const creator = await db.creator.findUniqueOrThrow({ where: { id: creatorId }, select: { userId: true } });
  const banned = await db.communityBan.findMany({ where: { creatorId }, select: { userId: true } });
  const excluded = [creator.userId, ...banned.map((b) => b.userId)];
  const groups = await db.pointEvent.groupBy({
    by: ["userId"],
    where: {
      creatorId,
      userId: { notIn: excluded },
      user: { enrollments: { some: { product: { creatorId } } } }, // a refunded member (no enrolment left) leaves the board
      ...(period === "week" ? { createdAt: { gte: istWeekStart(now) } } : {}),
    },
    _sum: { points: true },
  });
  const earners = groups.filter((g) => (g._sum.points ?? 0) > 0);
  const users = await db.user.findMany({ where: { id: { in: earners.map((g) => g.userId) } }, select: { id: true, name: true } });
  const nameOf = new Map(users.map((u) => [u.id, u.name]));
  const ranked = rankRows(earners.map((g) => ({ userId: g.userId, name: nameOf.get(g.userId) ?? "", points: g._sum.points ?? 0 })));

  // Levels use all-time points regardless of the board's period.
  const top = ranked.slice(0, 20);
  const totals = await db.pointEvent.groupBy({ by: ["userId"], where: { creatorId, userId: { in: top.map((r) => r.userId) } }, _sum: { points: true } });
  const totalOf = new Map(totals.map((t) => [t.userId, t._sum.points ?? 0]));
  const mine = viewerId ? ranked.find((r) => r.userId === viewerId) : undefined;
  return {
    top: top.map((r) => ({ rank: r.rank, userId: r.userId, name: shortName(r.name), points: r.points, level: levelFor(totalOf.get(r.userId) ?? r.points).level })),
    me: mine ? { rank: mine.rank, points: mine.points } : null,
  };
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
  // Badges too, so "Turn on" / "Recalculate" don't leave earned badges unlit until the learner's next action.
  for (const userId of people) await evaluateBadges(userId, creatorId);
  return { awarded };
}
