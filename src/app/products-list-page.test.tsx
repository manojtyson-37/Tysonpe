import type { ReactNode } from "react";
import Link from "next/link";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// The creator is cr_1. vi.mock factories are hoisted, so the id is written inline there.
const mocks = vi.hoisted(() => ({
  findMany: vi.fn<(a: Record<string, unknown>) => Promise<unknown>>(),
}));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
  usePathname: () => "/dashboard/products",
}));
vi.mock("@/lib/auth/session", () => ({ requireCreator: async () => ({ user: {}, creator: { id: "cr_1" } }) }));
vi.mock("@/lib/db", () => ({ db: { product: { findMany: mocks.findMany } } }));

import { ButtonLink, EmptyRow, StatusBadge, Table } from "@/components/ui";
import { formatINR } from "@/lib/format";
import { functionProps } from "@/test/rsc-safe";
import ProductsPage from "./dashboard/(console)/products/page";

const product = (over: Record<string, unknown> = {}) => ({
  id: "p_1",
  title: "Bookkeeping for Small Shops",
  type: "course",
  status: "published",
  pricePaise: 49900,
  _count: { enrollments: 12, items: 4 },
  ...over,
});

beforeEach(() => {
  mocks.findMany.mockReset();
  mocks.findMany.mockResolvedValue([product()]);
});

async function render(): Promise<string> {
  const tree: ReactNode = await ProductsPage();
  return renderToStaticMarkup(<>{tree}</>);
}
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const rowCells = (html: string) => {
  const body = html.slice(html.indexOf("<tbody"));
  return [...body.matchAll(/<tr\b[^>]*>(.*?)<\/tr>/g)].map((r) => [...r[1].matchAll(/<td\b[^>]*>(.*?)<\/td>/g)].map((c) => text(c[1]).trim()));
};

describe("products list: structure", () => {
  it("is a named, stacking table with the five columns in order", async () => {
    const html = await render();
    expect(html).toContain('aria-label="Products"');
    expect(html).toContain('data-stack="true"');
    expect([...html.matchAll(/<th\b[^>]*>(.*?)<\/th>/g)].map((m) => text(m[1]).trim())).toEqual([
      "Product",
      "Type",
      "Price",
      "Learners",
      "Status",
    ]);
  });

  it("has a New product button link in the header", async () => {
    const html = await render();
    expect(html).toMatch(/<a [^>]*href="\/dashboard\/products\/new"[^>]*>New product<\/a>/);
  });

  it("uses no legacy .card or .table class, and no brand-coloured hover text", async () => {
    const html = await render();
    expect(html).not.toMatch(/class="[^"]*\bcard\b/);
    expect(html).not.toMatch(/class="[^"]*\btable\b/);
    expect(html).not.toContain("hover:text-brand");
  });
});

describe("products list: rows", () => {
  it("links the title to the product, and gives type, learners and status", async () => {
    const html = await render();
    expect(html).toMatch(/<a [^>]*href="\/dashboard\/products\/p_1"[^>]*>Bookkeeping for Small Shops<\/a>/);
    expect(rowCells(html)).toEqual([["Bookkeeping for Small Shops 4 lessons", "Course", formatINR(49900), "12", "Published"]]);
  });

  it("says '1 lesson' for one lesson and '0 lessons' for none", async () => {
    mocks.findMany.mockResolvedValue([
      product({ id: "p_1", _count: { enrollments: 0, items: 1 } }),
      product({ id: "p_2", _count: { enrollments: 0, items: 0 } }),
    ]);
    const t = text(await render());
    expect(t).toContain("1 lesson");
    expect(t).not.toContain("1 lessons");
    expect(t).toContain("0 lessons");
  });

  it("prints Free for a zero price and formatINR for a paid one", async () => {
    mocks.findMany.mockResolvedValue([
      product({ id: "p_1", pricePaise: 0, type: "download" }),
      product({ id: "p_2", pricePaise: 150000 }),
    ]);
    const cells = rowCells(await render());
    expect(cells[0][2]).toBe("Free");
    expect(cells[1][2]).toBe(formatINR(150000));
  });

  it("labels the status with the shared badge, draft and published alike", async () => {
    mocks.findMany.mockResolvedValue([product({ id: "p_1", status: "draft" }), product({ id: "p_2", status: "published" })]);
    const cells = rowCells(await render());
    expect(cells.map((c) => c[4])).toEqual(["Draft", "Published"]);
  });

  it("falls back to the raw type for an unknown type", async () => {
    mocks.findMany.mockResolvedValue([product({ type: "bootcamp" })]);
    expect(rowCells(await render())[0][1]).toBe("bootcamp");
  });

  it("stacks with a data-label on every cell", async () => {
    const html = await render();
    for (const l of ["Product", "Type", "Price", "Learners", "Status"]) expect(html).toContain(`data-label="${l}"`);
  });
});

describe("products list: empty state", () => {
  it("says so and offers the first product, with no rows", async () => {
    mocks.findMany.mockResolvedValue([]);
    const html = await render();
    expect(text(html)).toContain("No products yet");
    expect(html).toMatch(/<a [^>]*href="\/dashboard\/products\/new"[^>]*>Create your first product<\/a>/);
    expect(html).toContain('colSpan="5"');
  });
});

describe("products list: query", () => {
  it("is scoped to the signed-in creator", async () => {
    await render();
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    const args = mocks.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ creatorId: "cr_1" });
  });

  it("is newest first and bounded", async () => {
    await render();
    const args = mocks.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual({ createdAt: "desc" });
    expect(args.take).toBe(200);
  });

  it("only mentions the cap when it is reached", async () => {
    expect(text(await render())).not.toContain("latest 200");
    mocks.findMany.mockResolvedValue(Array.from({ length: 200 }, (_, i) => product({ id: `p_${i}` })));
    expect(text(await render())).toContain("Showing your latest 200 products");
  });
});

describe("products list: RSC boundary", () => {
  const call = async () => (await ProductsPage()) as ReactNode;

  it("passes no function props, with next/link declared as the client boundary", async () => {
    const visited = new Set<unknown>();
    expect(functionProps(await call(), [Link], { onVisit: (t) => visited.add(t) })).toEqual([]);
    for (const type of [Table, ButtonLink, StatusBadge]) expect(visited.has(type)).toBe(true);
  });

  it("empty state is walked too", async () => {
    mocks.findMany.mockResolvedValue([]);
    const visited = new Set<unknown>();
    expect(functionProps(await call(), [Link], { onVisit: (t) => visited.add(t) })).toEqual([]);
    expect(visited.has(EmptyRow)).toBe(true);
  });

  it("positive control: the same walk reports a function prop planted in the page tree", async () => {
    const planted = (
      <>
        {await call()}
        <button onClick={() => {}}>x</button>
      </>
    );
    expect(functionProps(planted, [Link])).toEqual(["<button>.onClick"]);
  });
});
