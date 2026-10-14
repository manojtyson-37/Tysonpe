"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { loadCourse, markComplete, submitQuiz, type QuizSubmission } from "@/lib/learning/service";

/**
 * Mark a lesson done, then go to the next lesson that is now open (decided AFTER completing: finishing
 * a lesson can unlock the following one). The redirect always names a lesson so the page stays put.
 */
export async function completeLesson(rawItemId: string) {
  const itemId = z.string().max(64).parse(rawItemId);
  const user = await requireUser();
  const item = await db.contentItem.findUnique({ where: { id: itemId }, select: { productId: true } });
  if (!item) redirect("/library");
  try {
    await markComplete(user.id, itemId);
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
    redirect(`/library/${item.productId}?lesson=${encodeURIComponent(itemId)}&notice=${e.code === "locked" ? "locked" : "unavailable"}`);
  }
  const course = await loadCourse(user.id, item.productId);
  const lessons = course?.lessons ?? [];
  const idx = lessons.findIndex((l) => l.id === itemId);
  const next = lessons.slice(idx + 1).find((l) => l.state.unlocked && !l.completed);
  revalidatePath(`/library/${item.productId}`);
  redirect(`/library/${item.productId}?lesson=${encodeURIComponent((next ?? lessons[idx] ?? { id: itemId }).id)}`);
}

const answersSchema = z.record(z.string().max(64), z.array(z.string().max(64)).max(6)).refine((o) => Object.keys(o).length <= 100);

export async function submitQuizAction(
  rawItemId: string,
  answers: Record<string, string[]>,
): Promise<{ ok: true; result: QuizSubmission } | { ok: false; error: string }> {
  const id = z.string().max(64).safeParse(rawItemId);
  if (!id.success) return { ok: false, error: "Quiz not found." };
  const itemId = id.data;
  const user = await requireUser();
  const parsed = answersSchema.safeParse(answers);
  if (!parsed.success) return { ok: false, error: "Those answers couldn't be read. Reload and try again." };
  try {
    const result = await submitQuiz(user.id, itemId, parsed.data);
    const item = await db.contentItem.findUnique({ where: { id: itemId }, select: { productId: true } });
    if (item) revalidatePath(`/library/${item.productId}`);
    return { ok: true, result };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    throw e;
  }
}
