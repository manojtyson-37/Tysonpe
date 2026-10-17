import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// The clock is fixed in the mock below to 2026-10-15 12:00 UTC (17:30 IST on 15 Oct), so the 14 bars run 2 Oct to 15 Oct (IST).
// The creator is cr_1 / meera / Meera Nair. vi.mock factories are hoisted, so those values are written inline there.

type Paid = { paidAt: Date; totalPaise: number };
const state = vi.hoisted(() => ({
  revenue: 0,
  paidCount: 0,
  net: 0,
  learners: 0,
  products: 0,
  published: 0,
  coupons: 0,
  recent: [] as Record<string, unknown>[],
  paid: [] as { paidAt: Date; totalPaise: number }[],
}));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
  usePathname: () => "/dashboard",
}));
vi.mock("@/lib/time", () => ({ nowMs: () => Date.parse("2026-10-15T12:00:00Z") }));
vi.mock("@/lib/auth/session", () => ({ requireCreator: async () => ({ user: {}, creator: { id: "cr_1", handle: "meera", displayName: "Meera Nair" } }) }));

const mocks = vi.hoisted(() => {
  type Args = Record<string, unknown>;
  return {
    orderAggregate: vi.fn<(a: Args) => Promise<unknown>>(),
    ledgerAggregate: vi.fn<(a: Args) => Promise<unknown>>(),
    enrollmentFindMany: vi.fn<(a: Args) => Promise<unknown>>(),
    productCount: vi.fn<(a: Args) => Promise<unknown>>(),
    couponCount: vi.fn<(a: Args) => Promise<unknown>>(),
    orderFindMany: vi.fn<(a: Args) => Promise<unknown>>(),
  };
});
vi.mock("@/lib/db", () => ({
  db: {
    order: { aggregate: mocks.orderAggregate, findMany: mocks.orderFindMany },
    ledgerEntry: { aggregate: mocks.ledgerAggregate },
    enrollment: { findMany: mocks.enrollmentFindMany },
    product: { count: mocks.productCount },
    coupon: { count: mocks.couponCount },
  },
}));

import { CopyLink } from "@/components/CopyLink";
import { BarChart, ButtonLink, StatStrip, Table } from "@/components/ui";
import { formatINR } from "@/lib/format";
import { functionProps } from "@/test/rsc-safe";
import Overview from "./dashboard/(console)/(overview)/page";

const order = (over: Record<string, unknown> = {}) => ({
  id: "o_1",
  status: "paid",
  totalPaise: 49900,
  createdAt: new Date("2026-10-14T20:00:00Z"), // 15 Oct 2026, 01:30 IST
  user: { name: "Asha Verma" },
  product: { title: "Bookkeeping for Small Shops" },
  ...over,
});

beforeEach(() => {
  Object.assign(state, {
    revenue: 1234500,
    paidCount: 7,
    net: 1100000,
    learners: 5,
    products: 3,
    published: 2,
    coupons: 1,
    recent: [order()],
    paid: [] as Paid[],
  });
  for (const m of Object.values(mocks)) m.mockReset();
  mocks.orderAggregate.mockImplementation(async () => ({ _sum: { totalPaise: state.revenue }, _count: state.paidCount }));
  mocks.ledgerAggregate.mockImplementation(async () => ({ _sum: { netPaise: state.net } }));
  mocks.enrollmentFindMany.mockImplementation(async () => Array.from({ length: state.learners }, (_, i) => ({ userId: `u${i}` })));
  mocks.productCount.mockImplementation(async (a) =>
    (a.where as { status?: string }).status === "published" ? state.published : state.products,
  );
  mocks.couponCount.mockImplementation(async () => state.coupons);
  // The 14-day query honours its own `gte`, as the database would: a wrong start changes the bars.
  mocks.orderFindMany.mockImplementation(async (a) => {
    if (a.take) return state.recent;
    const gte = (a.where as { paidAt: { gte: Date } }).paidAt.gte;
    return state.paid.filter((o) => o.paidAt >= gte);
  });
});

async function render(): Promise<string> {
  const tree: ReactNode = await Overview();
  return renderToStaticMarkup(<>{tree}</>);
}
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const count = (html: string, needle: string) => html.split(needle).length - 1;
const section = (html: string, id: string) => {
  const from = html.indexOf(`aria-labelledby="${id}"`);
  if (from < 0) return "";
  const end = html.indexOf("</section>", from);
  return html.slice(from, end < 0 ? undefined : end);
};
const chartRows = (html: string) =>
  [...html.matchAll(/<tr><td>([^<]*)<\/td><td>([^<]*)<\/td><\/tr>/g)].map((m) => ({ label: m[1], amount: m[2] }));

describe("overview: stat strip", () => {
  it("has four items in order, with formatINR values and honest sub copy", async () => {
    const html = await render();
    const labels = [...html.matchAll(/<p class="t-label">([^<]*)<\/p><p class="[^"]*">(.*?)<\/p>(?:<p class="[^"]*">([^<]*)<\/p>)?/g)].map((m) => ({
      label: m[1],
      value: text(m[2]).trim(),
      sub: m[3]?.replace(/&amp;/g, "&"),
    }));
    expect(labels).toEqual([
      { label: "Revenue", value: formatINR(1234500), sub: "Gross, paid orders" },
      { label: "Net earnings", value: formatINR(1100000), sub: "After platform & gateway fees" },
      { label: "Orders", value: "7", sub: "Paid" },
      { label: "Learners", value: "5", sub: "3 products" },
    ]);
  });

  it("is a ruled strip, with no invented deltas", async () => {
    const html = await render();
    expect(html).toContain("border-y border-line");
    expect(html).not.toMatch(/text-(good|bad)">[+−-]/);
  });

  it("says '1 product' for one product", async () => {
    state.products = 1;
    expect(text(await render())).toContain("1 product");
    expect(text(await render())).not.toContain("1 products");
  });
});

describe("overview: 14-day chart", () => {
  it("names the total and the period in formatINR", async () => {
    state.paid = [
      { paidAt: new Date("2026-10-15T05:00:00Z"), totalPaise: 250000 },
      { paidAt: new Date("2026-10-14T05:00:00Z"), totalPaise: 49900 },
    ];
    const html = await render();
    const label = `Gross revenue, last 14 days (2 Oct to 15 Oct): ${formatINR(299900)} in total`;
    expect(html).toContain(`>${label}</title>`);
    expect(html).toContain(`<caption>${label}</caption>`);
    expect(html).not.toMatch(/rupees/);
  });

  it("lists 14 sr-only rows, oldest first, with short labels", async () => {
    const rows = chartRows(await render());
    expect(rows).toHaveLength(14);
    expect(rows[0]).toEqual({ label: "2 Oct", amount: formatINR(0) });
    expect(rows[13]).toEqual({ label: "15 Oct", amount: formatINR(0) });
    expect(rows.map((r) => r.label)).toEqual(Array.from({ length: 14 }, (_, i) => `${i + 2} Oct`));
  });

  it("uses short axis labels, not ISO dates, and no hover title attributes", async () => {
    const html = await render();
    expect(html).not.toContain("<text");
    expect(html).toContain('<span class="whitespace-nowrap leading-4">2 Oct</span>'); // first label carries the month
    expect(html).toContain('<span class="whitespace-nowrap leading-4">15</span>'); // later labels are the day alone
    expect(html).not.toMatch(/>2026-10-\d\d</);
    expect(html).not.toMatch(/ title="/);
    expect(html).not.toContain("toLocaleString");
  });

  it("buckets paid orders into IST days: 18:29 UTC stays, 18:31 UTC moves to the next day", async () => {
    state.paid = [
      { paidAt: new Date("2026-10-10T18:29:00Z"), totalPaise: 100 },
      { paidAt: new Date("2026-10-10T18:31:00Z"), totalPaise: 700 },
    ];
    const rows = chartRows(await render());
    expect(rows.find((r) => r.label === "10 Oct")!.amount).toBe(formatINR(100));
    expect(rows.find((r) => r.label === "11 Oct")!.amount).toBe(formatINR(700));
  });

  it("counts an early-morning order on the oldest day (the first bar is not short)", async () => {
    // 2 Oct 00:30 IST: before "13 days ago at 12:00 UTC", inside the IST day the first bar stands for.
    state.paid = [{ paidAt: new Date("2026-10-01T19:00:00Z"), totalPaise: 4200 }];
    const rows = chartRows(await render());
    expect(rows[0]).toEqual({ label: "2 Oct", amount: formatINR(4200) });
  });

  it("queries paid orders from the first instant of the oldest IST day", async () => {
    await render();
    const call = mocks.orderFindMany.mock.calls.map((c) => c[0]).find((a) => !a.take)!;
    const gte = (call.where as { paidAt: { gte: Date } }).paidAt.gte;
    expect(gte.toISOString()).toBe("2026-10-01T18:30:00.000Z"); // 2 Oct 00:00 IST
    expect(call.select).toEqual({ paidAt: true, totalPaise: true });
  });
});

describe("overview: setup checklist", () => {
  it("is absent when every step is done", async () => {
    state.published = 1;
    state.coupons = 1;
    state.paidCount = 3;
    const html = await render();
    expect(html).not.toContain("Get set up");
    expect(html).not.toContain("Publish your first product");
    expect(html).not.toContain("lg:grid-cols-[");
  });

  it("is present while any step is open, with hrefs and the Check icon on done steps only", async () => {
    state.published = 1;
    state.coupons = 0;
    state.paidCount = 0;
    const html = await render();
    const setup = section(html, "overview-setup");
    expect(setup).toContain("Get set up");
    expect(text(setup)).toContain("1 of 3 done");
    expect(setup).toContain('href="/dashboard/products/new"');
    expect(setup).toContain('href="/dashboard/coupons"');
    expect(setup).toContain('href="/c/meera"');
    expect(count(setup, 'd="m5 12.5 4.5 4.5L19 7.5"')).toBe(1);
    expect(setup).toContain("Done: ");
    expect(count(setup, "To do: ")).toBe(2);
  });

  it("renders for a brand-new creator with 0 of 3 done: three to-dos and no check mark", async () => {
    state.published = 0;
    state.coupons = 0;
    state.paidCount = 0;
    const setup = section(await render(), "overview-setup");
    expect(setup).toContain("Get set up");
    expect(text(setup)).toContain("0 of 3 done");
    expect(count(setup, "To do: ")).toBe(3);
    expect(setup).not.toContain("Done: ");
    expect(setup).not.toContain('d="m5 12.5 4.5 4.5L19 7.5"');
  });

  it("is a full-width band between the chart and recent orders, never a second column", async () => {
    state.published = 0;
    const html = await render();
    expect(html).not.toContain("lg:grid-cols");
    const at = (id: string) => html.indexOf(`aria-labelledby="${id}"`);
    expect(at("overview-revenue")).toBeGreaterThan(-1);
    expect(at("overview-setup")).toBeGreaterThan(at("overview-revenue"));
    expect(at("overview-recent")).toBeGreaterThan(at("overview-setup"));
  });

  it("keeps the store link visible once setup is complete", async () => {
    state.published = 1;
    state.coupons = 1;
    state.paidCount = 3;
    const html = await render();
    expect(html).toContain("Your store link");
    expect(html).toContain("/c/meera");
  });

  it("does not render the store link inside the checklist", async () => {
    state.published = 0;
    const setup = section(await render(), "overview-setup");
    expect(setup).toContain("Get set up"); // the negatives below only mean something if the checklist rendered
    expect(setup).not.toContain("Your store link");
    expect(setup).not.toContain("<code");
  });
});

describe("overview: recent orders", () => {
  it("is a table with Product, Learner, Status, Amount, Date headers and a stack mode", async () => {
    const html = await render();
    const recent = section(html, "overview-recent");
    const heads = [...recent.matchAll(/<th [^>]*>([^<]*)<\/th>/g)].map((m) => m[1]);
    expect(heads).toEqual(["Product", "Learner", "Status", "Amount", "Date"]);
    expect(recent).toContain('data-stack="true"');
    expect(recent).toContain('<caption class="sr-only">Recent orders</caption>');
    for (const label of ["Product", "Learner", "Status", "Amount", "Date"]) expect(recent).toContain(`data-label="${label}"`);
  });

  it("shows the order: title, learner, status badge, formatINR amount, IST date", async () => {
    const t = text(section(await render(), "overview-recent"));
    expect(t).toContain("Bookkeeping for Small Shops");
    expect(t).toContain("Asha Verma");
    expect(t).toContain("Paid");
    expect(t).toContain(formatINR(49900));
    expect(t).toContain("15 Oct 2026"); // 20:00 UTC on 14 Oct is 15 Oct in IST
  });

  it("truncates product and learner names rather than overflowing", async () => {
    state.recent = [order({ user: { name: "A very long learner name ".repeat(6) } })];
    const html = await render();
    expect(html).toMatch(/<span class="block min-w-0 max-w-40 truncate">A very long/);
    expect(html).toMatch(/<span class="block min-w-0 max-w-56 truncate">Bookkeeping/);
  });

  it("links to the full orders list", async () => {
    expect(section(await render(), "overview-recent")).toMatch(/<a [^>]*href="\/dashboard\/orders"[^>]*>View all<\/a>/);
  });

  it("with no orders shows 'No orders yet' and the store link as the action", async () => {
    state.recent = [];
    const recent = section(await render(), "overview-recent");
    expect(recent).toContain("No orders yet");
    expect(recent).toMatch(/<a [^>]*href="\/c\/meera"[^>]*>View your store<\/a>/);
    expect(recent).toMatch(/colspan="5"/i);
  });
});

describe("overview: quiet, ruled surface", () => {
  it("has no card boxes, entrance motion, strike-through or glyph tick", async () => {
    for (const published of [0, 1]) {
      state.published = published;
      const html = await render();
      expect(html).not.toMatch(/(^|[\s"])card([\s"]|$)/);
      expect(html).not.toContain("animate-");
      expect(html).not.toContain("line-through");
      expect(html).not.toContain("✓");
    }
  });

  it("uses ButtonLink for the header action", async () => {
    expect(await render()).toMatch(/<a class="btn btn-primary" href="\/dashboard\/products\/new">New product<\/a>/);
  });

  it("has one h1 and h2 section headings in order, one more while the checklist shows", async () => {
    const levels = async () => [...(await render()).matchAll(/<h([1-6])/g)].map((m) => Number(m[1]));
    expect(await levels()).toEqual([1, 2, 2]);
    state.published = 0;
    expect(await levels()).toEqual([1, 2, 2, 2]);
  });
});

describe("overview: queries are scoped to the signed-in creator", () => {
  it("pins every where clause", async () => {
    await render();
    expect(mocks.orderAggregate.mock.calls[0][0]).toEqual({
      where: { creatorId: "cr_1", status: "paid" },
      _sum: { totalPaise: true },
      _count: true,
    });
    expect(mocks.ledgerAggregate.mock.calls[0][0]).toEqual({
      where: { creatorId: "cr_1", order: { status: "paid" } },
      _sum: { netPaise: true },
    });
    expect(mocks.enrollmentFindMany.mock.calls[0][0]).toEqual({
      where: { product: { creatorId: "cr_1" } },
      distinct: ["userId"],
      select: { userId: true },
    });
    expect(mocks.productCount.mock.calls.map((c) => c[0])).toEqual([
      { where: { creatorId: "cr_1" } },
      { where: { creatorId: "cr_1", status: "published" } },
    ]);
    expect(mocks.couponCount.mock.calls[0][0]).toEqual({ where: { creatorId: "cr_1" } });
    const [recent, series] = mocks.orderFindMany.mock.calls.map((c) => c[0]);
    expect(recent.where).toEqual({ creatorId: "cr_1", status: { not: "created" } });
    expect(recent.take).toBe(6);
    expect(series.where).toEqual({ creatorId: "cr_1", status: "paid", paidAt: { gte: new Date("2026-10-01T18:30:00.000Z") } });
  });

  it("never asks for another creator's data (every call carries the creator id)", async () => {
    await render();
    const all = [
      ...mocks.orderAggregate.mock.calls,
      ...mocks.ledgerAggregate.mock.calls,
      ...mocks.enrollmentFindMany.mock.calls,
      ...mocks.productCount.mock.calls,
      ...mocks.couponCount.mock.calls,
      ...mocks.orderFindMany.mock.calls,
    ];
    expect(all).toHaveLength(8);
    for (const [args] of all) expect(JSON.stringify(args.where)).toContain('"creatorId":"cr_1"');
  });
});

describe("overview: RSC boundary", () => {
  const call = async () => (await Overview()) as ReactNode;

  it("passes no function props, with CopyLink declared as the client boundary", async () => {
    const visited = new Set<unknown>();
    expect(functionProps(await call(), [CopyLink], { onVisit: (t) => visited.add(t) })).toEqual([]);
    for (const type of [StatStrip, BarChart, Table, ButtonLink, CopyLink]) expect(visited.has(type)).toBe(true);
  });

  it("positive control: the same walk reports a function prop planted in the page tree", async () => {
    const planted = (
      <>
        {await call()}
        <button onClick={() => {}}>x</button>
      </>
    );
    expect(functionProps(planted, [CopyLink])).toEqual(["<button>.onClick"]);
  });
});
