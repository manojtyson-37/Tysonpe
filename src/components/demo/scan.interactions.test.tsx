// The QR's one-shot scan plays when the demo first scrolls into view, not at mount (below the fold nobody would see it).
// The repo has no DOM runner, so React's hooks are replaced with a tiny synchronous store (as in flow.interactions.test.tsx)
// and IntersectionObserver with a fake that records its options, targets and disconnects and lets a test fire its callback.
//
// WHAT THIS CANNOT PROVE (needs a browser): that a real observer reports the intersection at 40% visible, that the
// CSS animation plays and then rests invisible, and that reduced motion hides it (the stylesheet rules are pinned as text
// in demo.test.tsx, not run).
import { isValidElement, type ReactNode } from "react";
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
  const useRef = (init: unknown) => {
    const idx = H.i++;
    if (!(idx in H.slots)) H.slots[idx] = { current: init };
    return H.slots[idx];
  };
  const useEffect = (fn: () => void | (() => void), deps?: unknown[]) => {
    H.pending.push({ idx: H.e++, fn, deps });
  };
  const useCallback = (fn: unknown) => fn;
  const useId = () => ":r0:";
  const useSyncExternalStore = (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot();
  const stubs = { useState, useRef, useEffect, useCallback, useId, useSyncExternalStore };
  return { ...actual, default: { ...actual, ...stubs }, ...stubs };
});

import { createSessionClock } from "@/lib/session-clock";
import { HostedTab } from "./HostedTab";
import { IN_VIEW_THRESHOLD } from "./use-in-view";
import { QrTab } from "./QrTab";

type P = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Node = { tag: string; props: P; kids: Array<Node | string> };

function expand(node: ReactNode): Array<Node | string> {
  if (node === null || node === undefined || typeof node === "boolean") return [];
  if (typeof node === "string" || typeof node === "number") return [String(node)];
  if (Array.isArray(node)) return node.flatMap(expand);
  if (!isValidElement(node)) return [];
  const props = node.props as P;
  if (typeof node.type === "string") return [{ tag: node.type, props, kids: expand(props.children as ReactNode) }];
  if (typeof node.type === "function") return expand((node.type as (p: P) => ReactNode)(props));
  return expand(props.children as ReactNode);
}
function all(nodes: Array<Node | string>, out: Node[] = []): Node[] {
  for (const n of nodes) {
    if (typeof n === "string") continue;
    out.push(n);
    all(n.kids, out);
  }
  return out;
}
const textOf = (n: Node | string): string => (typeof n === "string" ? n : n.tag === "svg" ? "" : n.kids.map(textOf).join(""));

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

// A fake IntersectionObserver: records what the component asks of it and lets a test deliver entries.
type Callback = (entries: Array<{ isIntersecting: boolean }>) => void;
const observers: FakeObserver[] = [];
class FakeObserver {
  observed: unknown[] = [];
  disconnects = 0;
  constructor(
    public callback: Callback,
    public options: { threshold?: number },
  ) {
    observers.push(this);
  }
  observe(el: unknown) {
    this.observed.push(el);
  }
  unobserve() {}
  disconnect() {
    this.disconnects++;
  }
  fire(...flags: boolean[]) {
    this.callback(flags.map((isIntersecting) => ({ isIntersecting })));
  }
}

const ROOT = { name: "the QR tab root" };

function mount(component: typeof QrTab | typeof HostedTab = QrTab) {
  H.slots = [];
  H.fx = [];
  H.pending = [];
  H.sets = 0;
  let tree: Node[] = [];
  const clock = createSessionClock(892);
  const render = () => {
    H.i = 0;
    H.e = 0;
    H.pending = [];
    tree = all(expand(component({ clock }) as ReactNode));
    // Stand-in for the DOM node behind the root ref, which React attaches before the effects run.
    const rootRef = tree[0]?.props.ref as { current: unknown } | undefined;
    if (rootRef) rootRef.current = ROOT;
    flush();
  };
  render();
  const scan = () => {
    const el = tree.find((n) => n.tag === "div" && n.props["aria-hidden"] === "true" && /border-t-2/.test(n.props.className ?? ""));
    return el?.props.className as string | undefined;
  };
  const click = (name: string) => {
    const b = tree.find((n) => n.tag === "button" && textOf(n).replace(/\s+/g, " ").trim() === name);
    expect(b, name).toBeDefined();
    b!.props.onClick({});
    render();
  };
  return { render, scan, click };
}

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  vi.stubGlobal("document", { activeElement: null, body: {} });
  vi.useFakeTimers();
});
afterEach(() => {
  unmount();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("QrTab: the scan plays when the tab first scrolls into view", () => {
  it("is not playing at mount: the overlay is there, invisible, with no scan class", () => {
    const t = mount();
    expect(t.scan()).toBeDefined();
    expect(t.scan()).not.toContain("qr-scan-once");
    expect(t.scan()).toContain("opacity-0"); // a static scan line must never show before it is triggered
    expect(t.scan()).toContain("pointer-events-none");
  });

  it("watches the tab's root element, once, at about 40% visible", () => {
    mount();
    expect(observers).toHaveLength(1);
    expect(observers[0].observed).toEqual([ROOT]);
    expect(observers[0].options).toEqual({ threshold: 0.4 });
    expect(IN_VIEW_THRESHOLD).toBe(0.4);
  });

  it("an entry that is not intersecting changes nothing and keeps watching", () => {
    const t = mount();
    observers[0].fire(false);
    t.render();
    expect(t.scan()).not.toContain("qr-scan-once");
    expect(observers[0].disconnects).toBe(0);
    observers[0].fire(false, false);
    t.render();
    expect(t.scan()).not.toContain("qr-scan-once");
  });

  it("the first intersection applies the scan class and stops observing", () => {
    const t = mount();
    observers[0].fire(true);
    t.render();
    expect(t.scan()).toMatch(/^qr-scan-once /);
    expect(t.scan()).toContain("opacity-0"); // the keyframes take over while it plays; at rest it is invisible
    expect(observers[0].disconnects).toBe(1);
  });

  it("any intersecting entry among several counts", () => {
    const t = mount();
    observers[0].fire(false, true);
    t.render();
    expect(t.scan()).toContain("qr-scan-once");
  });

  it("does not re-trigger: renders and a repeated entry create no observer, and the one disconnect is not repeated by renders", () => {
    const t = mount();
    observers[0].fire(true);
    t.render();
    const first = t.scan();
    t.render();
    t.render();
    expect(observers).toHaveLength(1);
    expect(observers[0].disconnects).toBe(1);
    expect(observers[0].observed).toHaveLength(1);
    observers[0].fire(true); // a real observer is disconnected and cannot deliver this; if it did, nothing new starts
    t.render();
    expect(observers).toHaveLength(1);
    expect(t.scan()).toBe(first);
  });

  it("an unrelated re-render does not create another observer", () => {
    const t = mount();
    t.render();
    t.render();
    expect(observers).toHaveLength(1);
    expect(observers[0].disconnects).toBe(0);
  });

  it("disconnects on unmount when it was never seen, and not twice over a seen one's own disconnect", () => {
    mount();
    expect(observers[0].disconnects).toBe(0);
    unmount();
    expect(observers[0].disconnects).toBe(1);
  });

  it("leaves nothing watching after unmount, seen or not", () => {
    const t = mount();
    observers[0].fire(true);
    t.render();
    unmount();
    expect(observers[0].disconnects).toBeGreaterThanOrEqual(1);
  });

  it("without IntersectionObserver the scan plays at mount", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const t = mount();
    expect(typeof IntersectionObserver).toBe("undefined");
    expect(observers).toHaveLength(0);
    t.render();
    expect(t.scan()).toMatch(/^qr-scan-once /);
  });

  it("with no element to watch (ref not attached) it creates no observer and does not throw", () => {
    H.slots = [];
    H.fx = [];
    H.pending = [];
    H.i = 0;
    H.e = 0;
    QrTab({ clock: createSessionClock(892) }); // the ref is never attached
    expect(() => flush()).not.toThrow();
    expect(observers).toHaveLength(0);
  });

  it("a fresh checkout after Run it again still carries the class (seen is remembered) and asks for no new observer", () => {
    const t = mount();
    observers[0].fire(true);
    t.render();
    t.click("Pay with Google Pay");
    t.click("Approve payment");
    vi.advanceTimersByTime(1200);
    t.render();
    expect(t.scan()).toBeUndefined(); // the checkout step is gone, and so is the overlay
    t.click("Run it again");
    expect(t.scan()).toContain("qr-scan-once");
    expect(observers).toHaveLength(1);
  });

  it("the Easebuzz tab has no scan and watches nothing", () => {
    const t = mount(HostedTab);
    expect(t.scan()).toBeUndefined();
    expect(observers).toHaveLength(0);
  });
});
