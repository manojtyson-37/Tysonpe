/**
 * Which lesson the player shows, decided from the URL alone and never from completion state.
 *
 * It used to default to "the first unfinished lesson", so the instant a learner passed the last open quiz nothing was
 * unfinished, the default flipped to the first lesson, and the quiz (with its result screen) unmounted. Now a request
 * without a usable ?lesson= redirects to the same page with an explicit id, and an explicit id is always honoured.
 * A redirect target is always a lesson that exists, so it is accepted on the next request: one hop, never a loop.
 */

/** Fixed messages keyed by a code: the URL can't be used to put arbitrary text in an alert box. */
export const NOTICES: Record<string, string> = { locked: "That lesson isn't available yet.", unavailable: "That lesson isn't available." };

/** The code if it is one of ours. Own keys only: a bare lookup would let ?notice=constructor resolve to Object.prototype. */
export function noticeCode(raw: unknown): string | null {
  return typeof raw === "string" && Object.hasOwn(NOTICES, raw) ? raw : null;
}

type Lesson = { id: string; completed: boolean; state: { unlocked: boolean } };

export type CurrentLesson<L extends Lesson> =
  | { kind: "empty" }
  | { kind: "lesson"; lesson: L; index: number }
  | { kind: "redirect"; to: string };

export function resolveCurrentLesson<L extends Lesson>(productId: string, lessons: L[], requested: unknown, rawNotice: unknown): CurrentLesson<L> {
  if (lessons.length === 0) return { kind: "empty" };
  if (typeof requested === "string") {
    const index = lessons.findIndex((l) => l.id === requested);
    if (index >= 0) return { kind: "lesson", lesson: lessons[index], index };
  }
  const target = lessons.find((l) => !l.completed && l.state.unlocked) ?? lessons[0];
  const code = noticeCode(rawNotice);
  return { kind: "redirect", to: `/library/${encodeURIComponent(productId)}?lesson=${encodeURIComponent(target.id)}${code ? `&notice=${code}` : ""}` };
}
