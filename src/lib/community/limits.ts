import { createLimiter } from "@/lib/auth/rate-limit";

// Per-process (same caveat as the login limiter). Keyed by user id.
const limiters = {
  post: createLimiter({ max: 5, windowMs: 60_000 }),
  comment: createLimiter({ max: 20, windowMs: 60_000 }),
  like: createLimiter({ max: 60, windowMs: 60_000 }),
  // Console backfill/recalculate walks all of a creator's progress: keyed by creator id.
  backfill: createLimiter({ max: 3, windowMs: 600_000 }),
} as const;

/** True if the user (or, for `backfill`, the creator) may perform the action now (and counts this attempt). */
export function checkRate(kind: keyof typeof limiters, userId: string): boolean {
  return limiters[kind].hit(userId);
}
