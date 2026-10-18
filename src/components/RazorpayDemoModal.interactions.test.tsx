// The Razorpay modal's behaviour is state: which outcome is picked, whether a payment is being settled, what Dialog may
// dismiss. The repo has no DOM runner, so (as CouponForm.interactions.test.tsx does) useState is a tiny synchronous
// store, useEffect/useRef are stand-ins, and the component is called as a plain function; the element tree it returns is
// walked and its handlers are called. WHAT THIS CANNOT PROVE: that React re-renders after setState, that Escape reaches
// Dialog's document listener, or that focus moves; the first is a stub, the others need a real browser.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const H = vi.hoisted(() => ({
  slots: [] as unknown[],
  i: 0,
  push: (() => {}) as (...a: unknown[]) => unknown,
  settle: (async () => ({})) as (...a: unknown[]) => Promise<unknown>,
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
  const useEffect = () => {};
  const useRef = (v: unknown) => ({ current: v });
  return { ...actual, default: { ...actual, useState, useEffect, useRef }, useState, useEffect, useRef };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: (to: string) => H.push(to) }) }));
vi.mock("@/app/actions/checkout", () => ({ settleDemoAction: (...a: unknown[]) => H.settle(...a) }));

import { RazorpayDemoModal, type RazorpayDemoModalProps } from "./RazorpayDemoModal";
import { allElements, textOf } from "@/test/gateway-skin";

type P = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const onClose = vi.fn();
const base: RazorpayDemoModalProps = {
  isOpen: true,
  onClose,
  orderId: "ord_42",
  amountPaise: 49900,
  productTitle: "Course",
  buyer: { name: "Asha", email: "a@b.c" },
};

/** Render once with the current slots; returns the Dialog props and its content elements. */
function render(props: RazorpayDemoModalProps = base) {
  H.i = 0;
  const root = RazorpayDemoModal(props) as unknown as { props: P };
  return { dialog: root.props, els: allElements(root.props.children) as { type: unknown; props: P }[] };
}
const byType = (els: { type: unknown; props: P }[], t: string) => els.filter((e) => e.type === t);
const radio = (els: ReturnType<typeof render>["els"], value: string) =>
  byType(els, "input").find((e) => e.props.name === "rzp-outcome" && e.props.value === value)!;
const payButton = (els: ReturnType<typeof render>["els"]) =>
  byType(els, "button").find((e) => textOf(e.props.children).includes("Pay ₹"))!;
const closeButton = (els: ReturnType<typeof render>["els"]) =>
  byType(els, "button").find((e) => e.props["aria-label"] === "Close payment modal");

beforeEach(() => {
  vi.useFakeTimers();
  H.slots = [];
  H.i = 0;
  H.push = vi.fn();
  H.settle = vi.fn(async () => ({ ok: true, to: "/checkout/success/ord_42" }));
  onClose.mockClear();
});
afterEach(() => vi.useRealTimers());

/** Runs a pay click to the end of the simulated delays. */
async function pay(els: ReturnType<typeof render>["els"]) {
  const done = payButton(els).props.onClick();
  await vi.advanceTimersByTimeAsync(5000);
  await done;
}

describe("outcome choice reaches the settle action", () => {
  it("settles with success by default", async () => {
    await pay(render().els);
    expect(H.settle).toHaveBeenCalledTimes(1);
    expect(H.settle).toHaveBeenCalledWith("ord_42", "success");
  });

  it("settles with failure after the decline radio is picked", async () => {
    radio(render().els, "failure").props.onChange();
    const { els } = render();
    expect(radio(els, "failure").props.checked).toBe(true);
    expect(radio(els, "success").props.checked).toBe(false);
    await pay(els);
    expect(H.settle).toHaveBeenCalledWith("ord_42", "failure");
  });

  it("picking success again after decline settles with success", async () => {
    radio(render().els, "failure").props.onChange();
    radio(render().els, "success").props.onChange();
    await pay(render().els);
    expect(H.settle).toHaveBeenCalledWith("ord_42", "success");
  });

  it("follows the buyer to the page the action names after an approved payment", async () => {
    await pay(render().els);
    expect(H.push).toHaveBeenCalledWith("/checkout/success/ord_42");
  });

  it("a chosen decline shows the declined screen, never success, then still follows the action's page", async () => {
    H.settle = vi.fn(async () => ({ ok: true, to: "/checkout/pay/ord_42?failed=1" }));
    radio(render().els, "failure").props.onChange();
    const done = payButton(render().els).props.onClick();
    await vi.advanceTimersByTimeAsync(1400); // past both simulated delays, before the redirect delay ends
    const mid = render();
    const text = textOf(mid.els.map((e) => e.props.children));
    expect(text).toContain("Payment declined");
    expect(text).toContain("Do Not Honor");
    expect(text).not.toMatch(/successful|approved|Enrolling/i);
    expect(byType(mid.els, "div").some((e) => e.props.role === "alert")).toBe(true);
    await vi.advanceTimersByTimeAsync(5000);
    await done;
    expect(H.settle).toHaveBeenCalledWith("ord_42", "failure");
    expect(H.push).toHaveBeenCalledWith("/checkout/pay/ord_42?failed=1");
    expect(textOf(render().els.map((e) => e.props.children))).not.toMatch(/successful/i);
  });

  it("a chosen success with an ok answer shows the success screen", async () => {
    const done = payButton(render().els).props.onClick();
    await vi.advanceTimersByTimeAsync(1400);
    const text = textOf(render().els.map((e) => e.props.children));
    expect(text).toContain("Payment successful");
    expect(text).not.toContain("declined");
    await vi.advanceTimersByTimeAsync(5000);
    await done;
  });

  it("shows the decline reason and offers Try again, which returns to the form, when the action refuses", async () => {
    H.settle = vi.fn(async () => ({ ok: false, error: "Card declined by the simulated bank." }));
    await pay(render().els);
    const failed = render();
    expect(H.push).not.toHaveBeenCalled();
    const alert = byType(failed.els, "div").find((e) => e.props.role === "alert")!;
    expect(textOf(alert.props.children)).toContain("Card declined by the simulated bank.");
    const retry = byType(failed.els, "button").find((e) => textOf(e.props.children) === "Try again")!;
    retry.props.onClick();
    expect(payButton(render().els)).toBeDefined();
  });

  it("falls back to the stock decline text when the action gives none, and to a network message when it throws", async () => {
    H.settle = vi.fn(async () => ({ ok: false }));
    await pay(render().els);
    expect(textOf(render().els.map((e) => e.props.children))).toContain("Do Not Honor");
    H.slots = [];
    H.settle = vi.fn(async () => {
      throw new Error("boom");
    });
    await pay(render().els);
    expect(textOf(render().els.map((e) => e.props.children))).toContain("network error");
  });
});

describe("closing is blocked while the payment is being settled", () => {
  it("passes the owner's onClose to Dialog while idle, and the close button calls it", () => {
    const { dialog, els } = render();
    expect(dialog.onClose).toBe(onClose);
    closeButton(els)!.props.onClick();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("while processing, Dialog's onClose (Escape and backdrop) does nothing and the close button is gone", async () => {
    const started = payButton(render().els).props.onClick();
    await vi.advanceTimersByTimeAsync(10); // inside the first 650ms delay
    const during = render();
    expect(during.dialog.onClose).not.toBe(onClose);
    during.dialog.onClose();
    expect(onClose).not.toHaveBeenCalled();
    expect(closeButton(during.els)).toBeUndefined();
    expect(byType(during.els, "div").some((e) => e.props.role === "status")).toBe(true);
    await vi.advanceTimersByTimeAsync(5000);
    await started;
  });

  it("once settled (success or failure) Dialog can dismiss again", async () => {
    H.settle = vi.fn(async () => ({ ok: false, error: "x" }));
    await pay(render().els);
    const after = render();
    expect(after.dialog.onClose).toBe(onClose);
    expect(closeButton(after.els)).toBeDefined();
  });
});

describe("the card fields", () => {
  it("carry autocomplete tokens and a numeric keyboard, with labels bound by id", () => {
    byType(render().els, "button")
      .find((e) => textOf(e.props.children).includes("Card"))!
      .props.onClick();
    const { els } = render();
    const inputs = byType(els, "input");
    const by = (id: string) => inputs.find((e) => e.props.id === id)!.props;
    expect(by("rzp-card-num")).toMatchObject({ autoComplete: "cc-number", inputMode: "numeric" });
    expect(by("rzp-card-exp")).toMatchObject({ autoComplete: "cc-exp", inputMode: "numeric" });
    expect(by("rzp-card-cvv")).toMatchObject({ autoComplete: "cc-csc", inputMode: "numeric", type: "password" });
    expect(by("rzp-card-name")).toMatchObject({ autoComplete: "cc-name", value: "Asha" });
    const labelFor = byType(els, "label").map((l) => l.props.htmlFor);
    for (const id of ["rzp-card-num", "rzp-card-exp", "rzp-card-cvv", "rzp-card-name"]) expect(labelFor).toContain(id);
  });

  it("the UPI ID field turns off autofill and asks for the email keyboard", () => {
    byType(render().els, "button")
      .find((e) => textOf(e.props.children) === "UPI ID")!
      .props.onClick();
    const vpa = byType(render().els, "input").find((e) => e.props.id === "rzp-upi-id")!;
    expect(vpa.props).toMatchObject({ autoComplete: "off", inputMode: "email" });
  });
});

describe("the method switcher is keyboard-operable by construction", () => {
  it("every choice is a native button (type=button) reporting aria-pressed, and picking one moves the pressed state", () => {
    const first = render();
    const tabs = byType(first.els, "button").filter((e) => ["UPI / QR", "Card", "Netbanking", "Wallet"].includes(textOf(e.props.children)));
    expect(tabs).toHaveLength(4);
    for (const t of tabs) expect(t.props.type).toBe("button");
    expect(tabs.map((t) => t.props["aria-pressed"])).toEqual([true, false, false, false]);
    tabs[2].props.onClick();
    const after = byType(render().els, "button").filter((e) => ["UPI / QR", "Card", "Netbanking", "Wallet"].includes(textOf(e.props.children)));
    expect(after.map((t) => t.props["aria-pressed"])).toEqual([false, false, true, false]);
  });
});
