export type PointKind =
  | "lesson_complete"
  | "quiz_pass"
  | "course_complete"
  | "post_created"
  | "comment_created"
  | "like_received";

/** `dailyCap` = max number of awarded events of this kind per user per creator per IST day. */
export const POINT_RULES: Record<PointKind, { points: number; dailyCap?: number }> = {
  lesson_complete: { points: 10 },
  quiz_pass: { points: 25 },
  course_complete: { points: 100 },
  post_created: { points: 5, dailyCap: 3 },
  comment_created: { points: 2, dailyCap: 10 },
  like_received: { points: 1, dailyCap: 20 },
};

export const isPointKind = (s: string): s is PointKind => Object.hasOwn(POINT_RULES, s);
