// The demo shell's tab switching and its session clock. The repo has no DOM runner, so React's hooks are replaced with a
// tiny synchronous store (as in flow.interactions.test.tsx): the shell is called as a plain function, the returned element
// tree is searched, and the Tabs onChange is invoked as the primitive would invoke it. useEffect honours its dependency
// array, so the clock's interval is started and stopped the way React would manage it.
//
// WHAT THIS CANNOT PROVE (needs a browser): that the Tabs primitive calls onChange on a real click or arrow key (tabs.test.tsx
// covers the primitive), that the hidden panels are hidden by the browser, and that the digits repaint every second.
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const H = vi.hoisted(() => ({
  slots: [] as unknown[],
  i: 0,
  e: 0,
  sets: 0,
  pending: [] as Array<{ idx: number; fn: () => void | (() => void); deps?: unknown[] }>,
  fx: [] as Array<{ deps?: unknown[]; cleanup?: void | (() => void) } | undefined>,
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
  const useEffect = (fn: () => void | (() => void), deps?: unknown[]) => {
    H.pending.push({ idx: H.e++, fn, deps });
  };
  const useSyncExternalStore = (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot();
  const stubs = { useState, useEffect, useSyncExternalStore };
  return { ...actual, default: { ...actual, ...stubs }, ...stubs };
});

vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push() {}, replace() {}, refresh() {} }) }));

import { HomeInteractiveDemo } from "@/components/HomeInteractiveDemo";
import { TabPanel, Tabs } from "@/components/ui";
import { DEMO_MODES } from "@/lib/demo-model";
import { createSessionClock, type SessionClock as Clock } from "@/lib/session-clock";
import { FeeCalc } from "./FeeCalc";
import { HostedTab } from "./HostedTab";
import { QrTab } from "./QrTab";
import { SessionClock } from "./SessionClock";

type P = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function findAll(node: ReactNode, type: unknown, out: Array<ReactElement<P>> = []): Array<ReactElement<P>> {
  if (Array.isArray(node)) {
    node.forEach((n) => findAll(n, type, out));
    return out;
  }
  if (!isValidElement(node)) return out;
  if (node.type === type) out.push(node as ReactElement<P>);
  findAll((node.props as P).children as ReactNode, type, out);
  return out;
}

function flush() {
  const run = H.pending;
  H.pending = [];
  for (const { idx, fn, deps } of run) {
    const prev = H.fx[idx];
    const changed = !prev || !deps || !prev.deps || deps.length !== prev.deps.length || deps.some((d, k) => !Object.is(d, prev.deps![k]));
    if (!changed) continue;
    if (typeof prev?.cleanup === "function") prev.cleanup();
    H.fx[idx] = { deps, cleanup: fn() };
  }
}
function unmount() {
  for (const f of H.fx) if (typeof f?.cleanup === "function") f.cleanup();
  H.fx = [];
}

function mount() {
  H.slots = [];
  H.fx = [];
  H.pending = [];
  H.sets = 0;
  let tree: ReactNode;
  const render = () => {
    H.i = 0;
    H.e = 0;
    H.pending = [];
    tree = HomeInteractiveDemo();
    flush();
  };
  render();
  const tabs = () => findAll(tree, Tabs)[0].props;
  const panels = () => findAll(tree, TabPanel).map((p) => p.props);
  const select = (value: string) => {
    tabs().onChange(value);
    render();
  };
  const mounted = () => ({
    qr: findAll(tree, QrTab).length,
    hosted: findAll(tree, HostedTab).length,
    fees: findAll(tree, FeeCalc).length,
  });
  return { render, tabs, panels, select, mounted, qr: () => findAll(tree, QrTab)[0]?.props, hosted: () => findAll(tree, HostedTab)[0]?.props };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  unmount();
  vi.useRealTimers();
});

describe("HomeInteractiveDemo: tab switching", () => {
  it("opens on the UPI QR tab with only that panel selected and mounted", () => {
    const t = mount();
    expect(t.tabs().value).toBe("upi-qr");
    expect(t.panels().map((p) => [p.value, p.selected])).toEqual([["upi-qr", true], ["easebuzz", false], ["fees", false]]);
    expect(t.mounted()).toEqual({ qr: 1, hosted: 0, fees: 0 });
  });

  it("hands the Tabs primitive the model's tab list, an accessible name, and the id its panels use", () => {
    const t = mount();
    expect(t.tabs().items).toEqual(DEMO_MODES);
    expect(t.tabs().ariaLabel).toBe("Demo screens");
    expect(t.tabs().id).toBe("home-demo");
    for (const p of t.panels()) expect(p.id).toBe("home-demo");
  });

  it.each([
    ["easebuzz", { qr: 0, hosted: 1, fees: 0 }],
    ["fees", { qr: 0, hosted: 0, fees: 1 }],
    ["upi-qr", { qr: 1, hosted: 0, fees: 0 }],
  ])("choosing %s selects it, marks its panel selected, and mounts only that content", (value, mounted) => {
    const t = mount();
    t.select("easebuzz"); // start somewhere else so "upi-qr" is a real change
    t.select(value);
    expect(t.tabs().value).toBe(value);
    expect(t.panels().filter((p) => p.selected).map((p) => p.value)).toEqual([value]);
    expect(t.mounted()).toEqual(mounted);
  });

  it("ignores a value that is not one of the modes, leaving the selection alone", () => {
    const t = mount();
    t.select("fees");
    for (const bad of ["", "UPI QR", "Fees", "__proto__", "constructor", "upi-qr ", "undefined"]) {
      t.select(bad);
      expect(t.tabs().value, JSON.stringify(bad)).toBe("fees");
      expect(t.mounted(), JSON.stringify(bad)).toEqual({ qr: 0, hosted: 0, fees: 1 });
    }
  });

  it("choosing the selected tab again changes nothing", () => {
    const t = mount();
    t.select("upi-qr");
    expect(t.tabs().value).toBe("upi-qr");
    expect(t.mounted()).toEqual({ qr: 1, hosted: 0, fees: 0 });
  });
});

describe("HomeInteractiveDemo: the session clock", () => {
  it("opens at 14:52 (892 seconds), not a fresh 15:00", () => {
    const t = mount();
    const clock = t.qr()!.clock as Clock;
    expect(clock.get()).toBe(892);
    expect(clock.get()).not.toBe(900);
  });

  it("ticks once a second and keeps going: not slower, not faster, not frozen", () => {
    const t = mount();
    const clock = t.qr()!.clock as Clock;
    vi.advanceTimersByTime(999);
    expect(clock.get()).toBe(892);
    vi.advanceTimersByTime(1);
    expect(clock.get()).toBe(891);
    vi.advanceTimersByTime(9000);
    expect(clock.get()).toBe(882);
    vi.advanceTimersByTime(60_000);
    expect(clock.get()).toBe(822);
  });

  it("runs one interval: a re-render, or a tab switch, neither stacks a second one nor restarts the first", () => {
    const t = mount();
    expect(vi.getTimerCount()).toBe(1);
    const clock = t.qr()!.clock as Clock;
    vi.advanceTimersByTime(3000); // part-way through the second after the third tick
    vi.advanceTimersByTime(500);
    t.render();
    t.render();
    t.select("easebuzz");
    t.select("fees");
    t.select("upi-qr");
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(500);
    expect(clock.get()).toBe(888); // the interval kept its phase: it was not restarted by the renders, so the 4th tick landed on time
  });

  it("keeps the same clock object for the whole session and hands it to both checkout tabs", () => {
    const t = mount();
    const first = t.qr()!.clock;
    t.select("easebuzz");
    const hosted = t.hosted()!.clock;
    t.select("upi-qr");
    expect(hosted).toBe(first);
    expect(t.qr()!.clock).toBe(first);
  });

  it("writes no React state on a tick", () => {
    const t = mount();
    const setsAtMount = H.sets;
    vi.advanceTimersByTime(5000);
    expect(H.sets).toBe(setsAtMount);
    expect(t.tabs().value).toBe("upi-qr");
  });

  it("stops the interval when the shell unmounts", () => {
    const t = mount();
    const clock = t.qr()!.clock as Clock;
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(5000);
    expect(clock.get()).toBe(892);
  });

  it("the digits follow a clock that starts at 0 (00:00) and wrap to a fresh 15:00", () => {
    const clock = createSessionClock(0);
    const read = () => {
      H.i = 0;
      return (SessionClock({ clock, className: "x" }) as ReactElement<P>).props.children;
    };
    expect(read()).toBe("00:00");
    const stop = clock.start();
    vi.advanceTimersByTime(1000);
    expect(read()).toBe("15:00");
    vi.advanceTimersByTime(1000);
    expect(read()).toBe("14:59");
    stop();
  });
});
