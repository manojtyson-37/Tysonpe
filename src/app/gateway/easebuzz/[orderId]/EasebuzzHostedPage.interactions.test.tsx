// The Easebuzz page's behaviour is state and a timer: the picked outcome, the countdown, the announcements. The repo has no
// DOM runner, so (as CouponForm.interactions.test.tsx does) useState is a tiny synchronous store, useEffect runs its effect
// at once on every render (cleaning up the previous run first, as React does when a dependency changes), and the component
// is called as a plain function; the element tree is walked and its handlers called under fake timers. WHAT THIS CANNOT
// PROVE: that React re-renders after setState (the test re-renders by hand), or that a screen reader speaks the status
// line; those need a real browser and assistive tech.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const H = vi.hoisted(() => ({
  slots: [] as unknown[],
  i: 0,
  effects: [] as { cleanup?: () => void }[],
  e: 0,
  settle: (async () => undefined) as (...a: unknown[]) => Promise<unknown>,
}));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const useState = (init: unknown) => {
    const idx = H.i++;
    if (!(idx in H.slots)) H.slots[idx] = init;
    const set = (v: unknown) => {
      H.slots[idx] = typeof v === "function" ? (v as (p: unknown) => unknown)(H.slots[idx]) : v;
    };
    return [H.slots[idx], set];
  };
  const useEffect = (fn: () => void | (() => void)) => {
    const slot = (H.effects[H.e] ??= {});
    slot.cleanup?.();
    slot.cleanup = fn() ?? undefined;
    H.e++;
  };
  return { ...actual, default: { ...actual, useState, useEffect }, useState, useEffect };
});
vi.mock("@/app/actions/checkout", () => ({
  // `.bind` is called at render, so the mock must be a real function that forwards to the current H.settle.
  settleEasebuzzDemoAction: function settle(...a: unknown[]) {
    return H.settle(...a);
  },
}));

import { EasebuzzHostedPage } from "./EasebuzzHostedPage";
import { allElements, textOf } from "@/test/gateway-skin";

type P = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type El = { type: unknown; props: P };

const order = { id: "ord_9", providerOrderId: "EB-1", totalPaise: 118000, product: { title: "Pricing Workshop" } };
const user = { name: "Ravi Menon", email: "ravi@example.com" };

function render(): El[] {
  H.i = 0;
  H.e = 0;
  const root = EasebuzzHostedPage({ order, user }) as unknown as El;
  return [root, ...allElements(root.props.children)];
}
const byType = (els: El[], t: string) => els.filter((e) => e.type === t);
const timer = (els: El[]) => byType(els, "span").find((e) => e.props.role === "timer")!;
const notice = (els: El[]) => textOf(byType(els, "p").find((e) => e.props.role === "status")!.props.children);
const outcomeRadio = (els: El[], value: string) => byType(els, "input").find((e) => e.props.name === "eb-outcome" && e.props.value === value)!;
const forms = (els: El[]) => byType(els, "form");

beforeEach(() => {
  vi.useFakeTimers();
  H.slots = [];
  H.effects = [];
  H.i = 0;
  H.e = 0;
  H.settle = vi.fn(async () => undefined);
});
afterEach(() => {
  H.effects.forEach((e) => e.cleanup?.());
  vi.useRealTimers();
});

/** Lets one second of the page's clock pass, then renders again (what React does after setState). */
function tick(): El[] {
  vi.advanceTimersByTime(1000);
  return render();
}

describe("the 15-minute clock", () => {
  it("counts down one second at a time from 15:00, digits only", () => {
    let els = render();
    expect(textOf(timer(els).props.children)).toBe("15:00");
    els = tick();
    expect(textOf(timer(els).props.children)).toBe("14:59");
    for (let i = 0; i < 59; i++) els = tick();
    expect(textOf(timer(els).props.children)).toBe("14:00");
  });

  it("stops at 00:00, disables Pay, and does not go negative", () => {
    let els = render();
    for (let i = 0; i < 905; i++) els = tick();
    expect(textOf(timer(els).props.children)).toBe("00:00");
    const pay = byType(els, "button").find((e) => e.props.type === "submit" && textOf(e.props.children).includes("Pay"))!;
    expect(pay.props.disabled).toBe(true);
  });

  it("turns to the error colour variable in the last two minutes, and not before", () => {
    let els = render();
    for (let i = 0; i < 780; i++) els = tick(); // 13:00 gone, 02:00 left
    expect(timer(els).props.className).not.toContain("--skin-bad");
    els = tick(); // 01:59
    expect(timer(els).props.className).toContain("text-(--skin-bad)");
  });

  it("does not announce each second: the timer carries no live region, only the separate status line does", () => {
    const els = render();
    const t = timer(els).props;
    expect(t["aria-live"]).toBeUndefined();
    expect(t["aria-atomic"]).toBeUndefined();
    expect(t.role).toBe("timer");
    const live = els.filter((e) => e.props["aria-live"] !== undefined);
    expect(live).toHaveLength(0);
  });

  it("the status line is empty at first and its text changes only at 5:00, 1:00 and 0:00", () => {
    let els = render();
    expect(notice(els)).toBe("");
    const seen: { left: number; text: string }[] = [];
    let previous = notice(els);
    for (let left = 899; left >= 0; left--) {
      els = tick();
      const text = notice(els);
      if (text !== previous) seen.push({ left, text });
      previous = text;
    }
    expect(seen.map((s) => s.left)).toEqual([300, 60, 0]);
    expect(seen[0].text).toMatch(/5 minutes/);
    expect(seen[1].text).toMatch(/1 minute/);
    expect(seen[2].text).toMatch(/Time is up/);
  });
});

describe("outcomes and the settle action", () => {
  async function submitPayForm(els: El[]) {
    const done = forms(els)[0].props.action();
    await vi.advanceTimersByTimeAsync(2000);
    await done;
  }

  it("settles with success by default", async () => {
    await submitPayForm(render());
    expect(H.settle).toHaveBeenCalledTimes(1);
    expect(H.settle).toHaveBeenCalledWith("ord_9", "success");
  });

  it.each(["failure", "cancel"])("settles with %s after that radio is picked", async (value) => {
    outcomeRadio(render(), value).props.onChange();
    const els = render();
    expect(outcomeRadio(els, value).props.checked).toBe(true);
    expect(outcomeRadio(els, "success").props.checked).toBe(false);
    await submitPayForm(els);
    expect(H.settle).toHaveBeenCalledWith("ord_9", value);
  });

  it("the cancel form is bound to cancel with this order, whatever outcome is picked", async () => {
    outcomeRadio(render(), "failure").props.onChange();
    const cancelForm = forms(render())[1];
    await cancelForm.props.action();
    expect(H.settle).toHaveBeenCalledTimes(1);
    expect(H.settle).toHaveBeenCalledWith("ord_9", "cancel");
  });

  it("shows the processing view, with a polite status, while the payment is being settled", async () => {
    const done = forms(render())[0].props.action();
    await vi.advanceTimersByTimeAsync(10);
    const els = render();
    expect(forms(els)).toHaveLength(0);
    expect(byType(els, "div").some((e) => e.props.role === "status")).toBe(true);
    await vi.advanceTimersByTimeAsync(2000);
    await done;
  });
});

describe("the method switcher is keyboard-operable by construction", () => {
  it("every choice is a native button reporting aria-pressed, and picking one moves the pressed state", () => {
    const names = ["UPI / QR", "Cards", "Net Banking", "Wallets"];
    const tabs = (els: El[]) => byType(els, "button").filter((e) => names.includes(textOf(e.props.children)));
    expect(tabs(render()).map((t) => t.props["aria-pressed"])).toEqual([true, false, false, false]);
    for (const t of tabs(render())) expect(t.props.type).toBe("button");
    tabs(render())[1].props.onClick();
    expect(tabs(render()).map((t) => t.props["aria-pressed"])).toEqual([false, true, false, false]);
  });

  it("the card fields carry autocomplete tokens and a numeric keyboard, with labels bound by id", () => {
    byType(render(), "button")
      .find((e) => textOf(e.props.children) === "Cards")!
      .props.onClick();
    const els = render();
    const input = (id: string) => byType(els, "input").find((e) => e.props.id === id)!.props;
    expect(input("eb-card-num")).toMatchObject({ autoComplete: "cc-number", inputMode: "numeric" });
    expect(input("eb-card-exp")).toMatchObject({ autoComplete: "cc-exp", inputMode: "numeric" });
    expect(input("eb-card-cvv")).toMatchObject({ autoComplete: "cc-csc", inputMode: "numeric", type: "password" });
    expect(input("eb-card-holder")).toMatchObject({ autoComplete: "cc-name", defaultValue: "Ravi Menon" });
    const labelFor = byType(els, "label").map((l) => l.props.htmlFor);
    for (const id of ["eb-card-num", "eb-card-exp", "eb-card-cvv", "eb-card-holder"]) expect(labelFor).toContain(id);
  });
});
