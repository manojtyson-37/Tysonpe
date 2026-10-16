import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const state = vi.hoisted(() => ({
  product: null as null | Record<string, unknown>,
  coupon: null as null | Record<string, unknown>,
  enrolled: false,
}));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  usePathname: () => "/",
}));
vi.mock("@/app/actions/checkout", () => ({ startCheckout: async () => ({}) }));
vi.mock("@/lib/auth/session", () => ({ requireUser: async () => ({ id: "u1", name: "Asha Rao" }) }));
vi.mock("@/lib/db", () => ({
  db: {
    product: { findFirst: async () => state.product },
    enrollment: { findUnique: async () => (state.enrolled ? { id: "e1" } : null) },
    coupon: { findUnique: async () => state.coupon },
  },
}));

import Link from "next/link";
import { ActionForm, FormError, Input, SubmitButton } from "@/components/form";
import { functionProps } from "@/test/rsc-safe";
import CheckoutPage from "./(site)/checkout/[productId]/page";

// 112000 paise = Rs 1,120 incl. GST. At 12%: GST = 1120 * 12 / 112 = Rs 120. A 10% coupon: -Rs 112, total Rs 1,008, GST Rs 108.
const baseProduct = {
  id: "p1",
  slug: "intro-to-bookkeeping",
  title: "Intro to bookkeeping",
  status: "published",
  pricePaise: 112000,
  gstRatePct: 12,
  creatorId: "cr1",
  creator: { userId: "creator-user", displayName: "Meera Nair", handle: "meera" },
};
const baseCoupon = {
  code: "SAVE10",
  percentOff: 10,
  flatOffPaise: null,
  maxRedemptions: null,
  redeemed: 0,
  expiresAt: null,
  active: true,
};

beforeEach(() => {
  state.product = { ...baseProduct };
  state.coupon = null;
  state.enrolled = false;
});

async function render(sp: Record<string, string> = {}): Promise<string> {
  const tree: ReactNode = await CheckoutPage({
    params: Promise.resolve({ productId: "p1" }),
    searchParams: Promise.resolve(sp),
  } as never);
  return renderToStaticMarkup(<>{tree}</>);
}

const count = (html: string, needle: string) => html.split(needle).length - 1;
const row = (html: string, label: string) => {
  const m = html.match(new RegExp(`<dt[^>]*>${label.replace(/[()]/g, "\\$&")}</dt><dd[^>]*><span[^>]*>([^<]*)</span></dd>`));
  return m ? m[1] : null;
};
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("checkout review: the order summary", () => {
  it("lists Price, Total and the GST line, with the rate taken from the product (12, not 18)", async () => {
    const html = await render();
    expect(row(html, "Price")).toBe("₹1,120");
    expect(row(html, "Total")).toBe("₹1,120");
    expect(row(html, "Includes GST (12%)")).toBe("₹120");
    expect(html).not.toContain("18%");
    expect(html).not.toContain("Discount");
  });

  it("follows another rate: 5% gives Rs 53.33 on Rs 1,120 and says 5%", async () => {
    state.product = { ...baseProduct, gstRatePct: 5 };
    const html = await render();
    expect(row(html, "Includes GST (5%)")).toBe("₹53.33");
    expect(html).not.toContain("12%");
  });

  it("omits the GST line when the product carries no GST", async () => {
    state.product = { ...baseProduct, gstRatePct: 0 };
    expect(await render()).not.toContain("GST");
  });

  it("renders the summary as one definition list of MetricRows, in Price, Discount, Total, GST order", async () => {
    state.coupon = { ...baseCoupon };
    const html = await render({ coupon: "save10" });
    expect(count(html, "<dl")).toBe(1);
    const labels = [...html.matchAll(/<dt[^>]*>([^<]*)<\/dt>/g)].map((m) => m[1]);
    expect(labels).toEqual(["Price", "Discount", "Total", "Includes GST (12%)"]);
  });

  it("shows a coupon discount with Money's own true minus, on the discounted total and GST", async () => {
    state.coupon = { ...baseCoupon };
    const html = await render({ coupon: "save10" });
    expect(row(html, "Discount")).toBe("\u2212₹112");
    expect(row(html, "Total")).toBe("₹1,008");
    expect(row(html, "Includes GST (12%)")).toBe("₹108");
    expect(html).toContain('<dd class="col-start-1 row-start-2 text-xs text-muted">SAVE10</dd>');
    expect(html).not.toContain(">-₹");
    expect(html).not.toMatch(/>\s*\u2212\s*<span/); // the minus is inside Money, not a literal beside it
  });

  it("prints every amount through Money (tabular-nums), never a bare rupee string", async () => {
    state.coupon = { ...baseCoupon };
    const html = await render({ coupon: "save10" });
    const rupees = [...html.matchAll(/₹[\d,.]+/g)].length;
    const inMoney = [...html.matchAll(/<span class="tabular-nums[^"]*">[\u2212]?₹[\d,.]+<\/span>/g)].length;
    expect(rupees).toBeGreaterThan(0);
    expect(inMoney).toBe(rupees);
  });
});

describe("checkout review: renders from a server component", () => {
  // renderToStaticMarkup drops function props, so the HTML tests cannot see what React Server Components reject.
  // Walk the element tree: the only function allowed to cross is the bound server action on ActionForm.
  it("passes no function prop anywhere except the server action", async () => {
    const tree = await CheckoutPage({
      params: Promise.resolve({ productId: "p1" }),
      searchParams: Promise.resolve({}),
    } as never);
    const clientComponents = [ActionForm, SubmitButton, FormError, Input, Link];
    expect(functionProps(tree, clientComponents)).toEqual(["<ActionForm>.action"]);
  });
});

describe("checkout review: the coupon", () => {
  it("keeps a GET form, round-trips the code in upper case, and has a visible label", async () => {
    state.coupon = { ...baseCoupon };
    const html = await render({ coupon: " save10 " });
    const form = html.match(/<form[^>]*method="get"[^>]*>[\s\S]*?<\/form>/)?.[0] ?? "";
    expect(form).not.toBe("");
    expect(form).toMatch(/<input[^>]*name="coupon"[^>]*value="SAVE10"/);
    expect(form).toMatch(/<label[^>]*for="([^"]+)"[^>]*>Coupon code<\/label>/);
    const forId = form.match(/<label[^>]*for="([^"]+)"/)![1];
    expect(form).toContain(`id="${forId}"`);
    expect(form).toContain("Apply");
    expect(form).not.toContain("btn-primary");
  });

  it("applied: a good Callout (not an alert) states the saving through Money", async () => {
    state.coupon = { ...baseCoupon };
    const html = await render({ coupon: "SAVE10" });
    expect(html).toContain("bg-good-soft");
    expect(html).not.toContain('role="alert"');
    expect(html).toMatch(/SAVE10 applied\. You save <span[^>]*>₹112<\/span>\./);
  });

  const cases: [string, Record<string, unknown> | null, string][] = [
    ["not found", null, "Coupon code not found."],
    ["inactive", { ...baseCoupon, active: false }, "This coupon is no longer active."],
    ["expired", { ...baseCoupon, expiresAt: new Date(Date.now() - 86_400_000) }, "This coupon has expired."],
    ["exhausted", { ...baseCoupon, maxRedemptions: 5, redeemed: 5 }, "This coupon has been fully redeemed."],
    ["invalid", { ...baseCoupon, percentOff: null }, "This coupon is not valid."],
  ];
  it.each(cases)("%s: a bad Callout alert says so, and the price is left undiscounted", async (_n, coupon, message) => {
    state.coupon = coupon;
    const html = await render({ coupon: "SAVE10" });
    const alert = html.match(/<div role="alert"[^>]*>[\s\S]*?<\/div><\/div>/)?.[0] ?? "";
    expect(alert).toContain("bg-bad-soft");
    expect(alert).toContain("text-bad");
    expect(text(alert)).toContain(message);
    expect(count(html, 'role="alert"')).toBe(1);
    expect(html).not.toContain("Discount");
    expect(row(html, "Total")).toBe("₹1,120");
    expect(html).toMatch(/<input type="hidden" name="coupon" value=""/);
  });

  it("shows no coupon message when none was entered", async () => {
    const html = await render();
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain("bg-good-soft");
  });

  it("carries the applied code, and only an accepted one, into the checkout form", async () => {
    state.coupon = { ...baseCoupon };
    expect(await render({ coupon: "SAVE10" })).toMatch(/<input type="hidden" name="coupon" value="SAVE10"/);
  });
});

describe("checkout review: the action", () => {
  it("has exactly one ink button, 'Continue to payment', as the last child of its form", async () => {
    const html = await render();
    expect(count(html, "btn-primary")).toBe(1);
    expect(html).toContain("Continue to payment");
    expect(html).not.toContain("Get access");
    const form = html.match(/<form(?![^>]*method="get")[^>]*>([\s\S]*?)<\/form>/)![1];
    expect(form).toMatch(/<button type="submit"[^>]*btn-primary[^>]*>[\s\S]*?<\/button>$/);
    expect(form.indexOf('role="status"')).toBeLessThan(form.indexOf("<button"));
  });

  // FormError renders nothing until a submit fails, so the markup cannot show where it sits. Pin the source order.
  it("places FormError before the submit button, so an error never lands after the button", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("./(site)/checkout/[productId]/page.tsx", import.meta.url), "utf8");
    expect(src.indexOf("<FormError />")).toBeGreaterThan(-1);
    expect(src.indexOf("<FormError />")).toBeLessThan(src.indexOf("<SubmitButton"));
    expect(src.trimStart()).not.toMatch(/^"use client"/);
  });

  it("zero total: 'Get access', still one ink button, and no payment wording anywhere", async () => {
    state.product = { ...baseProduct, pricePaise: 0 };
    const html = await render();
    expect(count(html, "btn-primary")).toBe(1);
    expect(html).toContain("Get access");
    expect(text(html)).not.toMatch(/pay/i);
    expect(row(html, "Total")).toBe("Free");
    expect(html).not.toContain("GST");
  });

  it("a coupon that takes the price to zero also gives 'Get access' with no payment wording", async () => {
    state.coupon = { ...baseCoupon, percentOff: 100 };
    const html = await render({ coupon: "SAVE10" });
    expect(html).toContain("Get access");
    expect(row(html, "Total")).toBe("Free");
    expect(text(html)).not.toMatch(/pay/i);
  });

  it("keeps the quiet back link to the product page, with an icon rather than a glyph", async () => {
    const html = await render();
    const a = html.match(/<a [^>]*href="\/c\/meera\/intro-to-bookkeeping"[^>]*>[\s\S]*?<\/a>/)?.[0] ?? "";
    expect(a).toContain("Back to product");
    expect(a).toContain("<svg");
    expect(a).not.toMatch(/[←‹<-]\s*Back|&larr;/);
    expect(a).not.toContain("btn");
  });

  it("makes no safety, encryption or trust claims", async () => {
    expect(text(await render())).not.toMatch(/secure|encrypt|safe|guarantee|trusted|verified/i);
  });
});

describe("checkout review: access rules are untouched", () => {
  it("redirects the creator to their own product, and an enrolled learner to the library", async () => {
    state.product = { ...baseProduct, creator: { ...baseProduct.creator, userId: "u1" } };
    await expect(render()).rejects.toThrow("REDIRECT /dashboard/products/p1");
    state.product = { ...baseProduct };
    state.enrolled = true;
    await expect(render()).rejects.toThrow("REDIRECT /library/p1");
  });

  it("404s on an unpublished or missing product", async () => {
    state.product = null;
    await expect(render()).rejects.toThrow("NOT_FOUND");
  });
});
