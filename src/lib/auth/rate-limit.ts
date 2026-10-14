/**
 * Fixed-window in-memory limiter. Per-process: swap for Redis when running multiple instances.
 * Bounded: expired entries are swept when full; if every slot is still live the OLDEST key is evicted,
 * so a flood of junk keys can degrade throttling but can never lock legitimate users out.
 */
export function createLimiter({
  max,
  windowMs,
  maxKeys = 10_000,
}: {
  max: number;
  windowMs: number;
  maxKeys?: number;
}) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  function sweep(now: number) {
    for (const [k, e] of hits) if (now >= e.resetAt) hits.delete(k);
  }

  return {
    /** Returns true if the attempt is allowed. */
    hit(key: string, now = Date.now()): boolean {
      const e = hits.get(key);
      if (e && now < e.resetAt) {
        if (e.count >= max) return false;
        e.count++;
        return true;
      }
      if (!e && hits.size >= maxKeys) {
        sweep(now);
        if (hits.size >= maxKeys) hits.delete(hits.keys().next().value as string); // Map keeps insertion order
      }
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    },
    reset(key: string) {
      hits.delete(key);
    },
    size: () => hits.size,
  };
}
