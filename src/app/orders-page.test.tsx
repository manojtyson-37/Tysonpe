import { readFileSync } from "node:fs";
import { isValidElement, type ReactNode } from "react";
import Link from "next/link";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// The creator is cr_1. vi.mock factories are hoisted, so values are written inline there.
const mocks = vi.hoisted(() => {
  /** A stand-in server action whose `.bind` returns a tagged function, so a test can read WHICH action a form got. */
  const refund = (() => undefined) as unknown as { bind: (...a: unknown[]) => unknown };
  refund.bind = (_this: unknown, ...args: unknown[]) => Object.assign(() => undefined, { action: "refundOrderAction", args });
  return {
    findMany: vi.fn<(a: Record<string, unknown>) => Promise<unknown>>(),
    count: vi.fn<(a: Record<string, unknown>) => Promise<number>>(),
    refund,
  };
});

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
  usePathname: () => "/dashboard/orders",
}));
vi.mock("@/lib/auth/session", () => ({ requireCreator: async () => ({ user: {}, creator: { id: "cr_1" } }) }));
vi.mock("@/lib/db", () => ({ db: { order: { findMany: mocks.findMany, count: mocks.count } } }));
vi.mock("@/app/actions/creator", () => ({ refundOrderAction: mocks.refund }));

import { ConfirmButton } from "@/components/ConfirmButton";
import { ButtonLink, Callout, EmptyRow, StatusBadge, Table, Tabs } from "@/components/ui";
import { formatINR } from "@/lib/format";
import { functionProps } from "@/test/rsc-safe";
import { legacyStyleFindings } from "@/test/style-scan";
import OrdersPage from "./dashboard/(console)/orders/page";

const PAGE_PATH = new URL("./dashboard/(console)/orders/page.tsx", import.meta.url);

const order = (over: Record<string, unknown> = {}) => ({
  id: "o_1",
  status: "paid",
  totalPaise: 49900,
  createdAt: new Date("2026-10-15T06:30:00Z"),
  user: { name: "Asha Rao", email: "asha@example.com" },
  product: { title: "Bookkeeping for Small Shops" },
  coupon: null as { code: string } | null,
  ...over,
});

beforeEach(() => {
  mocks.findMany.mockReset();
  mocks.count.mockReset();
  mocks.findMany.mockResolvedValue([order()]);
  // The total follows what findMany returns unless a test says the creator has more than the page shows.
  mocks.count.mockImplementation(async () => ((await mocks.findMany.mock.results.at(-1)?.value) as unknown[] | undefined)?.length ?? 0);
});

/** The creator has `owned` orders; the query returns at most the 200-row cap, as the database would. */
function own(owned: number) {
  mocks.findMany.mockImplementation(async () => Array.from({ length: Math.min(owned, 200) }, (_, i) => order({ id: `o_${i}` })));
  mocks.count.mockResolvedValue(owned);
}

type Search = Record<string, string | string[] | undefined>;
const call = async (sp: Search = {}) => (await (OrdersPage as (p: unknown) => Promise<ReactNode>)({ searchParams: Promise.resolve(sp) })) as ReactNode;
const render = async (sp: Search = {}) => renderToStaticMarkup(<>{await call(sp)}</>);
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const rowCells = (html: string) => {
  const body = html.slice(html.indexOf("<tbody"));
  return [...body.matchAll(/<tr\b[^>]*>(.*?)<\/tr>/g)].map((r) => [...r[1].matchAll(/<td\b[^>]*>(.*?)<\/td>/g)].map((c) => text(c[1]).trim()));
};

type El = { type: unknown; props: Record<string, any>; ancestors: Array<{ type: unknown; props: Record<string, any> }> }; // eslint-disable-line @typescript-eslint/no-explicit-any
const BOUNDARIES: unknown[] = [Tabs, ConfirmButton, Link];
/** Flattens the page's element tree: plain components are called, client components (BOUNDARIES) are not. */
function elements(node: ReactNode): El[] {
  const out: El[] = [];
  const go = (n: unknown, ancestors: El["ancestors"]): void => {
    if (Array.isArray(n)) return n.forEach((c) => go(c, ancestors));
    if (!isValidElement(n)) return;
    const props = n.props as El["props"];
    out.push({ type: n.type, props, ancestors });
    const next = [...ancestors, { type: n.type, props }];
    if (typeof n.type === "function" && !BOUNDARIES.includes(n.type)) go((n.type as (p: unknown) => unknown)(props), next);
    else go(props.children, next);
  };
  go(node, []);
  return out;
}
const confirms = async (sp: Search = {}) => elements(await call(sp)).filter((e) => e.type === ConfirmButton);

describe("orders: filter tabs", () => {
  const FILTERS: Array<[string | undefined, string]> = [
    [undefined, "All"],
    ["paid", "Paid"],
    ["refunded", "Refunded"],
    ["failed", "Failed"],
    ["created", "Pending"],
  ];

  it("is a link-mode Tabs nav named 'Filter by status', not a hand-made tablist", async () => {
    const html = await render();
    expect(html).toMatch(/<nav aria-label="Filter by status"/);
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain('role="tab"');
    const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>(?:<span[^>]*><\/span>)?<span class="relative">([^<]*)<\/span><\/a>/g)].map((m) => [m[1], m[2]]);
    expect(links).toEqual([
      ["/dashboard/orders", "All"],
      ["/dashboard/orders?status=paid", "Paid"],
      ["/dashboard/orders?status=refunded", "Refunded"],
      ["/dashboard/orders?status=failed", "Failed"],
      ["/dashboard/orders?status=created", "Pending"],
    ]);
  });

  it.each(FILTERS)("?status=%s marks exactly the %s tab current, from the server status", async (status, label) => {
    const html = await render({ status });
    const current = [...html.matchAll(/<a\b[^>]*aria-current="page"[^>]*>.*?<span class="relative">([^<]*)<\/span><\/a>/g)].map((m) => m[1]);
    expect(current).toEqual([label]);
  });

  it("passes `current` per item to Tabs (the pathname alone cannot tell the filters apart)", async () => {
    const tabs = elements(await call({ status: "failed" })).find((e) => e.type === Tabs)!;
    expect(tabs.props.ariaLabel).toBe("Filter by status");
    expect((tabs.props.items as Array<{ current: boolean }>).map((i) => i.current)).toEqual([false, false, false, true, false]);
  });

  it.each(["bogus", "PAID", "", ["paid", "failed"]])("an unknown ?status=%j falls back to All, unfiltered", async (status) => {
    const html = await render({ status });
    expect([...html.matchAll(/aria-current="page"[^>]*>.*?<span class="relative">([^<]*)</g)].map((m) => m[1])).toEqual(["All"]);
    expect((mocks.findMany.mock.calls[0][0] as { where: unknown }).where).toEqual({ creatorId: "cr_1" });
  });
});

describe("orders: structure", () => {
  it("is a named, stacking table with five data columns in order, then a screen-reader Actions column", async () => {
    const html = await render();
    expect(html).toContain('aria-label="Orders"');
    expect(html).toContain('data-stack="true"');
    expect([...html.matchAll(/<th\b[^>]*>(.*?)<\/th>/g)].map((m) => text(m[1]).trim())).toEqual(["Date", "Buyer", "Product", "Total", "Status", "Actions"]);
    expect(html).toMatch(/<th\b[^>]*><span class="sr-only">Actions<\/span><\/th>/);
  });

  it("uses no legacy .card or .table class and no rounded-xl", async () => {
    const html = await render({ error: "x" });
    const tokens = [...html.matchAll(/\sclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
    expect(tokens).not.toContain("card");
    expect(tokens).not.toContain("table");
    expect(html).not.toContain("rounded-xl");
  });

  it("stacks with a data-label on every data cell", async () => {
    const html = await render();
    for (const l of ["Date", "Buyer", "Product", "Total", "Status"]) expect(html).toContain(`data-label="${l}"`);
  });
});

describe("orders: rows", () => {
  it("shows date, buyer name and email, product, total and status", async () => {
    const cells = rowCells(await render());
    expect(cells).toEqual([["15 Oct 2026", "Asha Rao asha@example.com", "Bookkeeping for Small Shops", formatINR(49900), "Paid", "Invoice Mark refunded"]]);
  });

  it("prints the coupon code as a badge next to the product", async () => {
    mocks.findMany.mockResolvedValue([order({ coupon: { code: "DIWALI20" } })]);
    const html = await render();
    expect(html).toMatch(/<span class="badge badge-muted[^"]*">DIWALI20<\/span>/);
    expect(rowCells(html)[0][2]).toBe("Bookkeeping for Small Shops DIWALI20");
  });

  it("lets a long buyer email shrink and truncate instead of widening the row", async () => {
    const html = await render();
    expect(html).toMatch(/<div class="min-w-0[^"]*">/);
    expect(html).toMatch(/<p class="[^"]*\btruncate\b[^"]*">asha@example.com<\/p>/);
  });

  it("labels every status with the shared badge (created reads Pending)", async () => {
    mocks.findMany.mockResolvedValue(["paid", "refunded", "failed", "created"].map((status, i) => order({ id: `o_${i}`, status })));
    expect(rowCells(await render()).map((c) => c[4])).toEqual(["Paid", "Refunded", "Failed", "Pending"]);
  });

  it("offers Invoice for paid and refunded orders only, as a touch-sized ghost button link named for the order", async () => {
    mocks.findMany.mockResolvedValue(["paid", "refunded", "failed", "created"].map((status, i) => order({ id: `o_${i}`, status })));
    const html = await render();
    const invoices = [...html.matchAll(/<a\b[^>]*>Invoice<\/a>/g)].map((m) => m[0]);
    expect(invoices).toHaveLength(2);
    expect(invoices[0]).toContain('href="/orders/o_0/invoice"');
    expect(invoices[1]).toContain('href="/orders/o_1/invoice"');
    for (const a of invoices) {
      expect(a).toMatch(/class="[^"]*\bbtn-ghost\b[^"]*\bbtn-sm\b/);
      expect(a).toContain("pointer-coarse:min-h-11");
      expect(a).toMatch(/aria-label="Invoice for Bookkeeping for Small Shops, Asha Rao"/);
    }
  });
});

describe("orders: refund", () => {
  it("only paid orders get Mark refunded, each in a form bound to its own order id", async () => {
    mocks.findMany.mockResolvedValue(["paid", "refunded", "failed", "created", "paid"].map((status, i) => order({ id: `o_${i}`, status })));
    const found = await confirms();
    expect(found).toHaveLength(2);
    const bound = found.map((c) => {
      const fn = [...c.ancestors].reverse().find((a) => a.type === "form")!.props.action as unknown as { action: string; args: unknown[] };
      return { action: fn.action, args: fn.args };
    });
    expect(bound).toEqual([
      { action: "refundOrderAction", args: ["o_0"] },
      { action: "refundOrderAction", args: ["o_4"] },
    ]);
  });

  it("names the action on the dialog's confirm button, names the order on the trigger, and has a touch floor", async () => {
    const [c] = await confirms();
    expect(c.props.confirmLabel).toBe("Mark refunded");
    expect(c.props["aria-label"]).toBe("Mark refunded: Bookkeeping for Small Shops, Asha Rao");
    expect(c.props.className).toContain("pointer-coarse:min-h-11");
    expect(c.props.children).toBe("Mark refunded");
  });

  // Defect fixed here: the copy said "send the money back from Razorpay yourself" although checkout can be the demo
  // gateway (no money moves) or another gateway.
  it("is provider-neutral and true about what marking refunded does, in the dialog and in the footnote", async () => {
    const [c] = await confirms();
    const dialog = String(c.props.message);
    expect(dialog).not.toMatch(/razorpay/i);
    expect(dialog).toMatch(/loses access/i);
    expect(dialog).toMatch(/does not (?:return|send) (?:any |the )?money/i);
    expect(dialog).toMatch(/payment gateway/i);

    const foot = text(await render()).replace(/&#x27;/g, "'");
    expect(foot).not.toMatch(/razorpay/i);
    expect(foot).toMatch(/revokes the buyer.s access and removes the order from payouts/);
    expect(foot).toMatch(/does not return any money/);
    expect(foot).toMatch(/through your payment gateway/);
  });

  it("shows a refund error as an alert Callout (no hand-made red box), clipped to 200 characters", async () => {
    const html = await render({ error: `Only paid orders can be refunded.${"x".repeat(300)}` });
    expect(html).toMatch(/<div role="alert" class="flex items-start gap-3 rounded-card[^"]*">/);
    expect(html).not.toContain("rounded-xl");
    expect(text(html)).toContain("Only paid orders can be refunded.");
    expect(html).not.toContain("x".repeat(200));
    expect(html).not.toContain('role="alert" class="mb-4 rounded-xl');
  });

  it("shows no alert when there is no error", async () => {
    expect(await render()).not.toContain('role="alert"');
    expect(await render({ error: ["a"] })).not.toContain('role="alert"');
  });
});

describe("orders: empty state", () => {
  it("says 'No orders yet' for All, with the table header kept", async () => {
    mocks.findMany.mockResolvedValue([]);
    const html = await render();
    expect(text(html)).toContain("No orders yet");
    expect(html).toContain('colSpan="6"');
    expect(html).toContain("<thead");
    expect(rowCells(html)).toEqual([["No orders yet Orders appear as soon as someone starts checkout."]]);
  });

  it.each([
    ["paid", "No paid orders"],
    ["refunded", "No refunded orders"],
    ["failed", "No failed orders"],
    ["created", "No pending orders"],
  ])("says '%s' filter honestly: %s", async (status, title) => {
    mocks.findMany.mockResolvedValue([]);
    const html = await render({ status });
    expect(text(html)).toContain(title);
    expect(text(html)).not.toContain("No orders yet");
    expect(html).not.toMatch(/<a [^>]*href="\/dashboard\/products\/new"/);
  });
});

describe("orders: query", () => {
  it("always pins the signed-in creator, and adds a status only for a real filter", async () => {
    await render();
    expect(mocks.findMany.mock.calls[0][0].where).toEqual({ creatorId: "cr_1" });
    for (const status of ["paid", "refunded", "failed", "created"]) {
      mocks.findMany.mockClear();
      await render({ status });
      expect(mocks.findMany.mock.calls[0][0].where).toEqual({ creatorId: "cr_1", status });
    }
  });

  it("is newest first, bounded to 200, and loads the buyer, product and coupon", async () => {
    await render();
    const args = mocks.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual({ createdAt: "desc" });
    expect(args.take).toBe(200);
    expect(args.include).toEqual({ user: true, product: true, coupon: true });
  });

  it("counts with exactly the same where as the rows, for every filter", async () => {
    for (const status of [undefined, "paid", "refunded", "failed", "created"]) {
      mocks.findMany.mockClear();
      mocks.count.mockClear();
      await render({ status });
      expect(mocks.count).toHaveBeenCalledTimes(1);
      expect(mocks.count.mock.calls[0][0]).toEqual({ where: mocks.findMany.mock.calls[0][0].where });
    }
  });

  // Boundary: silent at 199 and at exactly 200 (all shown); names the real total from 201.
  it.each([1, 199, 200])("says nothing about a cap when the creator has %i orders", async (n) => {
    own(n);
    expect(text(await render())).not.toMatch(/Showing the latest/);
  });

  it("at 201 shows the first 200 rows and says '200 of 201'", async () => {
    own(201);
    const html = await render();
    expect(rowCells(html)).toHaveLength(200);
    expect(text(html)).toContain("Showing the latest 200 of 201 orders.");
  });

  it("names the filter in the note, and the real total far past the cap", async () => {
    own(1234);
    expect(text(await render({ status: "paid" }))).toContain("Showing the latest 200 of 1234 paid orders.");
    expect(text(await render({ status: "created" }))).toContain("Showing the latest 200 of 1234 pending orders.");
  });
});

describe("orders: RSC boundary", () => {
  it("passes no function props, with Tabs, ConfirmButton and next/link declared as client boundaries", async () => {
    mocks.findMany.mockResolvedValue([order(), order({ id: "o_2", status: "refunded", coupon: { code: "X" } })]);
    const visited = new Set<unknown>();
    const found = functionProps(await call({ error: "e" }), BOUNDARIES, { onVisit: (t) => visited.add(t) });
    // Only the bound server action on each refund form crosses (a server action is serialisable); nothing else.
    expect(found).toEqual(["<form>.action"]);
    for (const type of [Tabs, Table, ConfirmButton, ButtonLink, StatusBadge, Callout]) expect(visited.has(type)).toBe(true);
  });

  it("the empty state is walked too", async () => {
    mocks.findMany.mockResolvedValue([]);
    const visited = new Set<unknown>();
    expect(functionProps(await call(), BOUNDARIES, { onVisit: (t) => visited.add(t) })).toEqual([]);
    expect(visited.has(EmptyRow)).toBe(true);
  });

  it("positive control: the same walk reports a function prop planted in the page tree", async () => {
    const planted = (
      <>
        {await call()}
        <button onClick={() => {}}>x</button>
      </>
    );
    expect(functionProps(planted, BOUNDARIES)).toEqual(["<form>.action", "<button>.onClick"]);
  });
});

describe("orders: source hygiene", () => {
  it("the page source has no legacy classes, ! utilities, glyphs or title tooltips", () => {
    expect(legacyStyleFindings(readFileSync(PAGE_PATH, "utf8"))).toEqual([]);
  });
});
