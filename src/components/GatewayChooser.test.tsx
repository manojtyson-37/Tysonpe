// Drives GatewayChooser's state. The repo has no DOM runner, so useState is replaced with a tiny synchronous store:
// GatewayChooser() is called as a plain function, the returned tree is walked, and a radio's onChange is invoked the
// way React would. The page-level markup (one radio group, "Current", no key) is pinned in src/app/demo-page.test.tsx.
//
// WHAT THIS CANNOT PROVE (needs a real browser): that focus survives the post-save re-render. What it does prove is the
// precondition: the component keeps its own state across a new `selected` prop and the page puts no `key` on it.
import { isValidElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const H = vi.hoisted(() => ({ slots: [] as unknown[], i: 0 }));
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
  return { ...actual, default: { ...actual, useState }, useState };
});

import { RadioCard } from "./form";
import { GatewayChooser } from "./GatewayChooser";

type P = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type El = { type: unknown; props: P };

function walk(node: ReactNode, out: El[] = []): El[] {
  if (Array.isArray(node)) node.forEach((c) => walk(c, out));
  else if (isValidElement(node)) {
    const props = node.props as P;
    out.push({ type: node.type, props });
    walk(props.children, out);
    if (props.trailing) walk(props.trailing, out);
  }
  return out;
}

const OPTIONS = [
  { id: "razorpay", name: "Razorpay", blurb: "b1", fact: "f1" },
  { id: "easebuzz", name: "Easebuzz", blurb: "b2", fact: "f2" },
];

function mount(selected: string) {
  H.slots = [];
  let sel = selected;
  const render = () => {
    H.i = 0;
    const tree = GatewayChooser({ options: OPTIONS, selected: sel, labelledBy: "h" });
    const els = walk(tree);
    const cards = els.filter((e) => e.type === RadioCard);
    return {
      checked: cards.map((c) => c.props.checked as boolean),
      current: cards.map((c) => (c.props.trailing ? walk(c.props.trailing).length > 0 : false)),
      status: els.find((e) => e.props.role === "status")!,
      choose: (id: string, checked = true) =>
        cards.find((c) => c.props.value === id)!.props.onChange({ currentTarget: { checked, value: id } }),
    };
  };
  return { render, setSelected: (v: string) => void (sel = v) };
}

const submitted: string[] = [];
beforeEach(() => {
  submitted.length = 0;
  vi.stubGlobal("document", { getElementById: (id: string) => ({ requestSubmit: () => void submitted.push(id) }) });
});
afterEach(() => vi.unstubAllGlobals());

describe("GatewayChooser: the status region", () => {
  it("is in the DOM from the first render, polite, and empty", () => {
    const { render } = mount("razorpay");
    const { status } = render();
    expect(status.type).toBe("p");
    expect(status.props.role).toBe("status");
    expect(status.props["aria-live"]).toBe("polite");
    expect(status.props.children).toBe("");
  });

  it("stays empty until the save lands, then names the gateway, and the radios stay on the user's pick meanwhile", () => {
    const m = mount("razorpay");
    m.render().choose("easebuzz");
    expect(submitted).toEqual(["gateway-form-easebuzz"]);
    const pending = m.render();
    expect(pending.status.props.children).toBe(""); // selected prop is still Razorpay
    expect(pending.checked).toEqual([false, true]);
    expect(pending.current).toEqual([true, false]);
    m.setSelected("easebuzz"); // the server re-rendered the page on the new choice
    const saved = m.render();
    expect(saved.status.props.children).toBe("Saved: Easebuzz is your gateway");
    expect(saved.checked).toEqual([false, true]);
    expect(saved.current).toEqual([false, true]);
  });

  it("announces again for a later choice, with that gateway's name", () => {
    const m = mount("razorpay");
    m.render().choose("easebuzz");
    m.setSelected("easebuzz");
    expect(m.render().status.props.children).toBe("Saved: Easebuzz is your gateway");
    m.render().choose("razorpay");
    expect(m.render().status.props.children).toBe("");
    m.setSelected("razorpay");
    expect(m.render().status.props.children).toBe("Saved: Razorpay is your gateway");
  });

  it("says nothing when the saved choice changes without the user choosing (nothing to confirm)", () => {
    const m = mount("razorpay");
    m.setSelected("easebuzz");
    const r = m.render();
    expect(r.status.props.children).toBe("");
    // and the radios and "Current" follow the server value without a remount
    expect(r.checked).toEqual([false, true]);
    expect(r.current).toEqual([false, true]);
  });

  it("follows the server back when the saved choice changes elsewhere after the user's own save", () => {
    const m = mount("razorpay");
    m.render().choose("easebuzz");
    m.setSelected("easebuzz");
    m.render();
    m.setSelected("razorpay");
    const r = m.render();
    expect(r.checked).toEqual([true, false]);
    expect(r.current).toEqual([true, false]);
    expect(r.status.props.children).toBe("");
  });
});

describe("GatewayChooser: choosing a radio submits the matching form", () => {
  it("looks up and submits gateway-form-<value> when a radio becomes checked", () => {
    const m = mount("razorpay");
    m.render().choose("easebuzz");
    m.render().choose("razorpay");
    expect(submitted).toEqual(["gateway-form-easebuzz", "gateway-form-razorpay"]);
  });

  it("does nothing when the event is not a check", () => {
    const m = mount("razorpay");
    m.render().choose("easebuzz", false);
    expect(submitted).toEqual([]);
    expect(m.render().checked).toEqual([true, false]);
  });

  it("tolerates a missing form", () => {
    vi.stubGlobal("document", { getElementById: () => null });
    const m = mount("razorpay");
    expect(() => m.render().choose("easebuzz")).not.toThrow();
  });

  it("is a controlled group (checked, not defaultChecked) so the radios can follow the server", () => {
    mount("razorpay");
    H.i = 0;
    const tree = GatewayChooser({ options: OPTIONS, selected: "razorpay", labelledBy: "h" });
    const cards = walk(tree).filter((e) => e.type === RadioCard);
    for (const c of cards) {
      expect("checked" in c.props).toBe(true);
      expect("defaultChecked" in c.props).toBe(false);
    }
  });
});
