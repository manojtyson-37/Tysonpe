import { db } from "../db";

/** Creator-facing numbers for one product. Only currently-enrolled learners count (refunds drop out). */
export async function getCourseInsights(productId: string) {
  const [items, enrollments, certificates] = await Promise.all([
    db.contentItem.findMany({ where: { productId }, orderBy: [{ position: "asc" }], select: { id: true, title: true, requiredForCompletion: true } }),
    db.enrollment.findMany({ where: { productId }, select: { userId: true } }),
    db.certificate.count({ where: { productId, revokedAt: null } }),
  ]);
  const enrolledIds = new Set(enrollments.map((e) => e.userId));
  const progress = await db.lessonProgress.findMany({
    where: { productId, userId: { in: [...enrolledIds] } },
    select: { userId: true, itemId: true },
  });

  const perLesson = new Map<string, number>();
  const perUser = new Map<string, Set<string>>();
  for (const p of progress) {
    perLesson.set(p.itemId, (perLesson.get(p.itemId) ?? 0) + 1);
    (perUser.get(p.userId) ?? perUser.set(p.userId, new Set()).get(p.userId)!).add(p.itemId);
  }
  const required = items.filter((i) => i.requiredForCompletion);
  const completed =
    required.length === 0
      ? 0
      : [...enrolledIds].filter((u) => required.every((i) => perUser.get(u)?.has(i.id))).length;
  const enrolled = enrolledIds.size;

  return {
    enrolled,
    completed,
    completionPct: enrolled === 0 ? 0 : Math.round((completed / enrolled) * 100),
    certificates,
    lessons: items.map((i) => {
      const completedCount = perLesson.get(i.id) ?? 0;
      return { id: i.id, title: i.title, completedCount, pct: enrolled === 0 ? 0 : Math.round((completedCount / enrolled) * 100) };
    }),
  };
}
