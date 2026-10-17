import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// The creator is cr_1. vi.mock factories are hoisted, so values are written inline there.
const mocks = vi.hoisted(() => ({
  findMany: vi.fn<(a: Record<string, unknown>) => Promise<unknown>>(),
  count: vi.fn<(a: Record<string, unknown>) => Promise<number>>(),
  userCount: vi.fn<(a: Record<string, unknown>) => Promise<number>>(),
}));

vi.mock("@/lib/auth/session", () => ({ requireCreator: async () => ({ user: {}, creator: { id: "cr_1" } }) }));
vi.mock("@/lib/db", () => ({ db: { enrollment: { findMany: mocks.findMany, count: mocks.count }, user: { count: mocks.userCount } } }));

import { Avatar, EmptyRow, Table } from "@/components/ui";
import { functionProps } from "@/test/rsc-safe";
import { legacyStyleFindings } from "@/test/style-scan";
import LearnersPage from "./dashboard/(console)/learners/page";

const PAGE_PATH = new URL("./dashboard/(console)/learners/page.tsx", import.meta.url);

const enrollment = (over: Record<string, unknown> = {}) => ({
  id: "e_1",
  userId: "u_1",
  createdAt: new Date("2026-10-15T06:30:00Z"),
  user: { name: "Asha Rao", email: "asha@example.com" },
  product: { title: "Bookkeeping for Small Shops" },
  ...over,
});

beforeEach(() => {
  for (const m of [mocks.findMany, mocks.count, mocks.userCount]) m.mockReset();
  mocks.findMany.mockResolvedValue([enrollment()]);
  mocks.count.mockResolvedValue(1);
  mocks.userCount.mockResolvedValue(1);
});

/** The creator has `owned` enrolments from `people` distinct learners; the query returns at most the 200-row cap, as the database would. */
function own(owned: number, people = owned) {
  mocks.findMany.mockImplementation(async () => Array.from({ length: Math.min(owned, 200) }, (_, i) => enrollment({ id: `e_${i}`, userId: `u_${i}` })));
  mocks.count.mockResolvedValue(owned);
  mocks.userCount.mockResolvedValue(people);
}

const call = async () => (await (LearnersPage as () => Promise<ReactNode>)()) as ReactNode;
const render = async () => renderToStaticMarkup(<>{await call()}</>);
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const rowCells = (html: string) => {
  const body = html.slice(html.indexOf("<tbody"));
  return [...body.matchAll(/<tr\b[^>]*>(.*?)<\/tr>/g)].map((r) => [...r[1].matchAll(/<td\b[^>]*>(.*?)<\/td>/g)].map((c) => text(c[1]).trim()));
};

describe("learners: structure", () => {
  it("is a named, stacking table: Learner, Product, Joined", async () => {
    const html = await render();
    expect(html).toContain('aria-label="Learners"');
    expect(html).toContain('data-stack="true"');
    expect([...html.matchAll(/<th\b[^>]*>(.*?)<\/th>/g)].map((m) => text(m[1]).trim())).toEqual(["Learner", "Product", "Joined"]);
    for (const l of ["Learner", "Product", "Joined"]) expect(html).toContain(`data-label="${l}"`);
  });

  it("uses no legacy .card or .table class and no rounded-xl", async () => {
    const html = await render();
    const tokens = [...html.matchAll(/\sclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
    expect(tokens).not.toContain("card");
    expect(tokens).not.toContain("table");
    expect(html).not.toContain("rounded-xl");
  });

  it("shows the avatar tile, name, email, product and a dated Joined cell", async () => {
    const html = await render();
    expect(rowCells(html)).toEqual([["A Asha Rao asha@example.com", "Bookkeeping for Small Shops", "15 Oct 2026"]]);
    expect(html).toMatch(/<time dateTime="2026-10-15T06:30:00.000Z">15 Oct 2026<\/time>/);
  });

  it("wraps a long email in full: break-all, never truncated, no title tooltip", async () => {
    const email = "demo-full-1792018295446-with-a-long-tail@test.tysonpe.test";
    mocks.findMany.mockResolvedValue([enrollment({ user: { name: "Asha Rao", email } })]);
    const html = await render();
    const cls = new RegExp(`<p class="([^"]*)">${email}</p>`).exec(html)![1].split(/\s+/);
    expect(cls).toContain("break-all");
    for (const c of ["truncate", "text-ellipsis", "overflow-hidden", "whitespace-nowrap"]) expect(cls, c).not.toContain(c);
    expect(cls.some((c) => c.startsWith("line-clamp"))).toBe(false);
    expect(html).not.toContain("title=");
    expect(text(html)).toContain(email);
  });
});

describe("learners: queries", () => {
  // One test per query, so a single dropped `creatorId` names which query lost its pin.
  const where = { product: { creatorId: "cr_1" } };

  it("pins the creator on the enrolment list query", async () => {
    await render();
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.findMany.mock.calls[0][0].where).toEqual(where);
  });

  it("pins the creator on the enrolment count query", async () => {
    await render();
    expect(mocks.count).toHaveBeenCalledTimes(1);
    expect(mocks.count.mock.calls[0][0]).toEqual({ where });
  });

  it("pins the creator on the people count: users who hold an enrolment in one of THIS creator's products", async () => {
    await render();
    expect(mocks.userCount).toHaveBeenCalledTimes(1);
    expect(mocks.userCount.mock.calls[0][0]).toEqual({ where: { enrollments: { some: where } } });
  });

  // Defect fixed here: findMany had no `take`, so a busy account loaded every enrolment.
  it("is newest first and bounded to 200, loading the user and product", async () => {
    await render();
    const args = mocks.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual({ createdAt: "desc" });
    expect(args.take).toBe(200);
    expect(args.include).toEqual({ user: true, product: true });
  });
});

describe("learners: people count", () => {
  // Defect fixed here: the sub line counted distinct users among the LOADED rows, so a capped list undercounted.
  it("comes from the database, not from the rows on the page", async () => {
    own(350, 340);
    const html = text(await render());
    expect(html).toContain("340 people have access to your products.");
    // The loaded rows hold 200 distinct users; that figure must not appear.
    expect(html).not.toContain("200 people");
  });

  it("is the same number when one person holds two products (distinct users, not enrolments)", async () => {
    mocks.findMany.mockResolvedValue([enrollment({ id: "e_1" }), enrollment({ id: "e_2", product: { title: "Second" } })]);
    mocks.count.mockResolvedValue(2);
    mocks.userCount.mockResolvedValue(1);
    expect(text(await render())).toContain("1 person has access to your products.");
  });

  it("reads 'Nobody has access yet' with no learners", async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    mocks.userCount.mockResolvedValue(0);
    expect(text(await render())).toContain("Nobody has access to your products yet.");
  });
});

describe("learners: count-aware note", () => {
  it.each([1, 199, 200])("says nothing about a cap when the creator has %i enrolments", async (n) => {
    own(n);
    const html = await render();
    expect(rowCells(html)).toHaveLength(n);
    expect(text(html)).not.toMatch(/Showing the latest/);
  });

  it("at 201 shows the first 200 rows and says '200 of 201'", async () => {
    own(201);
    const html = await render();
    expect(rowCells(html)).toHaveLength(200);
    expect(text(html)).toContain("Showing the latest 200 of 201 enrolments.");
  });

  it("names the real total far past the cap", async () => {
    own(1234);
    expect(text(await render())).toContain("Showing the latest 200 of 1234 enrolments.");
  });
});

describe("learners: empty state", () => {
  it("is honest, inside the table so the header stays", async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    mocks.userCount.mockResolvedValue(0);
    const html = await render();
    expect(html).toContain("<thead");
    expect(html).toContain('colSpan="3"');
    expect(rowCells(html)).toEqual([["No learners yet When someone buys a product they appear here."]]);
  });
});

describe("learners: RSC boundary", () => {
  it("passes no function props and walks the table primitives", async () => {
    const visited = new Set<unknown>();
    expect(functionProps(await call(), [], { onVisit: (t) => visited.add(t) })).toEqual([]);
    for (const type of [Table, Avatar]) expect(visited.has(type)).toBe(true);
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

describe("learners: source hygiene", () => {
  it("the page source has no legacy classes, ! utilities, glyphs or title tooltips", () => {
    expect(legacyStyleFindings(readFileSync(PAGE_PATH, "utf8"))).toEqual([]);
  });
});
