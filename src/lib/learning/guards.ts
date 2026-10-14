import { db } from "../db";

/** A section may only be used by lessons of the SAME product, and only by the creator who owns it. */
export async function sectionBelongsTo(sectionId: string, productId: string, creatorId: string) {
  const s = await db.section.findFirst({ where: { id: sectionId, productId, product: { creatorId } }, select: { id: true } });
  return s !== null;
}

/** Quizzes start empty and a required empty quiz can't be passed, so none may be added to a live course. */
export function lessonAddProblem(productStatus: string, kind: string): string | null {
  if (productStatus === "published" && kind === "quiz")
    return "Unpublish the product first: a new quiz has no questions yet, and learners would be stuck on it. Add the quiz, write its questions, then publish.";
  return null;
}
