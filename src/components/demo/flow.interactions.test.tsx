// Drives the demo tabs' closures (app picker, approve / decline, the settle timer, reset, bank choice, the focus hand-off).
// The repo has no DOM runner, so React's hooks are replaced with a tiny synchronous store (like
// QuizEditor.interactions.test.tsx): a tab is called as a plain function, the returned element tree is expanded (its own
// hook-free components are called, host elements are kept), and a control's onClick/onChange is invoked as React would.
// useEffect honours its dependency array, so the settle timer is created and cancelled the way React would manage it.
//
// WHAT THIS CANNOT PROVE (needs a real runtime: a browser, or jsdom + act):
// - Real focus(): the heading's ref is a stand-in with a spy, so "focus lands on the new heading" means focus() was
//   called on the element carrying the ref, in the commit after the step changed; not that the browser accepted it.
// - Batching and strict-mode double effects; the animation itself (class presence only); the Tabs primitive (covered by tabs.test).
import { isValidElement, type ReactNode } from "react";
import Link from "next/link";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Fx = { deps?: unknown[]; cleanup?: void | (() => void) };
const H = vi.hoisted(() => ({
  slots: [] as unknown[],
  i: 0,
  e: 0,
  pending: [] as Array<{ idx: number; fn: () => void | (() => void); deps?: unknown[] }>,
  fx: [] as Array<{ deps?: unknown[]; cleanup?: void | (() => void) } | undefined>,
}));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const useState = (init: unknown) => {
    const idx = H.i++;
    if (!(idx in H.slots)) H.slots[idx] = typeof init === "function" ? (init as () => unknown)() : init;
    const set = (v: unknown) => {
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
  const stubs = { useState, useRef, useEffect, useCallback, useId };
  return { ...actual, default: { ...actual, ...stubs }, ...stubs };
});

import { HostedTab } from "./HostedTab";
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
  if (node.type === Link) return [{ tag: "Link", props, kids: expand(props.children as ReactNode) }];
  if (typeof node.type === "function") return expand((node.type as (p: P) => ReactNode)(props));
  return expand(props.children as ReactNode);
}
// svg is skipped: the brand marks are aria-hidden and the Paytm mark draws its name as <text>.
const textOf = (n: Node | string): string => (typeof n === "string" ? n : n.tag === "svg" ? "" : n.kids.map(textOf).join(""));
function all(nodes: Array<Node | string>, out: Node[] = []): Node[] {
  for (const n of nodes) {
    if (typeof n === "string") continue;
    out.push(n);
    all(n.kids, out);
  }
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
    H.fx[idx] = { deps, cleanup: fn() } satisfies Fx;
  }
}
function unmount() {
  for (const f of H.fx) if (typeof f?.cleanup === "function") f.cleanup();
  H.fx = [];
}

function mount(component: (props: { countdown: number }) => ReactNode, countdown = 892) {
  H.slots = [];
  H.fx = [];
  H.pending = [];
  let tree: Node[] = [];
  const focus = vi.fn();
  const render = () => {
    H.i = 0;
    H.e = 0;
    H.pending = [];
    tree = all(expand(component({ countdown }) as ReactNode));
    // Stand-in for the DOM node behind the heading's ref, so the focus effect has something to call.
    const heading = tree.find((n) => n.tag === "h3");
    const ref = heading?.props.ref as { current: unknown } | undefined;
    if (ref) ref.current = { focus };
    flush();
  };
  render();
  const button = (name: string) => {
    const found = tree.find((n) => n.tag === "button" && textOf(n).replace(/\s+/g, " ").trim() === name);
    expect(found, `button "${name}" in: ${tree.filter((n) => n.tag === "button").map((n) => textOf(n)).join(" | ")}`).toBeDefined();
    return found!;
  };
  const click = (name: string) => {
    button(name).props.onClick({});
    render();
  };
  return {
    render,
    click,
    button,
    focus,
    has: (name: string) => tree.some((n) => n.tag === "button" && textOf(n).replace(/\s+/g, " ").trim() === name),
    heading: () => textOf(tree.find((n) => n.tag === "h3")!),
    status: () => textOf(tree.find((n) => n.props.role === "status")!),
    statusCount: () => tree.filter((n) => n.props.role === "status").length,
    text: () => tree.filter((n) => n.tag === "p").map((n) => textOf(n)).join(" "),
    stageClass: () => tree.find((n) => n.tag === "div" && (n.props.className === "enter" || n.props.className === undefined) && n.kids.length > 0 && all(n.kids).some((k) => k.tag === "h3"))?.props.className,
    link: () => tree.find((n) => n.tag === "Link"),
    nodes: () => tree,
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  unmount();
  vi.useRealTimers();
});

describe("QrTab: checkout -> phone-prompt -> processing -> success", () => {
  it("starts on the checkout step, announces it, and does not move focus on mount", () => {
    const t = mount(QrTab);
    expect(t.heading()).toBe("Pay by UPI");
    expect(t.status()).toContain("Simulated checkout");
    expect(t.statusCount()).toBe(1);
    expect(t.focus).not.toHaveBeenCalled();
    expect(t.stageClass()).toBeUndefined(); // the first paint is still: no enter animation before the visitor acts
  });

  it("opens the phone prompt in the chosen app and moves focus to the new heading", () => {
    const t = mount(QrTab);
    t.click("Pay with PhonePe");
    expect(t.heading()).toBe("Payment request in PhonePe");
    expect(t.status()).toBe("Simulated PhonePe payment request for ₹1,180. Approve or decline.");
    expect(t.focus).toHaveBeenCalledTimes(1);
    expect(t.has("Approve payment")).toBe(true);
    expect(t.has("Decline")).toBe(true);
    expect(t.stageClass()).toBe("enter"); // once the visitor has acted, each step enters once
  });

  it("the scan button opens the prompt in the generic UPI app", () => {
    const t = mount(QrTab);
    t.click("Simulate scanning the QR");
    expect(t.heading()).toBe("Payment request in Other UPI app");
  });

  it("approve -> processing -> (1.2s) -> success, with focus following each heading", () => {
    const t = mount(QrTab);
    t.click("Pay with Google Pay");
    t.click("Approve payment");
    expect(t.heading()).toBe("Checking the payment");
    expect(t.status()).toBe("Simulated payment is processing.");
    vi.advanceTimersByTime(1199);
    t.render();
    expect(t.heading()).toBe("Checking the payment");
    vi.advanceTimersByTime(1);
    t.render();
    expect(t.heading()).toBe("Simulated payment of ₹1,180 succeeded");
    expect(t.status()).toBe("Simulated payment of ₹1,180 succeeded. No money moved.");
    expect(t.focus).toHaveBeenCalledTimes(3); // prompt, processing, success
    expect(t.has("Run it again")).toBe(true);
    expect(t.link()?.props.href).toBe("/demo");
    expect(t.text()).toContain("Everything below is a sample.");
  });

  it("decline -> processing -> (0.6s) -> failed, labelled as a simulation", () => {
    const t = mount(QrTab);
    t.click("Pay with Paytm");
    t.click("Decline");
    vi.advanceTimersByTime(599);
    t.render();
    expect(t.heading()).toBe("Checking the payment");
    vi.advanceTimersByTime(1);
    t.render();
    expect(t.heading()).toBe("Simulated payment declined");
    expect(t.text()).toContain("No money moved.");
    expect(t.status()).toBe("Simulated payment was declined. No money moved.");
    expect(t.has("Try again")).toBe(true);
  });

  it("reset from success and from failed returns to checkout, and the next run works", () => {
    const t = mount(QrTab);
    t.click("Pay with Google Pay");
    t.click("Approve payment");
    vi.advanceTimersByTime(1200);
    t.render();
    t.click("Run it again");
    expect(t.heading()).toBe("Pay by UPI");
    expect(t.stageClass()).toBe("enter");
    t.click("Simulate scanning the QR");
    t.click("Decline");
    vi.advanceTimersByTime(600);
    t.render();
    t.click("Try again");
    expect(t.heading()).toBe("Pay by UPI");
  });

  it("'Back to the QR' leaves the prompt without a result", () => {
    const t = mount(QrTab);
    t.click("Pay with Google Pay");
    t.click("Back to the QR");
    expect(t.heading()).toBe("Pay by UPI");
    vi.advanceTimersByTime(5000);
    t.render();
    expect(t.heading()).toBe("Pay by UPI");
  });

  it("a double click on Approve starts one processing step, not two", () => {
    const t = mount(QrTab);
    t.click("Pay with Google Pay");
    const approve = t.button("Approve payment");
    approve.props.onClick({});
    approve.props.onClick({});
    t.render();
    vi.advanceTimersByTime(1200);
    t.render();
    expect(t.heading()).toBe("Simulated payment of ₹1,180 succeeded");
  });

  it("leaving the tab mid-processing cancels the timer: nothing settles after unmount", () => {
    const t = mount(QrTab);
    t.click("Pay with Google Pay");
    t.click("Approve payment");
    unmount();
    const before = JSON.stringify(H.slots);
    vi.advanceTimersByTime(5000);
    expect(JSON.stringify(H.slots)).toBe(before);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps exactly one live timer while processing and none otherwise", () => {
    const t = mount(QrTab);
    expect(vi.getTimerCount()).toBe(0);
    t.click("Pay with Google Pay");
    expect(vi.getTimerCount()).toBe(0);
    t.click("Approve payment");
    expect(vi.getTimerCount()).toBe(1);
    t.render(); // an unrelated re-render does not restart or stack it
    t.render();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(1200);
    t.render();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("shows the session clock it is given", () => {
    const t = mount(QrTab, 61);
    expect(t.text()).toContain("Session ends in 01:01");
  });
});

describe("HostedTab: pay or cancel straight from the hosted page", () => {
  it("starts on the bank choice, with the first sample bank selected and in the pay button", () => {
    const t = mount(HostedTab);
    expect(t.heading()).toBe("Choose a sample bank");
    expect(t.has("Pay ₹1,180 with Sample Bank A")).toBe(true);
    expect(t.statusCount()).toBe(1);
    expect(t.status()).toBe("Simulated Easebuzz page: pick a sample bank.");
    expect(t.focus).not.toHaveBeenCalled();
  });

  it("picking a bank updates the pay button", () => {
    const t = mount(HostedTab);
    const radios = t.nodes().filter((n) => n.tag === "input" && n.props.type === "radio");
    expect(radios).toHaveLength(4);
    radios[2].props.onChange({});
    t.render();
    expect(t.has("Pay ₹1,180 with Sample Bank C")).toBe(true);
    expect(t.nodes().filter((n) => n.tag === "input" && n.props.checked).map((n) => n.props.value)).toEqual(["Sample Bank C"]);
  });

  it("pay -> processing -> success (the return flow), focus on each heading", () => {
    const t = mount(HostedTab);
    t.click("Pay ₹1,180 with Sample Bank A");
    expect(t.heading()).toBe("Checking the payment");
    vi.advanceTimersByTime(1200);
    t.render();
    expect(t.heading()).toBe("Simulated payment of ₹1,180 succeeded");
    expect(t.text()).toContain("the learner returns to your site");
    expect(t.focus).toHaveBeenCalledTimes(2);
    t.click("Run it again");
    expect(t.heading()).toBe("Choose a sample bank");
  });

  it("cancel -> processing -> failed says cancelled, not declined", () => {
    const t = mount(HostedTab);
    t.click("Cancel payment");
    vi.advanceTimersByTime(600);
    t.render();
    expect(t.heading()).toBe("Simulated payment cancelled");
    expect(t.status()).toBe("Simulated payment was cancelled. No money moved.");
    expect(t.text()).toContain("cancelled on the hosted page");
    t.click("Try again");
    expect(t.heading()).toBe("Choose a sample bank");
  });
});
