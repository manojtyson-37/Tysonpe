// The shell must not re-render on the 1s clock tick: the countdown lives in a leaf (SessionClock) that subscribes to an
// external store. The repo has no DOM runner, so React's hooks are replaced with a tiny synchronous store (as in
// flow.interactions.test.tsx) and every state write is counted. WHAT THIS CANNOT PROVE: that React skips re-rendering the
// shell's children (that is React's job once no state changed); it proves the shell writes no state on a tick and that the
// digits are driven by the store the shell hands down.
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const H = vi.hoisted(() => ({
  slots: [] as unknown[],
  i: 0,
  sets: 0,
  pending: [] as Array<() => void | (() => void)>,
  cleanups: [] as Array<() => void>,
  subscribed: [] as Array<() => void>,
}));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const useState = (init: unknown) => {
    const idx = H.i++;
    if (!(idx in H.slots)) H.slots[idx] = typeof init === "function" ? (init as () => unknown)() : init;
    const set = (v: unknown) => {
      H.sets++;
      H.slots[idx] = typeof v === "function" ? (v as (p: unknown) => unknown)(H.slots[idx]) : v;
    };
    return [H.slots[idx], set];
  };
  const useEffect = (fn: () => void | (() => void)) => {
    H.pending.push(fn);
  };
  const useSyncExternalStore = (subscribe: (cb: () => void) => () => void, getSnapshot: () => unknown) => {
    H.cleanups.push(subscribe(() => H.subscribed.forEach((f) => f())));
    return getSnapshot();
  };
  const useCallback = (fn: unknown) => fn;
  const stubs = { useState, useEffect, useSyncExternalStore, useCallback };
  return { ...actual, default: { ...actual, ...stubs }, ...stubs };
});

vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push() {}, replace() {}, refresh() {} }) }));

import { HomeInteractiveDemo } from "@/components/HomeInteractiveDemo";
import { createSessionClock } from "@/lib/session-clock";
import { Tabs } from "@/components/ui";
import { HostedTab } from "./HostedTab";
import { QrTab } from "./QrTab";
import { SessionClock } from "./SessionClock";

type P = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function find(node: ReactNode, type: unknown): ReactElement<P> | null {
  if (Array.isArray(node)) {
    for (const n of node) {
      const hit = find(n, type);
      if (hit) return hit;
    }
    return null;
  }
  if (!isValidElement(node)) return null;
  if (node.type === type) return node as ReactElement<P>;
  return find((node.props as P).children as ReactNode, type);
}

function runEffects() {
  const run = H.pending;
  H.pending = [];
  for (const fn of run) {
    const cleanup = fn();
    if (typeof cleanup === "function") H.cleanups.push(cleanup);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  H.slots = [];
  H.i = 0;
  H.sets = 0;
  H.pending = [];
  H.cleanups = [];
  H.subscribed = [];
});
afterEach(() => {
  H.cleanups.forEach((c) => c());
  vi.useRealTimers();
});

describe("the home demo's clock", () => {
  it("the shell writes no state on a tick: only the leaf's store moves", () => {
    const tree = HomeInteractiveDemo();
    runEffects();
    const setsAtMount = H.sets;
    const qr = find(tree, QrTab)!;
    expect(qr, "the QR tab is mounted first").not.toBeNull();
    const clock = qr.props.clock as ReturnType<typeof createSessionClock>;
    expect(clock.get()).toBe(892);
    vi.advanceTimersByTime(3000);
    expect(clock.get()).toBe(889);
    expect(H.sets).toBe(setsAtMount); // no setState in the shell (or anything it called) while the clock ran
  });

  it("starts the interval once and clears it when the shell unmounts", () => {
    HomeInteractiveDemo();
    runEffects();
    expect(vi.getTimerCount()).toBe(1);
    H.cleanups.forEach((c) => c());
    H.cleanups = [];
    expect(vi.getTimerCount()).toBe(0);
  });

  it("hands the same clock to both checkout tabs", () => {
    const first = HomeInteractiveDemo();
    runEffects();
    const qr = find(first, QrTab)!;
    const tabs = find(first, Tabs)!;
    tabs.props.onChange("easebuzz");
    H.i = 0;
    const second = HomeInteractiveDemo();
    const hosted = find(second, HostedTab)!;
    expect(hosted, "the hosted tab mounts after the switch").not.toBeNull();
    expect(qr.props.clock).toBeDefined();
    expect(hosted.props.clock).toBe(qr.props.clock);
  });
});

describe("SessionClock: the leaf", () => {
  it("renders the store's seconds as mm:ss in the class it is given, and follows the store", () => {
    const clock = createSessionClock(892);
    const read = () => {
      H.i = 0;
      const el = SessionClock({ clock, className: "tabular-nums" }) as ReactElement<P>;
      return { cls: el.props.className, text: el.props.children };
    };
    expect(read()).toEqual({ cls: "tabular-nums", text: "14:52" });
    const stop = clock.start();
    vi.advanceTimersByTime(2000);
    expect(read().text).toBe("14:50");
    stop();
  });

  it("subscribes to the store it is given", () => {
    const clock = createSessionClock(60);
    const subscribe = vi.spyOn(clock, "subscribe");
    SessionClock({ clock, className: "x" });
    expect(subscribe).toHaveBeenCalledTimes(1);
  });
});
