// FeeCalc's slider: the onChange closure, the sign and tone of the Ultimate-vs-Basic figure, and the table's labels. The repo
// has no DOM runner, so React's hooks are replaced with a tiny synchronous store (as in HeroLedger.interactions.test.tsx):
// the component is called as a plain function, the returned tree is walked, and onChange is invoked as React would invoke it.
//
// WHAT THIS CANNOT PROVE (needs a browser): that a real drag fires onChange with the slider's step values, the thumb's
// position, and that the output is announced once.
import { isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

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
  const useId = () => ":r0:";
  return { ...actual, default: { ...actual, useState, useId }, useState, useId };
});

import { PLAN_MONTHLY_PAISE, feeBreakdown, formatINR } from "@/lib/money";
import { DEFAULT_SALES_RUPEES, SALES_MAX_RUPEES, SALES_MIN_RUPEES, SALES_STEP_RUPEES } from "@/lib/demo-model";
import { FeeCalc } from "./FeeCalc";

type P = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function walk(node: ReactNode, out: Array<{ type: unknown; props: P }> = []) {
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

function mount() {
  H.slots = [];
  let tree: ReactNode;
  const render = () => {
    H.i = 0;
    tree = FeeCalc();
  };
  render();
  const html = () => renderToStaticMarkup(tree as never);
  const text = () => html().replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ").trim();
  const slider = () => walk(tree).find((e) => e.type === "input" && e.props.type === "range")!.props;
  const drag = (value: string) => {
    slider().onChange({ target: { value } });
    render();
  };
  // The figure and its tone: the Money span right under the "Ultimate vs Basic" line.
  const delta = () => /<p class="mt-1 text-2xl font-semibold"><span class="([^"]*)"[^>]*>([^<]*)<\/span>/.exec(html());
  const sentence = () => /<output[^>]*>([^<]*)<\/output>/.exec(html())![1];
  const rows = () => [...(/<tbody[^>]*>([\s\S]*?)<\/tbody>/.exec(html())?.[1] ?? "").matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
  return { render, html, text, slider, drag, delta, sentence, rows };
}

describe("FeeCalc: the slider", () => {
  it("starts at the default sales with the slider on the model's range", () => {
    const m = mount();
    expect(m.slider()).toMatchObject({ min: SALES_MIN_RUPEES, max: SALES_MAX_RUPEES, step: SALES_STEP_RUPEES, value: DEFAULT_SALES_RUPEES });
    expect(m.slider()["aria-valuetext"]).toBe("₹2,50,000 per month");
  });

  it("a drag recomputes the sales figure, the value text, the delta and every table row", () => {
    const m = mount();
    m.drag("400000");
    expect(m.slider().value).toBe(400000);
    expect(m.slider()["aria-valuetext"]).toBe("₹4,00,000 per month");
    expect(m.text()).toContain("₹4,00,000");
    expect(m.sentence()).toBe("Ultimate leaves you ₹12,000 more than Basic each month"); // 10.5% of 4,00,000 is 42,000, less the 30,000 plan fee
  });

  it("clamps to the range, and a value that is not a number falls back to the default", () => {
    const m = mount();
    m.drag("1");
    expect(m.slider().value).toBe(SALES_MIN_RUPEES);
    m.drag("99999999");
    expect(m.slider().value).toBe(SALES_MAX_RUPEES);
    m.drag("abc");
    expect(m.slider().value).toBe(DEFAULT_SALES_RUPEES);
    m.drag("");
    expect(m.slider().value).toBe(SALES_MIN_RUPEES); // Number("") is 0, a finite number, so it clamps up rather than falling back
    m.drag("123456.7");
    expect(m.slider().value).toBe(123457);
  });
});

describe("FeeCalc: sign and tone of Ultimate against Basic", () => {
  it("is negative at the default: a minus sign, the bad tone, 'less than' in words", () => {
    const m = mount();
    const [, cls, figure] = m.delta()!;
    expect(figure).toBe("−₹3,750");
    expect(cls).toMatch(/\btext-bad\b/);
    expect(cls).not.toMatch(/\btext-good\b/);
    expect(m.sentence()).toBe("Ultimate leaves you ₹3,750 less than Basic each month");
  });

  it("is positive above break-even: a plus sign, the good tone, 'more than' in words", () => {
    const m = mount();
    m.drag("300000");
    const [, cls, figure] = m.delta()!;
    expect(figure).toBe("+₹1,500");
    expect(cls).toMatch(/\btext-good\b/);
    expect(cls).not.toMatch(/\btext-bad\b/);
    expect(m.sentence()).toBe("Ultimate leaves you ₹1,500 more than Basic each month");
  });

  it("flips back when dragged down again, and the maximum is positive, the minimum negative", () => {
    const m = mount();
    m.drag("300000");
    m.drag("250000");
    expect(m.delta()![2]).toBe("−₹3,750");
    m.drag(String(SALES_MAX_RUPEES));
    expect(m.delta()![2]).toMatch(/^\+₹/);
    m.drag(String(SALES_MIN_RUPEES));
    expect(m.delta()![2]).toMatch(/^−₹/);
  });
});

describe("FeeCalc: the table", () => {
  it("is named and its heads read Plan, Fees, Monthly plan fee, Take-home", () => {
    const m = mount();
    expect(m.html()).toContain('<caption class="sr-only">Take-home by plan after the monthly plan fee</caption>');
    expect([...m.html().matchAll(/<th\b[^>]*>([^<]*)<\/th>/g)].map((x) => x[1])).toEqual(["Plan", "Fees", "Monthly plan fee", "Take-home"]);
  });

  it("labels each stacked cell, the last as 'Take-home after plan fee'", () => {
    const m = mount();
    const labels = [...m.rows()[0].matchAll(/data-label="([^"]*)"/g)].map((x) => x[1]);
    expect(labels).toEqual(["Plan", "Fees", "Monthly plan fee", "Take-home after plan fee"]);
  });

  it("follows the slider: each row's take-home is the plan's net less its monthly fee", () => {
    const m = mount();
    m.drag("500000");
    const keys = ["basic", "pro", "advanced", "ultimate"];
    keys.forEach((key, i) => {
      const take = feeBreakdown(500000 * 100, key).netPaise - PLAN_MONTHLY_PAISE[key];
      expect(m.rows()[i].replace(/<[^>]+>/g, " ")).toContain(formatINR(take));
    });
  });
});
