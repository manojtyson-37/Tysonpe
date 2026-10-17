import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const state = vi.hoisted(() => ({ order: null as null | Record<string, unknown>, where: null as unknown }));

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
vi.mock("@/lib/db", () => ({
  db: {
    order: {
      findFirst: async (args: { where: unknown }) => {
        state.where = args.where;
        return state.order;
      },
    },
  },
}));

import { PrintButton } from "@/components/PrintButton";
import { functionProps } from "@/test/rsc-safe";
import InvoicePage from "./(site)/orders/[orderId]/invoice/page";

// Rs 1,120 charged at 12%: GST 1120 * 12 / 112 = Rs 120, taxable Rs 1,000. The PRODUCT now says 18; the order must win.
const baseOrder = {
  id: "o1",
  status: "paid",
  invoiceNo: "TP-2026-000042",
  provider: "razorpay",
  providerPaymentId: "pay_abc123",
  paidAt: new Date("2026-03-04T10:00:00Z"),
  refundedAt: null,
  subtotalPaise: 112000,
  discountPaise: 0,
  totalPaise: 112000,
  gstPaise: 12000,
  gstRatePct: 12,
  user: { name: "Asha Rao", email: "asha@example.com" },
  creator: { displayName: "Meera Nair", handle: "meera" },
  product: { title: "Intro to bookkeeping", gstRatePct: 18 },
  coupon: null,
};

beforeEach(() => {
  state.order = { ...baseOrder };
  state.where = null;
});

async function renderTree(): Promise<ReactNode> {
  return InvoicePage({ params: Promise.resolve({ orderId: "o1" }) } as never);
}
async function render(): Promise<string> {
  return renderToStaticMarkup(<>{await renderTree()}</>);
}
const row = (html: string, label: string) => {
  const m = html.match(new RegExp(`<dt[^>]*>${label.replace(/[()@%]/g, "\\$&")}</dt><dd[^>]*><span[^>]*>([^<]*)</span></dd>`));
  return m ? m[1] : null;
};
const read = (f: string) => readFileSync(new URL(`../../${f}`, import.meta.url), "utf8");
const PAGE = "src/app/(site)/orders/[orderId]/invoice/page.tsx";

describe("invoice: the document", () => {
  it("is a paper-tone Surface article that drops its border and padding in print", async () => {
    const html = await render();
    expect(html).toMatch(/<article class="rounded-card border border-line bg-bg px-6 py-5 sm:px-8 sm:py-6 print:border-0 print:p-0">/);
    expect(html).not.toMatch(/<article class="card/);
  });

  it("renders the invoice number verbatim, titled as before", async () => {
    const html = await render();
    expect(html).toMatch(/<p class="mt-1 font-mono text-sm text-muted">TP-2026-000042<\/p>/);
    expect(html).toContain("Tax invoice</h1>");
    expect(html.split("<h1").length - 1).toBe(1);
  });

  it("carries no SAC or GSTIN text", async () => {
    const html = await render();
    expect(html).not.toMatch(/\bSAC\b|GSTIN|HSN/i);
    expect(read(PAGE)).not.toMatch(/\bSAC\b|GSTIN|HSN/i);
  });

  it("scopes the lookup to a paid or refunded order of the buyer or the seller", async () => {
    await render();
    expect(state.where).toEqual({
      id: "o1",
      status: { in: ["paid", "refunded"] },
      OR: [{ userId: "u1" }, { creator: { userId: "u1" } }],
    });
    state.order = null;
    await expect(renderTree()).rejects.toThrow("NOT_FOUND");
  });
});

describe("invoice: totals are MetricRows with the order's own GST snapshot", () => {
  it("prints the rate and amount the order was charged at (12, not the product's 18)", async () => {
    const html = await render();
    expect(row(html, "GST @ 12% (included)")).toBe("₹120");
    expect(row(html, "Taxable value")).toBe("₹1,000");
    expect(row(html, "Total paid")).toBe("₹1,120");
    expect(html).not.toContain("18%");
    expect(html).toContain('<dl class="divide-y divide-line ml-auto mt-4 w-full max-w-xs">');
  });

  it("follows another snapshot: 5% with Rs 53.33 of GST", async () => {
    state.order = { ...baseOrder, gstRatePct: 5, gstPaise: 5333 };
    const html = await render();
    expect(row(html, "GST @ 5% (included)")).toBe("₹53.33");
    expect(row(html, "Taxable value")).toBe("₹1,066.67");
    expect(html).not.toContain("12%");
  });

  it("the total row is the strong one", async () => {
    const html = await render();
    expect(html).toMatch(/<dt class="font-semibold text-ink">Total paid<\/dt><dd class="[^"]*font-semibold text-ink">/);
    expect(html.split('<dt class="font-semibold text-ink">').length - 1).toBe(1);
  });

  it("every rupee sign sits inside a Money span", async () => {
    const html = await render();
    expect(html.split("₹").length - 1).toBe(html.split('class="tabular-nums whitespace-nowrap').length - 1);
  });
});

describe("invoice: the discount", () => {
  const discounted = { discountPaise: 11200, totalPaise: 100800, gstPaise: 10800, coupon: { code: "SAVE10" } };

  it("takes its true minus from Money, not from a typed character in the page", async () => {
    state.order = { ...baseOrder, ...discounted };
    const html = await render();
    expect(html).toContain("Discount (SAVE10)");
    expect(html).toMatch(/<td class="text-right"><span class="tabular-nums whitespace-nowrap">\u2212₹112<\/span><\/td>/);
    expect(html).not.toContain("-₹");
    expect(read(PAGE)).not.toContain("\u2212");
  });

  it("omits the discount row when nothing was discounted", async () => {
    expect(await render()).not.toContain("Discount");
  });
});

describe("invoice: print stays working", () => {
  it("keeps the print button, hidden in print, and it is the only client boundary", async () => {
    const html = renderToStaticMarkup(<PrintButton />);
    expect(html).toContain("print:hidden");
    expect(html).toContain("Print / save PDF");
    expect(await render()).toContain("Print / save PDF");
    expect(read(PAGE)).toContain("<PrintButton />");
  });

  it("everything visible on screen prints: nothing on the page is hidden from print except the button", async () => {
    const html = await render();
    expect(html.match(/print:hidden/g)?.length).toBe(1); // only the PrintButton
    expect(html).not.toMatch(/(?<!print:)\bhidden\b/);
    expect(read(PAGE)).not.toMatch(/screen:|print:hidden/);
  });
});

describe("invoice: copy that claims only what is true", () => {
  it("states test mode as a fact about the simulation, not as a tax-law claim", async () => {
    const html = await render();
    expect(html).toContain("Payments in test mode are simulated; no real money moved.");
    expect(html).toContain("Payment reference: pay_abc123 (razorpay). This is a system-generated invoice.");
    expect(html).not.toMatch(/tax liability/i);
  });
});

describe("invoice: server/client boundary", () => {
  it("passes no function prop anywhere in the tree (PrintButton is the client boundary)", async () => {
    expect(functionProps(await renderTree(), [PrintButton])).toEqual([]);
  });
});
