import { db } from "../db";
import { AppError } from "../errors";

async function ownedQuiz(creatorId: string, itemId: string) {
  return db.contentItem.findFirst({
    where: { id: itemId, kind: "quiz", product: { creatorId } },
    include: { quiz: true },
  });
}

/** Learners who used every attempt on a capped quiz without passing: they can't finish until reset. */
export async function listExhaustedLearners(creatorId: string, itemId: string) {
  const item = await ownedQuiz(creatorId, itemId);
  if (!item?.quiz || item.quiz.maxAttempts === null) return [];
  const attempts = await db.quizAttempt.findMany({
    where: { quizId: item.quiz.id },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { attemptNo: "asc" },
  });
  const byUser = new Map<string, typeof attempts>();
  for (const a of attempts) byUser.set(a.userId, [...(byUser.get(a.userId) ?? []), a]);
  return [...byUser.entries()]
    .filter(([, list]) => list.length >= item.quiz!.maxAttempts! && !list.some((a) => a.passed))
    .map(([userId, list]) => ({ userId, name: list[0].user.name, email: list[0].user.email, attempts: list.length, lastScorePct: list[list.length - 1].scorePct }));
}

/** Give a learner a fresh set of attempts. Progress and other lessons are untouched. */
export async function resetQuizAttempts(input: { creatorId: string; itemId: string; userId: string }) {
  const item = await ownedQuiz(input.creatorId, input.itemId);
  if (!item?.quiz) throw new AppError("not_found", "Quiz not found.");
  await db.quizAttempt.deleteMany({ where: { quizId: item.quiz.id, userId: input.userId } });
}
