import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const state = vi.hoisted(() => ({ order: null as null | Record<string, unknown> }));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  usePathname: () => "/",
}));
vi.mock("@/lib/auth/session", () => ({ requireUser: async () => ({ id: "u1", name: "Asha Rao" }) }));
vi.mock("@/lib/db", () => ({ db: { order: { findFirst: async () => state.order } } }));

import { functionProps } from "@/test/rsc-safe";
import SuccessPage, { metadata } from "./(site)/checkout/success/[orderId]/page";

const baseOrder = {
  id: "o1",
  userId: "u1",
  productId: "p1",
  status: "paid",
  invoiceNo: "TP-2026-000042",
  totalPaise: 112000,
  product: { id: "p1", title: "Intro to bookkeeping" },
  creator: { displayName: "Meera Nair" },
};

beforeEach(() => {
  state.order = { ...baseOrder };
});

async function renderTree(): Promise<ReactNode> {
  return SuccessPage({ params: Promise.resolve({ orderId: "o1" }) } as never);
}
async function render(): Promise<string> {
  return renderToStaticMarkup(<>{await renderTree()}</>);
}
const h1 = (html: string) => html.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1] ?? "";
const read = (f: string) => readFileSync(new URL(`../../${f}`, import.meta.url), "utf8");
const PAGE = "src/app/(site)/checkout/success/[orderId]/page.tsx";

describe("success page: the moment", () => {
  it("draws the check as an SVG icon in the reveal-pop circle, never a text glyph", async () => {
    const html = await render();
    expect(html).toMatch(/<div class="reveal-pop [^"]*bg-good-soft[^"]*text-good[^"]*"><svg[^>]*viewBox="0 0 24 24"[^>]*><path d="m5 12.5 4.5 4.5L19 7.5"><\/path><\/svg><\/div>/);
    expect(html).not.toContain("✓");
    expect(read(PAGE)).not.toContain("✓");
  });

  it("says \"You're in.\" with a full stop: no exclamation mark in the heading, title or anywhere on the page", async () => {
    const html = await render();
    expect(h1(html)).toBe("You&#x27;re in.");
    expect(html).not.toContain("!");
    expect(metadata.title).toBe("You're in.");
  });

  it("has no confetti, particles, pulse or looping motion in the page", async () => {
    const src = read(PAGE);
    expect(src).not.toMatch(/confetti|particle|animate-(pulse|ping|bounce|spin)|status-ring/i);
    expect(await render()).not.toMatch(/animate-|infinite/);
  });

  it("makes no exclamation-mark or flourish claim about delivery", async () => {
    const html = await render();
    expect(html).toContain("Intro to bookkeeping by Meera Nair is now in your library.");
    expect(html).not.toMatch(/thank you|congrat/i);
  });
});

describe("success page: the receipt rows", () => {
  it("prints the paid amount through Money inside a MetricList, and the invoice number verbatim", async () => {
    const html = await render();
    expect(html).toMatch(/<dl class="divide-y divide-line">/);
    expect(html).toMatch(/<dt[^>]*>Invoice<\/dt><dd[^>]*><span class="font-mono">TP-2026-000042<\/span><\/dd>/);
    expect(html).toMatch(/<dt[^>]*>Paid<\/dt><dd[^>]*><span class="tabular-nums whitespace-nowrap font-semibold">₹1,120<\/span><\/dd>/);
    expect(html.split("₹").length - 1).toBe(html.split('class="tabular-nums whitespace-nowrap').length - 1);
    expect(html).not.toContain("1,120.00");
  });

  it("a zero total reads \"Total: Free\" and shows no rupee sign", async () => {
    state.order = { ...baseOrder, totalPaise: 0 };
    const html = await render();
    expect(html).toMatch(/<dt[^>]*>Total<\/dt><dd[^>]*><span class="font-semibold">Free<\/span><\/dd>/);
    expect(html).not.toContain("₹");
    expect(html).not.toContain(">Paid<");
  });

  it("keeps the access rules: an unpaid order goes back to pay, a missing order is a 404", async () => {
    state.order = { ...baseOrder, status: "created" };
    await expect(renderTree()).rejects.toThrow("REDIRECT /checkout/pay/o1");
    state.order = null;
    await expect(renderTree()).rejects.toThrow("NOT_FOUND");
  });
});

describe("success page: the two links", () => {
  it("renders Start now (primary) and View invoice (secondary), each with the 44px coarse-pointer floor", async () => {
    const html = await render();
    expect(html).toMatch(/<a class="btn btn-primary btn-lg pointer-coarse:min-h-11" href="\/library\/p1">Start now<\/a>/);
    expect(html).toMatch(/<a class="btn btn-secondary btn-lg pointer-coarse:min-h-11" href="\/orders\/o1\/invoice">View invoice<\/a>/);
    expect(html.split("btn-primary").length - 1).toBe(1);
  });
});

describe("success page: server/client boundary", () => {
  it("passes no function prop anywhere in the tree", async () => {
    expect(functionProps(await renderTree(), [])).toEqual([]);
  });
});

describe("reveal-pop: the one new keyframe", () => {
  const css = read("src/app/globals.css");
  const keyframe = css.match(/@keyframes reveal-pop \{([\s\S]*?)\n\}\n/)?.[1] ?? "";

  it("exists, and animates only transform and opacity", () => {
    expect(keyframe).not.toBe("");
    const props = [...keyframe.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
    expect(props.length).toBeGreaterThan(0);
    expect([...new Set(props)].sort()).toEqual(["opacity", "transform"]);
  });

  it("the utility uses the reveal duration and the pop easing, once, with no loop", () => {
    const rule = css.match(/\.reveal-pop \{ animation: ([^;]*);/)?.[1] ?? "";
    expect(rule).toBe("reveal-pop var(--dur-reveal) var(--ease-pop) 1 both");
    expect(rule).not.toContain("infinite");
  });

  it("has a prefers-reduced-motion fallback that removes the animation (the check shows in its final state)", () => {
    const block = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(block).toMatch(/\.reveal-pop \{ animation: none; \}/);
  });
});
