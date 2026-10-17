import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const state = vi.hoisted(() => ({
  order: null as null | Record<string, unknown>,
  provider: { name: "mock" } as Record<string, unknown>,
}));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  usePathname: () => "/",
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));
vi.mock("@/app/actions/checkout", () => ({
  startEasebuzzPayment: async () => ({}),
  settleDemoAction: async () => ({}),
  confirmPaymentAction: async () => ({ ok: true }),
}));
vi.mock("@/lib/auth/session", () => ({
  requireUser: async () => ({ id: "u1", name: "Asha Rao", email: "asha@example.com", preferredGateway: null }),
}));
vi.mock("@/lib/db", () => ({ db: { order: { findFirst: async () => state.order } } }));
vi.mock("@/lib/payments", () => ({ getProvider: () => state.provider }));

import { DemoPayPageClient } from "@/components/DemoPayPageClient";
import { RazorpayButton } from "@/components/RazorpayButton";
import { functionProps } from "@/test/rsc-safe";
import PayPage from "./(site)/checkout/pay/[orderId]/page";

// Rs 1,120 incl. GST. At 12% the GST is 1120 * 12 / 112 = Rs 120 (12000 paise). The order carries its OWN snapshot of both.
const baseOrder = {
  id: "o1",
  userId: "u1",
  productId: "p1",
  status: "created",
  provider: "mock",
  providerOrderId: "order_mock_1",
  totalPaise: 112000,
  gstPaise: 12000,
  gstRatePct: 12,
  createdAt: new Date(),
  // A product whose CURRENT rate differs from what the order was charged at: the page must not read this one.
  product: { id: "p1", title: "Intro to bookkeeping", gstRatePct: 18 },
};

beforeEach(() => {
  state.order = { ...baseOrder };
  state.provider = { name: "mock" };
});

async function renderTree(sp: Record<string, string> = {}): Promise<ReactNode> {
  return PayPage({ params: Promise.resolve({ orderId: "o1" }), searchParams: Promise.resolve(sp) } as never);
}
async function render(sp: Record<string, string> = {}): Promise<string> {
  return renderToStaticMarkup(<>{await renderTree(sp)}</>);
}
const count = (html: string, needle: string) => html.split(needle).length - 1;
const row = (html: string, label: string) => {
  const m = html.match(new RegExp(`<dt[^>]*>${label.replace(/[()]/g, "\\$&")}</dt><dd[^>]*><span[^>]*>([^<]*)</span></dd>`));
  return m ? m[1] : null;
};
const checkedGateways = (html: string) =>
  [...html.matchAll(/<input[^>]*type="radio"[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => /\bchecked(=|\s|\/|>)/.test(tag))
    .map((tag) => tag.match(/value="([^"]+)"/)?.[1]);

describe("pay page: source hygiene (the plan's acceptance grep, as a test)", () => {
  const FILES = [
    "src/app/(site)/checkout/pay/[orderId]/page.tsx",
    "src/components/DemoPayPageClient.tsx",
    "src/components/RazorpayButton.tsx",
  ];
  const source = (f: string) => readFileSync(new URL(`../../${f}`, import.meta.url), "utf8");

  it.each(FILES)("%s carries no banned indigo, off-scale radius, amber, pulse or sub-12px text", (file) => {
    const src = source(file);
    expect(src).not.toMatch(/5b3df5/i);
    expect(src).not.toContain("rounded-[");
    expect(src).not.toMatch(/amber-|indigo-|violet-/);
    expect(src).not.toContain("animate-pulse");
    expect(src).not.toMatch(/text-\[1[01]px\]/);
    expect(src).not.toMatch(/shadow-(sm|lg|xl|md)\b/);
    expect(src).not.toMatch(/transition-all|\btransition\b(?!-)/);
  });

  it("the only hex literal across the three files is the ink colour handed to the Razorpay SDK", () => {
    const hexes = FILES.flatMap((f) => source(f).match(/#[0-9a-f]{3,8}\b/gi) ?? []);
    expect(hexes).toEqual(["#16130f"]);
    expect(source("src/components/RazorpayButton.tsx")).toContain('theme: { color: "#16130f" }');
  });
});

describe("pay page: the order summary", () => {
  it("prints the GST rate and amount from the ORDER snapshot (12, not 18, even though the product now says 18)", async () => {
    const html = await render();
    expect(row(html, "Includes GST (12%)")).toBe("₹120");
    expect(row(html, "Total payable")).toBe("₹1,120");
    expect(html).not.toContain("18%");
  });

  it("follows another snapshot: 5% on Rs 1,120 is Rs 53.33 and says 5%", async () => {
    state.order = { ...baseOrder, gstRatePct: 5, gstPaise: 5333 };
    const html = await render();
    expect(row(html, "Includes GST (5%)")).toBe("₹53.33");
    expect(html).not.toContain("12%");
  });

  it("omits the GST line when the order carries no GST", async () => {
    state.order = { ...baseOrder, gstRatePct: 0, gstPaise: 0 };
    expect(await render()).not.toContain("GST");
  });

  it("prints every rupee amount through Money (tabular-nums), never the old two-decimal literal", async () => {
    const html = await render();
    expect(html).toContain('<span class="tabular-nums whitespace-nowrap text-xl font-semibold">₹1,120</span>');
    expect(html).not.toContain("1,120.00");
    // Every rupee sign in the markup sits inside a Money span.
    expect(count(html, "₹")).toBe(count(html, 'class="tabular-nums whitespace-nowrap'));
  });

  it("names the product and uses one h1 and a labelled section", async () => {
    const html = await render();
    expect(count(html, "<h1")).toBe(1);
    expect(html).toContain('aria-labelledby="pay-order-heading"');
    expect(html).toContain("Intro to bookkeeping");
  });
});

describe("pay page: the simulation notice and failures", () => {
  it("states the environment in an info Callout: no amber strip, no pulse, and nothing that interrupts", async () => {
    const html = await render();
    expect(html).toContain("Gateway simulation");
    expect(html).toContain("Test mode.");
    expect(html).toContain("border border-line bg-surface-2 text-ink"); // the info tone
    expect(html).not.toMatch(/amber|animate-pulse|Safe Mode/);
    expect(html).not.toContain('role="alert"');
  });

  it("a failed attempt shows exactly one alert, in the bad tone", async () => {
    const html = await render({ failed: "1" });
    expect(count(html, 'role="alert"')).toBe(1);
    expect(html).toContain("No funds were debited");
    expect(html).toContain("bg-bad-soft");
  });

  it("an order already marked failed shows the same single alert", async () => {
    state.order = { ...baseOrder, status: "failed" };
    expect(count(await render(), 'role="alert"')).toBe(1);
  });
});

describe("pay page: gateway choice is a RadioCard group", () => {
  it("renders one radio per gateway in one named group, Razorpay checked by default", async () => {
    const html = await render();
    expect(count(html, 'type="radio"')).toBe(2);
    expect(count(html, 'name="gateway"')).toBe(2);
    expect(html).toContain("<fieldset");
    expect(html).toContain('<legend class="t-label');
    expect(checkedGateways(html)).toEqual(["razorpay"]);
    expect(html).not.toMatch(/Selected|Select<|●|○/); // the bespoke text-glyph pill is gone
  });

  it("?gw=easebuzz checks Easebuzz instead and swaps the action to a link with the order id", async () => {
    const html = await render({ gw: "easebuzz" });
    expect(checkedGateways(html)).toEqual(["easebuzz"]);
    expect(html).toContain('href="/gateway/easebuzz/o1"');
    expect(html).toContain("+91");
    expect(html).not.toContain("with Razorpay");
  });

  it("the Razorpay action is one ink primary button with the amount inside Money", async () => {
    const html = await render();
    expect(count(html, "btn-primary")).toBe(1);
    expect(html).toMatch(/btn-lg[^"]*"[^>]*>.*Pay <span class="tabular-nums[^>]*>₹1,120<\/span> with Razorpay/);
  });
});

describe("pay page: other providers", () => {
  it("razorpay: the launcher gets a Money-style label from formatINR", async () => {
    state.order = { ...baseOrder, provider: "razorpay" };
    state.provider = { name: "razorpay", publicKey: "rzp_test_x" };
    const tree = await renderTree();
    const html = renderToStaticMarkup(<>{tree}</>);
    expect(html).toContain("Pay ₹1,120</button>");
    expect(html).not.toContain("₹1,120.00");
    expect(html).not.toContain('class="btn btn-primary btn-lg w-full flex'); // no hand-rolled button
  });

  it("easebuzz: a quiet info Callout carries the test-mode note and the submit uses the large Button", async () => {
    state.order = { ...baseOrder, provider: "easebuzz" };
    state.provider = { name: "easebuzz" };
    const html = await render();
    expect(html).toContain("Pay securely with Easebuzz");
    expect(html).toContain("<strong>Test mode.</strong>");
    expect(html).not.toContain("bg-warn-soft px-3.5");
    expect(html).not.toContain("rounded-xl");
  });

  it("a provider mismatch is a bad-tone Callout, not loose red text", async () => {
    state.order = { ...baseOrder, provider: "razorpay" };
    state.provider = { name: "mock" };
    const html = await render();
    expect(html).toContain("different payment setup");
    expect(count(html, 'role="alert"')).toBe(1);
  });
});

describe("pay page: server/client boundary", () => {
  it("passes no function prop to either client component (mock and razorpay paths)", async () => {
    expect(functionProps(await renderTree(), [DemoPayPageClient, RazorpayButton])).toEqual([]);
    state.order = { ...baseOrder, provider: "razorpay" };
    state.provider = { name: "razorpay", publicKey: "rzp_test_x" };
    expect(functionProps(await renderTree(), [DemoPayPageClient, RazorpayButton])).toEqual([]);
  });
});
