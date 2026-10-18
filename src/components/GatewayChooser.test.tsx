// Drives GatewayChooser's state. The repo has no DOM runner, so useState is replaced with a tiny synchronous store:
// GatewayChooser() is called as a plain function, the returned tree is walked, and a radio's onChange is invoked the
// way React would. The page-level markup (one radio group, "Current", no key) is pinned in src/app/demo-page.test.tsx.
//
// WHAT THIS CANNOT PROVE (needs a real browser): that focus survives the post-save re-render. What it does prove is the
// precondition: the component keeps its own state across a new `selected` prop and the page puts no `key` on it.
import { isValidElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const H = vi.hoisted(() => ({
  slots: [] as unknown[],
  i: 0,
  /** Effects queued by the latest render, with the deps recorded for each effect slot. */
  queue: [] as Array<() => void>,
  deps: [] as unknown[][],
  /** What the container ref points at (the test plays the DOM). */
  ref: { current: null as unknown },
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
  const useRef = () => H.ref;
  const useEffect = (fn: () => void, deps?: unknown[]) => {
    const idx = H.i++;
    const prev = H.deps[idx];
    const changed = !prev || !deps || deps.some((d, k) => !Object.is(d, prev[k]));
    H.deps[idx] = deps ?? [];
    if (changed) H.queue.push(fn);
  };
  return { ...actual, default: { ...actual, useState, useRef, useEffect }, useState, useRef, useEffect };
});

import { RadioCard } from "./form";
import { GatewayChooser, SAVED_FLAG } from "./GatewayChooser";

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
  H.deps = [];
  H.queue = [];
  let sel = selected;
  const render = () => {
    H.i = 0;
    H.queue = [];
    const tree = GatewayChooser({ options: OPTIONS, selected: sel, labelledBy: "h" });
    const els = walk(tree);
    const cards = els.filter((e) => e.type === RadioCard);
    return {
      /** Runs the effects the render queued, as React does after commit. */
      commit: () => H.queue.splice(0).forEach((fn) => fn()),
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
const store = new Map<string, string>();
const focused: string[] = [];
const queries: string[] = [];
beforeEach(() => {
  submitted.length = 0;
  store.clear();
  focused.length = 0;
  queries.length = 0;
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  H.ref.current = {
    querySelector: (q: string) => {
      queries.push(q);
      const v = /value="([^"]+)"/.exec(q)?.[1] ?? "";
      return { focus: () => void focused.push(v) };
    },
  };
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

describe("GatewayChooser: the save remounts the page, so the choice crosses in sessionStorage", () => {
  it("onChoose writes the gateway id to the flag", () => {
    const m = mount("razorpay");
    m.render().choose("easebuzz");
    expect(store.get(SAVED_FLAG)).toBe("easebuzz");
    expect(SAVED_FLAG).toBe("tysonpe:gateway-saved");
  });

  it("a flag present at mount focuses that radio, clears the flag and shows the confirmation", () => {
    store.set(SAVED_FLAG, "easebuzz");
    const m = mount("easebuzz"); // the new instance renders on the saved value
    const first = m.render();
    expect(first.status.props.children).toBe(""); // set after mount, so it is announced
    first.commit();
    expect(focused).toEqual(["easebuzz"]);
    expect(queries).toEqual(['input[name="gateway"][value="easebuzz"]']);
    expect(store.has(SAVED_FLAG)).toBe(false);
    const after = m.render();
    after.commit();
    expect(after.status.props.children).toBe("Saved: Easebuzz is your gateway");
    expect(after.checked).toEqual([false, true]);
  });

  it("does not confirm a flag that does not match the saved value (the save did not land)", () => {
    store.set(SAVED_FLAG, "easebuzz");
    const m = mount("razorpay");
    m.render().commit();
    const after = m.render();
    expect(after.status.props.children).toBe("");
  });

  it("ignores and clears a flag for an unknown gateway", () => {
    store.set(SAVED_FLAG, "paytm");
    const m = mount("razorpay");
    m.render().commit();
    expect(focused).toEqual([]);
    expect(store.has(SAVED_FLAG)).toBe(false);
    expect(m.render().status.props.children).toBe("");
  });

  it("does not steal focus on a normal first mount (no flag)", () => {
    const m = mount("razorpay");
    m.render().commit();
    m.render().commit();
    expect(focused).toEqual([]);
    expect(queries).toEqual([]);
  });

  it("reads the flag once, on mount only", () => {
    const m = mount("razorpay");
    m.render().commit();
    store.set(SAVED_FLAG, "easebuzz"); // written later by something else
    m.render().commit();
    expect(focused).toEqual([]);
    expect(store.get(SAVED_FLAG)).toBe("easebuzz");
  });

  it("without a remount, confirming the save spends the flag so it cannot steal focus on a later visit", () => {
    const m = mount("razorpay");
    m.render().choose("easebuzz");
    expect(store.get(SAVED_FLAG)).toBe("easebuzz");
    m.render().commit(); // still waiting for the server
    expect(store.get(SAVED_FLAG)).toBe("easebuzz");
    m.setSelected("easebuzz");
    m.render().commit();
    expect(store.has(SAVED_FLAG)).toBe(false);
  });

  it("survives sessionStorage throwing on read, on write and on clear", () => {
    const boom = () => {
      throw new Error("SecurityError");
    };
    vi.stubGlobal("sessionStorage", { getItem: boom, setItem: boom, removeItem: boom });
    const m = mount("razorpay");
    expect(() => m.render().commit()).not.toThrow();
    expect(() => m.render().choose("easebuzz")).not.toThrow();
    expect(submitted).toEqual(["gateway-form-easebuzz"]); // the save still goes ahead
    m.setSelected("easebuzz");
    let r!: ReturnType<typeof m.render>;
    expect(() => (r = m.render())).not.toThrow();
    expect(() => r.commit()).not.toThrow();
    expect(m.render().status.props.children).toBe("Saved: Easebuzz is your gateway");
  });

  it("survives sessionStorage being absent", () => {
    vi.stubGlobal("sessionStorage", undefined);
    const m = mount("razorpay");
    expect(() => m.render().commit()).not.toThrow();
    expect(() => m.render().choose("easebuzz")).not.toThrow();
  });
});
