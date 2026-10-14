export type DripType = "none" | "days_after_enroll" | "on_date" | "after_previous";

export type DripItem = {
  id: string;
  dripType: DripType;
  dripDays: number | null;
  dripAt: Date | null;
};

export type DripContext = {
  enrolledAt: Date;
  now: Date;
  /** Nearest earlier REQUIRED lesson in course order, or null for the first one. */
  previousItemId: string | null;
  completedIds: ReadonlySet<string>;
};

export type DripState =
  | { unlocked: true }
  | { unlocked: false; reason: "date"; unlockAt: Date }
  | { unlocked: false; reason: "after_previous" }
  | { unlocked: false; reason: "invalid" };

const DAY_MS = 86_400_000;

/**
 * Is a lesson open to this learner right now?
 * Incomplete rules (no days / no date) mean "no drip" so a half-filled form never locks content forever;
 * an unknown type fails closed so a corrupt value can't leak a locked lesson.
 */
export function isUnlocked(item: DripItem, ctx: DripContext): DripState {
  switch (item.dripType) {
    case "none":
      return { unlocked: true };
    case "days_after_enroll": {
      if (item.dripDays === null) return { unlocked: true };
      const unlockAt = new Date(ctx.enrolledAt.getTime() + item.dripDays * DAY_MS);
      return ctx.now.getTime() >= unlockAt.getTime() ? { unlocked: true } : { unlocked: false, reason: "date", unlockAt };
    }
    case "on_date": {
      if (item.dripAt === null) return { unlocked: true };
      return ctx.now.getTime() >= item.dripAt.getTime()
        ? { unlocked: true }
        : { unlocked: false, reason: "date", unlockAt: item.dripAt };
    }
    case "after_previous":
      if (ctx.previousItemId === null || ctx.completedIds.has(ctx.previousItemId)) return { unlocked: true };
      return { unlocked: false, reason: "after_previous" };
    default:
      return { unlocked: false, reason: "invalid" };
  }
}
