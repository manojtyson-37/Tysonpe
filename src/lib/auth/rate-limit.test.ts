import { describe, expect, it } from "vitest";
import { createLimiter } from "./rate-limit";

describe("rate limiter", () => {
  it("blocks after max attempts within the window", () => {
    const l = createLimiter({ max: 3, windowMs: 1000 });
    const t = 1000;
    expect(l.hit("k", t)).toBe(true);
    expect(l.hit("k", t)).toBe(true);
    expect(l.hit("k", t)).toBe(true);
    expect(l.hit("k", t)).toBe(false);
  });
  it("resets after the window and isolates keys", () => {
    const l = createLimiter({ max: 1, windowMs: 1000 });
    expect(l.hit("a", 0)).toBe(true);
    expect(l.hit("a", 500)).toBe(false);
    expect(l.hit("b", 500)).toBe(true);
    expect(l.hit("a", 1500)).toBe(true);
  });
  it("reset() clears a key (e.g. after successful login)", () => {
    const l = createLimiter({ max: 1, windowMs: 1000 });
    l.hit("a", 0);
    l.reset("a");
    expect(l.hit("a", 1)).toBe(true);
  });
  it("evicts expired entries so spoofed keys can't grow memory without bound", () => {
    const l = createLimiter({ max: 1, windowMs: 1000, maxKeys: 50 });
    for (let i = 0; i < 40; i++) l.hit(`old-${i}`, 0);
    for (let i = 0; i < 40; i++) l.hit(`new-${i}`, 5000); // old window long expired
    expect(l.size()).toBeLessThanOrEqual(50);
  });
  it("when full of live keys it evicts the oldest instead of locking everyone else out", () => {
    const l = createLimiter({ max: 5, windowMs: 1000, maxKeys: 10 });
    for (let i = 0; i < 10; i++) expect(l.hit(`k${i}`, 0)).toBe(true);
    expect(l.hit("newcomer", 0)).toBe(true); // legitimate new key is still served
    expect(l.size()).toBe(10);
  });
});
