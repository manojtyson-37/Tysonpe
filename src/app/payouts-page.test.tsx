import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// The creator is cr_1. vi.mock factories are hoisted, so values are written inline there.
const mocks = vi.hoisted(() => ({
  findMany: vi.fn<(a: Record<string, unknown>) => Promise<unknown>>(),
  aggregate: vi.fn<(a: Record<string, unknown>) => Promise<unknown>>(),
  count: vi.fn<(a: Record<string, unknown>) => Promise<number>>(),
}));

vi.mock("@/lib/auth/session", () => ({ requireCreator: async () => ({ user: {}, creator: { id: "cr_1", planKey: "pro" } }) }));
vi.mock("@/lib/db", () => ({ db: { ledgerEntry: { findMany: mocks.findMany, aggregate: mocks.aggregate, count: mocks.count } } }));

import { EmptyRow, MoneyCell, StatStrip, Table } from "@/components/ui";
import { formatINR } from "@/lib/format";
import { functionProps } from "@/test/rsc-safe";
import { legacyStyleFindings } from "@/test/style-scan";
import PayoutsPage from "./dashboard/(console)/payouts/page";

const PAGE_PATH = new URL("./dashboard/(console)/payouts/page.tsx", import.meta.url);
const MINUS = "−";

const entry = (over: Record<string, unknown> = {}) => ({
  id: "l_1",
  createdAt: new Date("2026-10-15T06:30:00Z"),
  grossPaise: 100000,
  platformFeePaise: 5500,
  gatewayFeePaise: 2000,
  netPaise: 92500,
  order: { product: { title: "Bookkeeping for Small Shops" }, user: { name: "Asha Rao" } },
  ...over,
});
const totals = (over: Record<string, number | null> = {}) => ({
  _sum: { grossPaise: 12345600, platformFeePaise: 678900, gatewayFeePaise: 246900, netPaise: 11419800, ...over },
});

beforeEach(() => {
  for (const m of [mocks.findMany, mocks.aggregate, mocks.count]) m.mockReset();
  mocks.findMany.mockResolvedValue([entry()]);
  mocks.aggregate.mockResolvedValue(totals());
  mocks.count.mockResolvedValue(1);
});

/** The creator has `owned` ledger entries; the query returns at most the 200-row cap, as the database would. */
function own(owned: number) {
  mocks.findMany.mockImplementation(async () => Array.from({ length: Math.min(owned, 200) }, (_, i) => entry({ id: `l_${i}` })));
  mocks.count.mockResolvedValue(owned);
}

const call = async () => (await (PayoutsPage as () => Promise<ReactNode>)()) as ReactNode;
const render = async () => renderToStaticMarkup(<>{await call()}</>);
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const rowCells = (html: string) => {
  const body = html.slice(html.indexOf("<tbody"));
  return [...body.matchAll(/<tr\b[^>]*>(.*?)<\/tr>/g)].map((r) => [...r[1].matchAll(/<td\b[^>]*>(.*?)<\/td>/g)].map((c) => text(c[1]).trim()));
};

describe("payouts: totals strip", () => {
  it("shows Gross, Platform fees, Gateway fees and Net from the database totals, fees as deductions", async () => {
    const html = text(await render());
    expect(html).toContain(`Gross sales ${formatINR(12345600)}`);
    expect(html).toContain(`Platform fees ${MINUS}${formatINR(678900)}`);
    expect(html).toContain(`Gateway fees ${MINUS}${formatINR(246900)}`);
    expect(html).toContain(`Net earnings ${formatINR(11419800)}`);
  });

  it("prints a true minus (U+2212), never a hyphen, beside a fee", async () => {
    const html = await render();
    expect(html).not.toMatch(/-<span|>-₹|>-\s*₹/);
    expect(html).toContain(MINUS);
  });

  it("is a StatStrip, not a card grid", async () => {
    const html = await render();
    expect(html).toContain("border-y border-line");
    const tokens = [...html.matchAll(/\sclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
    expect(tokens).not.toContain("card");
  });

  it("treats a creator with no ledger rows as zeros (null sums)", async () => {
    mocks.aggregate.mockResolvedValue(totals({ grossPaise: null, platformFeePaise: null, gatewayFeePaise: null, netPaise: null }));
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    const html = text(await render());
    expect(html).toContain("Gross sales ₹0");
    expect(html).toContain("Net earnings ₹0");
    expect(html).not.toMatch(/NaN|undefined/);
  });
});

describe("payouts: ledger table", () => {
  it("is a named, stacking table: Date, Order, Gross, Platform, Gateway, Net", async () => {
    const html = await render();
    expect(html).toContain('aria-label="Ledger"');
    expect(html).toContain('data-stack="true"');
    expect([...html.matchAll(/<th\b[^>]*>(.*?)<\/th>/g)].map((m) => text(m[1]).trim())).toEqual(["Date", "Order", "Gross", "Platform", "Gateway", "Net"]);
    for (const l of ["Date", "Order", "Gross", "Platform", "Gateway", "Net"]) expect(html).toContain(`data-label="${l}"`);
  });

  it("prints the row with deductions in true minus and the net in full", async () => {
    expect(rowCells(await render())).toEqual([
      ["15 Oct 2026", "Bookkeeping for Small Shops Asha Rao", formatINR(100000), `${MINUS}${formatINR(5500)}`, `${MINUS}${formatINR(2000)}`, formatINR(92500)],
    ]);
  });

  it("sets every figure in the ledger face, right-aligned, with Net strong and the deductions muted", async () => {
    const html = await render();
    const body = html.slice(html.indexOf("<tbody"));
    const cells = [...body.matchAll(/<td\b([^>]*)>(.*?)<\/td>/g)].slice(2, 6);
    expect(cells).toHaveLength(4);
    for (const c of cells) {
      expect(c[1]).toContain("text-right");
      expect(c[2]).toContain("font-mono");
    }
    expect(cells[3][1]).toContain("font-semibold");
    for (const c of cells.slice(0, 3)) expect(c[1]).not.toContain("font-semibold");
    expect(cells[1][2]).toContain("text-muted");
    expect(cells[2][2]).toContain("text-muted");
  });

  it("does not type a minus glyph next to Money (the primitive owns the sign)", () => {
    const src = readFileSync(PAGE_PATH, "utf8");
    expect(src).not.toMatch(/[−-]<Money/);
    // The only minus in the source is the `sign` prop value; none is typed as text.
    expect(src.replaceAll('sign="−"', "")).not.toContain("−");
    expect(src.split('sign="−"').length - 1).toBe(4); // two strip stats, two ledger columns
  });

  it("an empty ledger says so inside the table, header kept", async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    const html = await render();
    expect(html).toContain("<thead");
    expect(html).toContain('colSpan="6"');
    expect(rowCells(html)).toEqual([["Nothing to pay out yet Each paid order adds a line here with its fees and your net amount."]]);
  });
});

describe("payouts: queries", () => {
  it("pins the creator and paid orders on rows, totals and count alike (refunded orders drop out)", async () => {
    await render();
    const where = { creatorId: "cr_1", order: { status: "paid" } };
    expect(mocks.findMany.mock.calls[0][0].where).toEqual(where);
    expect(mocks.aggregate.mock.calls[0][0].where).toEqual(where);
    expect(mocks.count.mock.calls[0][0]).toEqual({ where });
  });

  it("sums the four columns over ALL entries and lists the latest 200 first", async () => {
    await render();
    expect(mocks.aggregate.mock.calls[0][0]._sum).toEqual({ grossPaise: true, platformFeePaise: true, gatewayFeePaise: true, netPaise: true });
    const args = mocks.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual({ createdAt: "desc" });
    expect(args.take).toBe(200);
    expect(args.include).toEqual({ order: { include: { product: true, user: true } } });
  });
});

describe("payouts: count-aware note", () => {
  it.each([1, 199, 200])("says nothing about a cap when the creator has %i entries", async (n) => {
    own(n);
    const html = await render();
    expect(rowCells(html)).toHaveLength(n);
    expect(text(html)).not.toMatch(/Showing the latest/);
  });

  it("at 201 shows the first 200 rows and says '200 of 201', and that totals include all of them", async () => {
    own(201);
    const html = await render();
    expect(rowCells(html)).toHaveLength(200);
    expect(text(html)).toContain("Showing the latest 200 of 201 entries. Totals above include all of them.");
  });
});

describe("payouts: copy honesty", () => {
  // Defect fixed here: the footnote said settlements arrive "in your Razorpay account", but payments run in test mode
  // (or on another gateway) and Tysonpe moves no money in this version.
  it("names no payment provider and says what this really is: a ledger, no money moved, test mode", async () => {
    const html = text(await render()).replace(/&#x27;/g, "'");
    expect(html).not.toMatch(/razorpay|easebuzz/i);
    expect(html).not.toMatch(/settlements arrive/i);
    expect(html).toMatch(/Ledger only/);
    expect(html).toMatch(/does not move money in this version/);
    expect(html).toMatch(/payments run in test mode/);
  });

  it("shows the plan key as stored (no label mapping exists in src/lib)", async () => {
    expect(text(await render())).toContain("Plan: pro.");
  });
});

describe("payouts: RSC boundary", () => {
  it("passes no function props and walks the table and strip primitives", async () => {
    const visited = new Set<unknown>();
    expect(functionProps(await call(), [], { onVisit: (t) => visited.add(t) })).toEqual([]);
    for (const type of [StatStrip, Table, MoneyCell]) expect(visited.has(type)).toBe(true);
  });

  it("the empty state is walked too", async () => {
    mocks.findMany.mockResolvedValue([]);
    const visited = new Set<unknown>();
    expect(functionProps(await call(), [], { onVisit: (t) => visited.add(t) })).toEqual([]);
    expect(visited.has(EmptyRow)).toBe(true);
  });

  it("positive control: the same walk reports a function prop planted in the page tree", async () => {
    const planted = (
      <>
        {await call()}
        <button onClick={() => {}}>x</button>
      </>
    );
    expect(functionProps(planted, [])).toEqual(["<button>.onClick"]);
  });
});

describe("payouts: source hygiene", () => {
  it("the page source has no legacy classes, ! utilities, glyphs or title tooltips", () => {
    expect(legacyStyleFindings(readFileSync(PAGE_PATH, "utf8"))).toEqual([]);
  });
});
