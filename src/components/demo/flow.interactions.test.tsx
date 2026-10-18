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
  const useSyncExternalStore = (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot();
  const stubs = { useState, useRef, useEffect, useCallback, useId, useSyncExternalStore };
  return { ...actual, default: { ...actual, ...stubs }, ...stubs };
});

import { DEMO_INVOICE_NO } from "@/lib/demo-model";
import { createSessionClock } from "@/lib/session-clock";
import { Stage } from "./parts";
import { HostedTab } from "./HostedTab";
import { QrTab } from "./QrTab";
import { focusIsFree } from "./use-flow";

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
// Every text run of a subtree with a space between element boundaries, so "Learner (sample)" and its value read apart.
const spaced = (n: Node | string): string => (typeof n === "string" ? n : n.tag === "svg" ? "" : n.kids.map(spaced).join(" "));
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

// Stand-ins for the DOM: where focus is (document.activeElement), the demo root's contains(), the body.
const BODY = { name: "body" };
const INSIDE = { name: "a control inside the demo" };
const OUTSIDE = { name: "a link elsewhere on the page" };
const dom = { active: BODY as unknown };

function mount(
  component: (props: { clock: ReturnType<typeof createSessionClock>; scanPlayed: boolean; onScanPlayed: () => void }) => ReactNode,
  countdown = 892,
) {
  H.slots = [];
  H.fx = [];
  H.pending = [];
  dom.active = BODY;
  (globalThis as { document?: unknown }).document = {
    get activeElement() {
      return dom.active;
    },
    body: BODY,
  };
  let tree: Node[] = [];
  const focus = vi.fn();
  const heading$ = { focus };
  const clock = createSessionClock(countdown);
  const render = () => {
    H.i = 0;
    H.e = 0;
    H.pending = [];
    tree = all(expand(component({ clock, scanPlayed: false, onScanPlayed: () => {} }) as ReactNode));
    // Stand-in for the DOM node behind the heading's ref, so the focus effect has something to call.
    const heading = tree.find((n) => n.tag === "h3");
    const ref = heading?.props.ref as { current: unknown } | undefined;
    if (ref) ref.current = heading$;
    // The outermost element is the demo root; it answers contains() for the one control that counts as inside.
    const root = tree[0]?.props.ref as { current: unknown } | undefined;
    if (root) root.current = { contains: (n: unknown) => n === INSIDE || n === heading$ };
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
    full: () => spaced(tree[0]).replace(/\s+/g, " ").trim(),
    headingRef: () => tree.find((n) => n.tag === "h3")?.props.ref as { current: unknown } | undefined,
    statusProps: () => tree.find((n) => n.props.role === "status")!.props,
    stageClass: () => tree.find((n) => n.tag === "div" && (n.props.className === "enter" || n.props.className === undefined) && n.kids.length > 0 && all(n.kids).some((k) => k.tag === "h3"))?.props.className,
    link: () => tree.find((n) => n.tag === "Link"),
    nodes: () => tree,
    focusAt: (where: "body" | "inside" | "outside" | "heading") => {
      dom.active = where === "body" ? BODY : where === "inside" ? INSIDE : where === "heading" ? heading$ : OUTSIDE;
    },
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  unmount();
  delete (globalThis as { document?: unknown }).document;
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
    expect(t.heading()).toBe("Payment request in your UPI app");
    expect(t.status()).toBe("Simulated payment request in your UPI app for ₹1,180. Approve or decline.");
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

  it("the processing copy states the real delay: 1.2 seconds to approve, 0.6 to decline", () => {
    const ok = mount(QrTab);
    ok.click("Pay with Google Pay");
    ok.click("Approve payment");
    expect(ok.text()).toContain("about 1.2 seconds");
    unmount();
    const no = mount(QrTab);
    no.click("Pay with Google Pay");
    no.click("Decline");
    expect(no.text()).toContain("about 0.6 seconds");
    expect(no.text()).not.toContain("1.2");
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

describe("focus hand-off when the settle timer fires", () => {
  const toProcessing = () => {
    const t = mount(QrTab);
    t.click("Pay with Google Pay");
    t.click("Approve payment");
    expect(t.focus).toHaveBeenCalledTimes(2); // prompt, processing
    return t;
  };

  it("click-driven focus is a plain focus() call", () => {
    const t = mount(QrTab);
    t.click("Pay with PhonePe");
    expect(t.focus.mock.calls[0]).toEqual([]);
  });

  it("does not steal focus when the visitor has moved to something outside the demo", () => {
    const t = toProcessing();
    t.focusAt("outside");
    vi.advanceTimersByTime(1200);
    t.render();
    expect(t.heading()).toBe("Simulated payment of ₹1,180 succeeded"); // the step still settles
    expect(t.focus).toHaveBeenCalledTimes(2); // but nothing moved focus
  });

  it("moves focus, without scrolling, when focus is still on the processing heading, on the body, or inside the demo", () => {
    for (const where of ["heading", "body", "inside"] as const) {
      unmount();
      const t = toProcessing();
      t.focusAt(where);
      vi.advanceTimersByTime(1200);
      t.render();
      expect(t.focus, where).toHaveBeenCalledTimes(3);
      expect(t.focus.mock.calls[2], where).toEqual([{ preventScroll: true }]);
    }
  });

  it("the guard is for the timer only: a click after the visitor moved on still moves focus", () => {
    const t = mount(QrTab);
    t.focusAt("outside");
    t.click("Pay with Google Pay");
    expect(t.focus).toHaveBeenCalledTimes(1);
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

  it("Run it again and Try again put the bank back to the first sample bank", () => {
    const t = mount(HostedTab);
    const pick = (i: number) => {
      t.nodes().filter((n) => n.tag === "input" && n.props.type === "radio")[i].props.onChange({});
      t.render();
    };
    pick(2);
    t.click("Pay ₹1,180 with Sample Bank C");
    vi.advanceTimersByTime(1200);
    t.render();
    t.click("Run it again");
    expect(t.has("Pay ₹1,180 with Sample Bank A")).toBe(true);
    pick(3);
    t.click("Cancel payment");
    vi.advanceTimersByTime(600);
    t.render();
    t.click("Try again");
    expect(t.has("Pay ₹1,180 with Sample Bank A")).toBe(true);
  });

  it("the processing copy follows the outcome here too", () => {
    const t = mount(HostedTab);
    t.click("Cancel payment");
    expect(t.text()).toContain("about 0.6 seconds");
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

describe("every screen of both tabs: nothing a visitor could mistake for real", () => {
  type T = ReturnType<typeof mount>;
  const SAMPLE_EMAILS = new Set(["learner@demo.tysonpe.test", "creator@sample"]);
  const BANNED = ["HDFC", "SBI", "ICICI", "Axis", "Kotak", "50+", "RRN", "UTR", "ORD-", "EB_", "testimonial", "customers", "trusted", "guarantee", "100%", "T+", "instant settlement", "rated"];

  const QR_STEPS: Array<[string, (t: T) => void]> = [
    ["checkout", () => {}],
    ["phone prompt (app)", (t) => t.click("Pay with PhonePe")],
    ["phone prompt (scan)", (t) => t.click("Simulate scanning the QR")],
    ["processing (approve)", (t) => (t.click("Pay with Google Pay"), t.click("Approve payment"))],
    ["processing (decline)", (t) => (t.click("Pay with Google Pay"), t.click("Decline"))],
    ["success", (t) => (t.click("Pay with Google Pay"), t.click("Approve payment"), vi.advanceTimersByTime(1200), t.render())],
    ["failed", (t) => (t.click("Pay with Google Pay"), t.click("Decline"), vi.advanceTimersByTime(600), t.render())],
  ];
  const HOSTED_STEPS: Array<[string, (t: T) => void]> = [
    ["checkout", () => {}],
    ["processing (pay)", (t) => t.click("Pay ₹1,180 with Sample Bank A")],
    ["processing (cancel)", (t) => t.click("Cancel payment")],
    ["success", (t) => (t.click("Pay ₹1,180 with Sample Bank A"), vi.advanceTimersByTime(1200), t.render())],
    ["failed", (t) => (t.click("Cancel payment"), vi.advanceTimersByTime(600), t.render())],
  ];
  const cases = [
    ...QR_STEPS.map(([name, go]) => ["QrTab", name, QrTab, go] as const),
    ...HOSTED_STEPS.map(([name, go]) => ["HostedTab", name, HostedTab, go] as const),
  ];

  it.each(cases)("%s, %s: only the sample identities, amounts and invoice number; no banned claim; no exclamation mark", (_tab, _name, Tab, go) => {
    const t = mount(Tab);
    go(t);
    const text = t.full();
    const everything = `${text} ${t.status()}`;
    for (const email of everything.match(/[\w.+-]+@[\w.-]+/g) ?? []) expect(SAMPLE_EMAILS.has(email), email).toBe(true);
    for (const no of everything.match(/TP\/\d{4}-\d{2}\/\d+/g) ?? []) expect(no).toBe(DEMO_INVOICE_NO);
    for (const amount of everything.match(/₹\d[\d,]*(?:\.\d+)?/g) ?? []) expect(["₹1,180", "₹180"], amount).toContain(amount);
    for (const claim of BANNED) expect(everything, claim).not.toContain(claim);
    expect(everything).not.toContain("!");
    expect(everything.toLowerCase()).toMatch(/simulat|sample/);
  });

  it("the success screen shows the sample learner, the sample VPA stays on the prompt, and the invoice number is the model's", () => {
    const ok = mount(QrTab);
    QR_STEPS[5][1](ok);
    expect(ok.full()).toContain("Learner (sample)");
    expect(ok.full()).toContain("learner@demo.tysonpe.test");
    expect(ok.full()).toContain(`Tax invoice (sample) ${DEMO_INVOICE_NO}`);
    expect(ok.full()).toContain("Course access Added to the sample library");
    expect(DEMO_INVOICE_NO).toBe("TP/2026-27/00001");
    unmount();
    const prompt = mount(QrTab);
    QR_STEPS[1][1](prompt);
    expect(prompt.full()).toContain("Sample VPA: creator@sample");
    expect(prompt.full()).toContain("Test mode: no real money");
    expect(prompt.full()).toContain("Simulated phone");
  });

  it("success and failed say no money moved, on both surfaces, in the visible copy and the announcement", () => {
    for (const [Tab, steps] of [[QrTab, QR_STEPS], [HostedTab, HOSTED_STEPS]] as const) {
      for (const name of ["success", "failed"]) {
        unmount();
        const t = mount(Tab);
        steps.find(([n]) => n === name)![1](t);
        expect(t.status(), `${Tab.name} ${name} announcement`).toContain("No money moved.");
        if (name === "failed" || Tab === QrTab) expect(t.full().toLowerCase(), `${Tab.name} ${name} body`).toContain("no money moved");
      }
    }
  });

  it("the processing screen states the check is simulated, calls no gateway, and the delay matches the outcome", () => {
    for (const [Tab, approve, decline] of [
      [QrTab, QR_STEPS[3][1], QR_STEPS[4][1]],
      [HostedTab, HOSTED_STEPS[1][1], HOSTED_STEPS[2][1]],
    ] as const) {
      unmount();
      const ok = mount(Tab);
      approve(ok);
      expect(ok.full()).toContain("Simulated, about 1.2 seconds. No gateway is called.");
      unmount();
      const no = mount(Tab);
      decline(no);
      expect(no.full()).toContain("Simulated, about 0.6 seconds. No gateway is called.");
    }
  });

  it("the success footer link says it opens the full sandbox and goes to /demo; reset buttons say what they do", () => {
    const t = mount(QrTab);
    QR_STEPS[5][1](t);
    expect(t.link()?.props.href).toBe("/demo");
    expect(textOf(t.link()!)).toBe("Open the full sandbox");
    expect(t.has("Run it again")).toBe(true);
    unmount();
    const f = mount(QrTab);
    QR_STEPS[6][1](f);
    expect(f.link()).toBeUndefined(); // no sandbox upsell on the failed screen
    expect(f.has("Try again")).toBe(true);
  });
});

describe("step plumbing: status region, entering step, heading ref", () => {
  it("each tab has one status region: polite (role=status, no aria-live override), visually hidden, outside the animated step", () => {
    for (const Tab of [QrTab, HostedTab]) {
      unmount();
      const t = mount(Tab);
      const props = t.statusProps();
      expect(props.role).toBe("status");
      expect(props["aria-live"]).toBeUndefined();
      expect(props.className).toBe("sr-only"); // present for assistive tech, never drawn twice
      expect(t.statusCount()).toBe(1);
      // it is a direct child of the tab root, not inside the Stage that re-creates its children each step
      const root = t.nodes()[0];
      expect(root.kids.some((k) => typeof k !== "string" && k.props.role === "status")).toBe(true);
    }
  });

  it("the status region is one element that survives every step (same element, text changes)", () => {
    const t = mount(QrTab);
    const first = t.statusProps();
    t.click("Pay with Google Pay");
    expect(t.statusCount()).toBe(1);
    expect(t.statusProps().role).toBe(first.role);
    expect(t.status()).not.toBe("Simulated checkout: scan the sample QR or pick a UPI app.");
  });

  it("Stage keys its wrapper by step, so each step re-creates it and the enter animation restarts", () => {
    const a = Stage({ step: "checkout", touched: true, children: null }) as { key: string | null; props: P };
    const b = Stage({ step: "processing", touched: true, children: null }) as { key: string | null; props: P };
    expect(a.key).toBe("checkout");
    expect(b.key).toBe("processing");
    expect(a.props.className).toBe("enter");
    expect(Stage({ step: "checkout", touched: false, children: null }).props.className).toBeUndefined();
  });

  it("the heading carries the ref the step machine focuses, on every step of both tabs (not a stale ref from the last render)", () => {
    for (const Tab of [QrTab, HostedTab]) {
      unmount();
      const t = mount(Tab);
      const seen: unknown[] = [];
      const check = () => {
        const ref = t.headingRef();
        expect(ref, `${Tab.name}: ${t.heading()}`).toBeDefined();
        seen.push(ref);
      };
      check();
      if (Tab === QrTab) {
        t.click("Pay with Google Pay");
        check();
        t.click("Approve payment");
      } else {
        t.click("Pay ₹1,180 with Sample Bank A");
      }
      check();
      vi.advanceTimersByTime(1200);
      t.render();
      check();
      t.click("Run it again");
      check();
      expect(new Set(seen).size, "one ref object, handed to whichever heading is showing").toBe(1);
    }
  });

  it("the heading of every step is focusable by script only (tabIndex -1) and an h3", () => {
    const t = mount(QrTab);
    const h = () => t.nodes().find((n) => n.tag === "h3")!;
    expect(h().props.tabIndex).toBe(-1);
    t.click("Pay with Google Pay");
    expect(h().props.tabIndex).toBe(-1);
    t.click("Approve payment");
    expect(h().props.tabIndex).toBe(-1);
  });

  it("HostedTab opened on a clock at 0 prints 00:00, not a constant", () => {
    const t = mount(HostedTab, 0);
    expect(t.text()).toContain("Page expires in 00:00");
    unmount();
    const full = mount(HostedTab, 900);
    expect(full.text()).toContain("Page expires in 15:00");
  });
});

describe("focusIsFree: may a timer-driven focus move happen?", () => {
  // Distinct objects, so an `===` slip between any two of them shows up.
  const body = { name: "body" };
  const inside = { name: "a control inside the demo" };
  const outside = { name: "a link in the page nav" };
  const root = { contains: (node: unknown) => node === inside };

  it("is free when focus is nowhere or on the body (the old step's controls were just removed)", () => {
    expect(focusIsFree(null, { root, body })).toBe(true);
    expect(focusIsFree(undefined, { root, body })).toBe(true);
    expect(focusIsFree(body, { root, body })).toBe(true);
  });

  it("is free when focus is anywhere inside the demo root", () => {
    expect(focusIsFree(inside, { root, body })).toBe(true);
  });

  it("is not free when focus is on something outside the demo: the visitor's own place is left alone", () => {
    expect(focusIsFree(outside, { root, body })).toBe(false);
  });

  it("is not free for an outside element even when the demo root is not attached yet", () => {
    expect(focusIsFree(outside, { root: null, body })).toBe(false);
    expect(focusIsFree(body, { root: null, body })).toBe(true);
  });

  it("only the body counts as the body: another element is not free just because it is not null", () => {
    expect(focusIsFree(outside, { root, body: inside })).toBe(false);
    expect(focusIsFree(0, { root, body })).toBe(false);
    expect(focusIsFree("", { root, body })).toBe(false);
  });
});
