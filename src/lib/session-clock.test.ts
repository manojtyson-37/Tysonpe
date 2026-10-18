import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COUNTDOWN_LENGTH_SECONDS, COUNTDOWN_START_SECONDS } from "./demo-model";
import { createSessionClock } from "./session-clock";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("session clock: the demo's shared countdown, outside React", () => {
  it("opens at the start value and only moves when started", () => {
    const clock = createSessionClock();
    expect(clock.get()).toBe(COUNTDOWN_START_SECONDS);
    vi.advanceTimersByTime(5000);
    expect(clock.get()).toBe(COUNTDOWN_START_SECONDS);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ticks once a second while started, wraps 00:00 to a fresh 15:00, and stops cleanly", () => {
    const clock = createSessionClock(2);
    const stop = clock.start();
    vi.advanceTimersByTime(1000);
    expect(clock.get()).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(clock.get()).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(clock.get()).toBe(COUNTDOWN_LENGTH_SECONDS);
    stop();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(3000);
    expect(clock.get()).toBe(COUNTDOWN_LENGTH_SECONDS);
  });

  it("tells subscribers on each tick and not after they unsubscribe", () => {
    const clock = createSessionClock(10);
    const a = vi.fn();
    const b = vi.fn();
    const offA = clock.subscribe(a);
    clock.subscribe(b);
    clock.start();
    vi.advanceTimersByTime(2000);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(2);
    offA();
    vi.advanceTimersByTime(1000);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(3);
  });

  it("two clocks do not share state", () => {
    const one = createSessionClock(10);
    const two = createSessionClock(10);
    one.start();
    vi.advanceTimersByTime(1000);
    expect(one.get()).toBe(9);
    expect(two.get()).toBe(10);
  });

  it("start() twice runs one interval: the clock ticks once a second, not twice, and one stop ends it", () => {
    const clock = createSessionClock(10);
    const first = clock.start();
    const second = clock.start();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(3000);
    expect(clock.get()).toBe(7);
    second();
    expect(vi.getTimerCount()).toBe(0);
    first(); // stopping again is harmless
    vi.advanceTimersByTime(3000);
    expect(clock.get()).toBe(7);
  });

  it("can be started again after it was stopped (the effect cleanup and re-run of React's dev double-invoke)", () => {
    const clock = createSessionClock(10);
    clock.start()();
    expect(vi.getTimerCount()).toBe(0);
    clock.start();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(2000);
    expect(clock.get()).toBe(8);
  });
});
