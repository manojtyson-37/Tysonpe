import { createLimiter } from "@/lib/auth/rate-limit";

// Per-process (same caveat as the login limiter). Keyed by user id.
const limiters = {
  post: createLimiter({ max: 5, windowMs: 60_000 }),
  comment: createLimiter({ max: 20, windowMs: 60_000 }),
  like: createLimiter({ max: 60, windowMs: 60_000 }),
} as const;

/** True if the user may perform the action now (and counts this attempt). */
export function checkRate(kind: keyof typeof limiters, userId: string): boolean {
  return limiters[kind].hit(userId);
}
