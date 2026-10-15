import { db } from "../db";
import { computeProgress } from "../learning/progress";
import { awardPoints, evaluateBadges, type AwardInput } from "./service";

/** Award + evaluate badges; gamification must never break the action that triggered it. */
export async function awardSafely(a: AwardInput): Promise<void> {
  try {
    await awardPoints(a);
    await evaluateBadges(a.userId, a.creatorId);
  } catch (e) {
    console.error("[gamification] award failed", a.kind, e);
  }
}

/** Called after a lesson is marked complete or a quiz is passed (post-commit). */
export async function onLearningProgress(userId: string, itemId: string): Promise<void> {
  try {
    const item = await db.contentItem.findUnique({
      where: { id: itemId },
      select: { id: true, kind: true, productId: true, quiz: { select: { id: true } }, product: { select: { creatorId: true } } },
    });
    if (!item) return;
    const creatorId = item.product.creatorId;
    const isQuiz = item.kind === "quiz" && item.quiz;
    await awardPoints({ userId, creatorId, kind: isQuiz ? "quiz_pass" : "lesson_complete", refId: isQuiz ? item.quiz!.id : item.id });

    const [items, done] = await Promise.all([
      db.contentItem.findMany({ where: { productId: item.productId }, select: { id: true, requiredForCompletion: true } }),
      db.lessonProgress.findMany({ where: { userId, productId: item.productId }, select: { itemId: true } }),
    ]);
    const progress = computeProgress(items.map((i) => ({ id: i.id, required: i.requiredForCompletion })), new Set(done.map((d) => d.itemId)));
    if (progress.complete) await awardPoints({ userId, creatorId, kind: "course_complete", refId: item.productId });
    await evaluateBadges(userId, creatorId);
  } catch (e) {
    console.error("[gamification] learning hook failed", e);
  }
}
