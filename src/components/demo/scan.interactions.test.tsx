// The QR's one-shot scan plays ONCE per page load, when the demo first scrolls into view (not at mount: below the fold nobody
// would see it). Whether it has played is the shell's flag (HomeInteractiveDemo), handed to the tab as `scanPlayed` /
// `onScanPlayed`; here the harness plays the shell's part.
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
type Entry = { isIntersecting: boolean; intersectionRatio: number };
type Callback = (entries: Entry[]) => void;
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
  /** Entries as a real observer reports them: `true` is a fully visible element, `false` an offscreen one. */
  fire(...flags: boolean[]) {
    this.callback(flags.map((isIntersecting) => ({ isIntersecting, intersectionRatio: isIntersecting ? 1 : 0 })));
  }
  /** Entries with an explicit visible fraction (isIntersecting is true for any overlap, as in a browser). */
  fireRatios(...ratios: number[]) {
    this.callback(ratios.map((intersectionRatio) => ({ isIntersecting: intersectionRatio > 0, intersectionRatio })));
  }
}

const ROOT = { name: "the QR tab root" };

// The shell's "has the scan played" flag lives outside any one mount, as it does in HomeInteractiveDemo (which stays mounted
// while a tab's content comes and goes). A test that wants a fresh page load calls resetShell().
let played = false;
let playedCalls = 0;
const resetShell = () => {
  played = false;
  playedCalls = 0;
};
const onScanPlayed = () => {
  played = true;
  playedCalls++;
};

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
    tree = all(expand((component as (p: unknown) => ReactNode)({ clock, scanPlayed: played, onScanPlayed }) as ReactNode));
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
  const scanNode = () => tree.find((n) => n.tag === "div" && n.props["aria-hidden"] === "true" && /border-t-2/.test(n.props.className ?? ""));
  /** The scan overlay's own animationend, as the browser delivers it when the pass finishes. */
  const animationEnd = () => {
    const el = scanNode();
    expect(el, "the scan overlay is on screen").toBeDefined();
    expect(typeof el!.props.onAnimationEnd, "the overlay listens for animationend").toBe("function");
    el!.props.onAnimationEnd({});
    render();
  };
  /** The tab is left (tab switch) and shown again: a fresh mount, same shell. The new observer reports the demo in view. */
  const remount = () => {
    unmount();
    const first = observers.length;
    const fresh = mount(component);
    if (observers.length > first) observers[first].fireRatios(1);
    fresh.render();
    return fresh;
  };
  return { render, scan, click, animationEnd, remount };
}

beforeEach(() => {
  resetShell();
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

  it("an intersecting entry below the 40% threshold does not count: the observer's opening entry is not a sighting", () => {
    const t = mount();
    // A real observer delivers an entry as soon as it starts observing, and a sliver overlap is isIntersecting too.
    observers[0].callback([{ isIntersecting: true, intersectionRatio: 0.1 }]);
    t.render();
    expect(t.scan()).not.toContain("qr-scan-once");
    expect(observers[0].disconnects).toBe(0);
    observers[0].fireRatios(0, 0.39, 0.399999);
    t.render();
    expect(t.scan()).not.toContain("qr-scan-once");
    expect(observers[0].disconnects).toBe(0);
  });

  it("an entry at the threshold counts (0.4 exactly, and anything above)", () => {
    const t = mount();
    observers[0].fireRatios(0.4);
    t.render();
    expect(t.scan()).toMatch(/^qr-scan-once /);
    expect(observers[0].disconnects).toBe(1);
    const u = mount();
    observers[1].fireRatios(0.1, 0.75);
    u.render();
    expect(u.scan()).toMatch(/^qr-scan-once /);
  });

  it("a ratio at or above the threshold does not count when the entry is not intersecting", () => {
    const t = mount();
    observers[0].callback([{ isIntersecting: false, intersectionRatio: 0.9 }]);
    t.render();
    expect(t.scan()).not.toContain("qr-scan-once");
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
    QrTab({ clock: createSessionClock(892), scanPlayed: false, onScanPlayed }); // the ref is never attached
    expect(() => flush()).not.toThrow();
    expect(observers).toHaveLength(0);
  });

  it("plays once: a fresh checkout after Run it again carries no scan class, and asks for no new observer", () => {
    const t = mount();
    observers[0].fire(true);
    t.render();
    expect(t.scan()).toContain("qr-scan-once");
    t.click("Pay with Google Pay");
    t.click("Approve payment");
    vi.advanceTimersByTime(1200);
    t.render();
    expect(t.scan()).toBeUndefined(); // the checkout step is gone, and so is the overlay
    t.click("Run it again");
    expect(t.scan()).toBeDefined();
    expect(t.scan()).not.toContain("qr-scan-once");
    expect(t.scan()).toContain("opacity-0"); // at rest it is invisible
    expect(observers).toHaveLength(1);
  });

  it("plays once: coming back with Back to the QR (before the pass ended) does not replay it", () => {
    const t = mount();
    observers[0].fire(true);
    t.render();
    expect(t.scan()).toContain("qr-scan-once");
    t.click("Pay with Google Pay"); // the overlay unmounts mid-pass
    t.click("Back to the QR");
    expect(t.scan()).toBeDefined();
    expect(t.scan()).not.toContain("qr-scan-once");
  });

  it("plays once: Try again after a declined payment does not replay it", () => {
    const t = mount();
    observers[0].fire(true);
    t.render();
    t.animationEnd();
    t.click("Pay with Google Pay");
    t.click("Decline");
    vi.advanceTimersByTime(1200);
    t.render();
    t.click("Try again");
    expect(t.scan()).toBeDefined();
    expect(t.scan()).not.toContain("qr-scan-once");
  });

  it("removes the class when the animation ends, and nothing brings it back", () => {
    const t = mount();
    observers[0].fire(true);
    t.render();
    expect(t.scan()).toContain("qr-scan-once");
    expect(playedCalls).toBe(0); // still playing: not spent yet
    t.animationEnd();
    expect(played).toBe(true);
    expect(t.scan()).not.toContain("qr-scan-once");
    expect(t.scan()).toContain("opacity-0");
    t.render();
    t.render();
    expect(t.scan()).not.toContain("qr-scan-once");
  });

  it("plays once: switching away and back (the tab remounts) does not replay it, after a full pass", () => {
    const t = mount();
    observers[0].fire(true);
    t.render();
    t.animationEnd();
    const again = t.remount();
    expect(again.scan()).toBeDefined();
    expect(again.scan()).not.toContain("qr-scan-once");
  });

  it("plays once: leaving the tab mid-pass spends it too, so coming back does not start another", () => {
    const t = mount();
    observers[0].fire(true);
    t.render();
    expect(t.scan()).toContain("qr-scan-once");
    expect(played).toBe(false);
    const again = t.remount(); // unmount before animationend
    expect(played).toBe(true);
    expect(again.scan()).not.toContain("qr-scan-once");
  });

  it("a tab left before it was ever seen has not spent the pass: it still plays on the first view", () => {
    const t = mount();
    unmount(); // switched away while the demo was still below the fold
    expect(played).toBe(false);
    const again = mount();
    expect(again.scan()).not.toContain("qr-scan-once");
    observers[observers.length - 1].fireRatios(0.6);
    again.render();
    expect(again.scan()).toMatch(/^qr-scan-once /);
    void t;
  });

  it("a visitor who steps through the flow before the demo was ever in view has not spent the pass: it plays on the first view", () => {
    const t = mount();
    t.click("Pay with Google Pay"); // acted without the 40% sighting (keyboard, deep link): nothing has played
    t.click("Back to the QR");
    expect(played).toBe(false);
    expect(t.scan()).not.toContain("qr-scan-once");
    observers[0].fireRatios(0.8);
    t.render();
    expect(t.scan()).toMatch(/^qr-scan-once /);
  });

  it("without IntersectionObserver the scan plays at mount, once", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const t = mount();
    t.render();
    expect(t.scan()).toMatch(/^qr-scan-once /);
    t.animationEnd();
    expect(t.scan()).not.toContain("qr-scan-once");
    t.click("Pay with Google Pay");
    t.click("Back to the QR");
    expect(t.scan()).not.toContain("qr-scan-once");
  });

  it("the Easebuzz tab has no scan and watches nothing", () => {
    const t = mount(HostedTab);
    expect(t.scan()).toBeUndefined();
    expect(observers).toHaveLength(0);
  });
});
