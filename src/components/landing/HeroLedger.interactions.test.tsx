// Drives HeroLedger's handlers with the same synchronous hook store QuizEditor.interactions.test.tsx uses: the component is
// called as a plain function, the returned tree is walked, and a control's onChange is invoked as React would invoke it.
//
// WHAT THIS CANNOT PROVE (needs a real React runtime, i.e. a browser):
// - that a real keystroke reaches onChange, that the browser keeps the caret in place while the value is rewritten
//   (digits-only sanitising), that a screen reader announces the <output> change once, or the focus ring on the controls;
// - batching of several setState calls in one event (each handler here sets exactly one value).
import { isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const H = vi.hoisted(() => ({ slots: [] as unknown[], i: 0, effects: [] as Array<() => void> }));
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
  const useEffect = (fn: () => void) => {
    H.effects.push(fn);
  };
  const useId = () => ":r0:";
  return { ...actual, default: { ...actual, useState, useEffect, useId }, useState, useEffect, useId };
});

import { GST_RATES } from "@/lib/validation";
import { MAX_PRICE_DIGITS, PLAN_OPTIONS } from "@/lib/landing-ledger";
import { HeroLedger } from "./HeroLedger";

type P = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type El = { type: unknown; props: P };

function walk(node: ReactNode, out: El[] = []): El[] {
  if (Array.isArray(node)) {
    node.forEach((c) => walk(c, out));
    return out;
  }
  if (!isValidElement(node)) return out;
  const props = node.props as P;
  out.push({ type: node.type, props });
  walk(props.children, out);
  return out;
}

function mount(gstRates: readonly number[] = GST_RATES) {
  H.slots = [];
  H.effects = [];
  let tree: ReactNode;
  const render = () => {
    H.i = 0;
    H.effects = [];
    tree = HeroLedger({ gstRates });
  };
  render();
  const els = () => walk(tree);
  const control = (label: string) => {
    const found = els().find((e) => e.props.label === label);
    expect(found, label).toBeDefined();
    return found!.props;
  };
  const type = (value: string) => {
    control("Sale price, GST included").onChange({ target: { value } });
    render();
  };
  const choose = (label: string, value: string) => {
    control(label).onChange({ target: { value } });
    render();
  };
  const html = () => renderToStaticMarkup(tree as never);
  const text = () => html().replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const net = () => /<output[^>]*>(.*?)<\/output>/.exec(html())?.[1].replace(/<[^>]+>/g, "") ?? null;
  return { type, choose, control, html, text, net, effects: () => H.effects.length };
}

describe("HeroLedger: the default state is the static ledger", () => {
  it("shows the Rs 2,999 Basic sale", () => {
    const m = mount();
    expect(m.net()).toBe("₹2,639.12");
    const t = m.text();
    for (const part of ["Learner pays, GST included", "₹2,999", "of which GST at 18%", "₹457.47", "Platform fee, Basic 10%", "−₹299.90", "Gateway fee 2%", "−₹59.98", "Net after fees"]) {
      expect(t, part).toContain(part);
    }
  });

  it("derives every row: it registers no effect and holds no mirrored state beyond the three controls", () => {
    const m = mount();
    expect(m.effects()).toBe(0);
    expect(H.slots).toHaveLength(3);
  });

  it("the price field is numeric, off autofill, and the GST and plan selects offer the real rates and plans", () => {
    const m = mount();
    const price = m.control("Sale price, GST included");
    expect(price).toMatchObject({ inputMode: "numeric", autoComplete: "off", prefix: "₹", value: "2999" });
    expect(price.maxLength).toBe(MAX_PRICE_DIGITS);
    const html = m.html();
    for (const g of GST_RATES) expect(html).toContain(`<option value="${g}"`);
    for (const p of PLAN_OPTIONS) expect(html).toContain(`<option value="${p.key}"`);
    expect(html.match(/\(draft\)/g)).toHaveLength(3);
    expect(html).toContain('<option value="basic" selected="">Basic</option>');
  });
});

describe("HeroLedger: input -> derived rows", () => {
  it("typing a price recomputes every row", () => {
    const m = mount();
    m.type("5000");
    expect(m.net()).toBe("₹4,400");
    const t = m.text();
    expect(t).toContain("₹5,000");
    expect(t).toContain("−₹500");
    expect(t).toContain("−₹100");
    expect(t).toContain("₹762.71"); // 500000 * 18 / 118 = 76271.19 paise
  });

  it("keeps only digits and no more than the field's length", () => {
    const m = mount();
    m.type("12ab3");
    expect(m.control("Sale price, GST included").value).toBe("123");
    m.type("₹1,00,00,00,000");
    expect(m.control("Sale price, GST included").value).toBe("1000000000".slice(0, MAX_PRICE_DIGITS));
  });

  it.each([[""], ["0"], ["9999999"]])("%j falls back to the default sale and says so", (value) => {
    const m = mount();
    m.type("5000");
    m.type(value);
    expect(m.net()).toBe("₹2,639.12");
    expect(m.text()).toContain("Showing ₹2,999");
    expect(m.control("Sale price, GST included")["aria-invalid"]).toBe(true);
  });

  it("a valid price clears the fallback note", () => {
    const m = mount();
    m.type("");
    m.type("750");
    expect(m.text()).not.toContain("Showing");
    expect(m.control("Sale price, GST included")["aria-invalid"]).toBeUndefined();
    expect(m.net()).toBe("₹660");
  });

  it("the GST rate changes the GST row and not the net (GST sits inside the price)", () => {
    const m = mount();
    m.choose("GST rate", "5");
    expect(m.text()).toContain("of which GST at 5%");
    expect(m.text()).toContain("₹142.81"); // 299900 * 5 / 105 = 14280.95 paise, rounded
    expect(m.net()).toBe("₹2,639.12");
    m.choose("GST rate", "0");
    expect(m.text()).toContain("of which GST at 0%");
  });

  it("a draft plan changes the fees, is flagged draft, and its monthly fee is not netted", () => {
    const m = mount();
    m.choose("Plan", "pro");
    const t = m.text();
    expect(t).toContain("Platform fee, Pro 5.5%");
    expect(m.net()).toBe("₹2,774.07");
    expect(t).toContain("Pro is draft pricing");
    expect(t).toContain("₹5,000 monthly fee is not netted");
    m.choose("Plan", "basic");
    expect(m.text()).toContain("Monthly plan fees are not netted");
    expect(m.text()).not.toContain("draft pricing");
  });

  it("ignores a plan or rate value that is not offered", () => {
    const m = mount();
    m.choose("Plan", "platinum");
    expect(m.net()).toBe("₹2,639.12");
    m.choose("GST rate", "not-a-number");
    expect(m.text()).toContain("of which GST at 18%");
  });
});

describe("HeroLedger: announcements", () => {
  it("only the net row is a live region, so a change is read as one value", () => {
    const m = mount();
    const html = m.html();
    expect(html.match(/aria-live/g)).toHaveLength(1);
    expect(html).toMatch(/<output[^>]*aria-live="polite"/);
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('role="status"');
    m.type("");
    expect(m.html().match(/aria-live/g)).toHaveLength(1);
    expect(m.html()).not.toContain('role="alert"');
  });

  it("the output names the controls it is computed from", () => {
    const html = mount().html();
    expect(html).toMatch(/<output[^>]*for="ledger-price ledger-gst ledger-plan"/);
    for (const id of ["ledger-price", "ledger-gst", "ledger-plan"]) expect(html).toContain(`id="${id}"`);
  });
});
