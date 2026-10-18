import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { headRowTags } from "@/test/table-rows";

const M = vi.hoisted(() => ({
  path: "/c/meera/community/leaderboard",
  requireUser: vi.fn<(next?: string) => Promise<unknown>>(),
  resolveCommunity: vi.fn<(handle: string, userId: string) => Promise<unknown>>(),
  ensureDefaultChannel: vi.fn<(creatorId: string) => Promise<void>>(),
  listChannelsFor: vi.fn<(creatorId: string, viewer: unknown) => Promise<unknown[]>>(),
  getLeaderboard: vi.fn<(creatorId: string, period: string, viewerId: string | null) => Promise<unknown>>(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({ usePathname: () => M.path, notFound: M.notFound }));
vi.mock("@/lib/auth/session", () => ({ requireUser: M.requireUser }));
vi.mock("@/lib/community/viewer", () => ({ resolveCommunity: M.resolveCommunity }));
vi.mock("@/lib/community/channels", () => ({ ensureDefaultChannel: M.ensureDefaultChannel, listChannelsFor: M.listChannelsFor }));
vi.mock("@/lib/gamification/service", () => ({ getLeaderboard: M.getLeaderboard }));

import { Avatar, Callout, EmptyRow, Table, Tabs } from "@/components/ui";
import { channel, classTokens, creator, elements as walk, learner, text } from "@/test/community-fixtures";
import { functionProps } from "@/test/rsc-safe";
import { legacyStyleFindings } from "@/test/style-scan";
import LeaderboardPage from "./(site)/c/[handle]/community/leaderboard/page";

const BOUNDARIES: unknown[] = [Tabs];
const PAGE_PATH = new URL("./(site)/c/[handle]/community/leaderboard/page.tsx", import.meta.url);
const USER = { id: "u_1", name: "Ravi Kumar" };
const elements = (node: ReactNode) => walk(node, BOUNDARIES);

type Row = { rank: number; name: string; points: number; level: number; isMe: boolean };
const row = (over: Partial<Row> = {}): Row => ({ rank: 1, name: "Neha I.", points: 340, level: 3, isMe: false, ...over });
const board = (top: Row[], me: { rank: number; points: number } | null = null) => ({ top, me });

beforeEach(() => {
  for (const m of Object.values(M)) if (typeof m === "function" && "mockReset" in m) (m as { mockReset: () => void }).mockReset();
  M.notFound.mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  });
  M.path = "/c/meera/community/leaderboard";
  M.requireUser.mockResolvedValue(USER);
  M.resolveCommunity.mockResolvedValue({ creator: creator(), viewer: learner() });
  M.listChannelsFor.mockResolvedValue([channel()]);
  M.getLeaderboard.mockResolvedValue(board([row(), row({ rank: 2, name: "Ravi K.", points: 120, level: 2, isMe: true }), row({ rank: 2, name: "Arjun R.", points: 120, level: 2 })]));
});

const page = async (sp: Record<string, string | string[] | undefined> = {}) =>
  (await (LeaderboardPage as (p: { params: Promise<{ handle: string }>; searchParams: Promise<typeof sp> }) => Promise<ReactNode>)({
    params: Promise.resolve({ handle: "meera" }),
    searchParams: Promise.resolve(sp),
  })) as ReactNode;
const render = async (sp: Record<string, string | string[] | undefined> = {}) => renderToStaticMarkup(<>{await page(sp)}</>);
const rows = (html: string) => {
  const body = html.slice(html.indexOf("<tbody"));
  return [...body.matchAll(/<tr\b([^>]*)>(.*?)<\/tr>/g)].map((r) => ({
    attrs: r[1],
    cells: [...r[2].matchAll(/<td\b[^>]*>(.*?)<\/td>/g)].map((c) => text(c[1]).trim()),
  }));
};

describe("leaderboard: the period switch", () => {
  it("is Tabs in link mode named 'Leaderboard period', with the query-string hrefs", async () => {
    const tabs = elements(await page()).find((e) => e.type === Tabs)!;
    expect(tabs.props.ariaLabel).toBe("Leaderboard period");
    expect(tabs.props.items.map((i: { href: string; label: string }) => [i.href, i.label])).toEqual([
      ["/c/meera/community/leaderboard?period=week", "This week"],
      ["/c/meera/community/leaderboard?period=all", "All time"],
    ]);
    expect("onChange" in tabs.props).toBe(false);
  });

  it("period links use the brand ring colour for focus (offset stays the global one: the row has room)", async () => {
    const tabs = elements(await page()).find((e) => e.type === Tabs)!;
    expect(tabs.props.className).toContain("[&>a:focus-visible]:outline-[color:var(--brand-ring)]");
    expect(tabs.props.className).not.toContain("!");
  });

  it("defaults to this week; anything but period=all means this week", async () => {
    for (const sp of [{}, { period: "week" }, { period: "ALL" }, { period: "x" }, { period: ["all", "week"] }, { period: undefined }]) {
      M.getLeaderboard.mockClear();
      const tabs = elements(await page(sp)).find((e) => e.type === Tabs)!;
      expect(tabs.props.items.map((i: { current: boolean }) => i.current), JSON.stringify(sp)).toEqual([true, false]);
      expect(M.getLeaderboard.mock.calls[0][1]).toBe("week");
    }
  });

  it("period=all selects All time and asks for the all-time board", async () => {
    const tabs = elements(await page({ period: "all" })).find((e) => e.type === Tabs)!;
    expect(tabs.props.items.map((i: { current: boolean }) => i.current)).toEqual([false, true]);
    expect(M.getLeaderboard).toHaveBeenCalledWith("cr_1", "all", "u_1");
  });

  it("renders as a nav with aria-current on exactly the selected period", async () => {
    const html = await render({ period: "all" });
    expect(html).toContain('<nav aria-label="Leaderboard period"');
    const links = [...html.matchAll(/<a\b([^>]*)>/g)].map((m) => [/href="([^"]*)"/.exec(m[1])![1], /aria-current="([^"]*)"/.exec(m[1])?.[1] ?? null]);
    expect(links).toEqual([
      ["/c/meera/community/leaderboard?period=week", null],
      ["/c/meera/community/leaderboard?period=all", "page"],
    ]);
  });
});

describe("leaderboard: the ranking table", () => {
  it("is a named, stacking Table: Rank, Member, Level, Points", async () => {
    const html = await render();
    expect(html).toContain('aria-label="Leaderboard"');
    expect(html).toContain('data-stack="true"');
    expect([...html.matchAll(/<th\b[^>]*>(.*?)<\/th>/g)].map((m) => text(m[1]).trim())).toEqual(["Rank", "Member", "Level", "Points"]);
    for (const l of ["Rank", "Member", "Level", "Points"]) expect(html).toContain(`data-label="${l}"`);
    expect(elements(await page()).some((e) => e.type === Table)).toBe(true);
  });

  it("marks its header row role=row, like every body row", async () => {
    expect(headRowTags(await render())).toEqual(['<tr role="row">']);
  });

  it("lists each member with an Avatar tile, name, level and points, ties sharing a rank", async () => {
    const html = await render();
    expect(rows(html).map((r) => r.cells)).toEqual([
      ["1", "N Neha I.", "3", "340"],
      ["2", "R Ravi K. (you)", "2", "120"],
      ["2", "A Arjun R.", "2", "120"],
    ]);
    expect(elements(await page()).filter((e) => e.type === Avatar).map((e) => e.props.name)).toEqual(["Neha I.", "Ravi K.", "Arjun R."]);
  });

  it("marks the viewer's row in words and in aria-current, with the tint only as a reinforcement", async () => {
    const html = await render();
    const [first, mine, other] = rows(html);
    expect(mine.attrs).toContain('aria-current="true"');
    expect(mine.attrs).toContain("bg-brand-soft");
    expect(mine.cells[1]).toContain("(you)");
    for (const r of [first, other]) {
      expect(r.attrs).not.toContain("aria-current");
      expect(r.cells[1]).not.toContain("(you)");
    }
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
  });

  it("uses tabular figures for rank, level and points, and no badge, pill or .card", async () => {
    const html = await render();
    expect(html.match(/tabular-nums/g)!.length).toBeGreaterThanOrEqual(9);
    const tokens = classTokens(html);
    for (const t of ["card", "badge", "badge-muted", "rounded-full"]) expect(tokens, t).not.toContain(t);
    expect(html).not.toContain("rounded-xl");
    // The stacked rank cell must not be forced to 4rem wide on phones.
    expect(tokens).not.toContain("w-16");
    expect(tokens).toContain("sm:w-16");
  });

  it("wraps a long name instead of truncating it", async () => {
    M.getLeaderboard.mockResolvedValue(board([row({ name: "Venkatasubramanian Ramachandran-Iyer K." })]));
    const html = await render();
    expect(html).toContain("Venkatasubramanian Ramachandran-Iyer K.");
    expect(html).toMatch(/<span class="min-w-0 break-words font-semibold">Venkatasubramanian/);
    expect(html).not.toContain("truncate");
  });

  it("escapes a name", async () => {
    M.getLeaderboard.mockResolvedValue(board([row({ name: "<b>x</b>" })]));
    expect(await render()).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});

describe("leaderboard: empty board and the viewer's own standing", () => {
  it("an empty week says so, and points at what earns points", async () => {
    M.getLeaderboard.mockResolvedValue(board([]));
    const html = await render();
    expect(text(html)).toContain("No points this week yet");
    expect(text(html)).toContain("Complete a lesson or start a conversation to get on the board.");
    expect(elements(await page()).some((e) => e.type === EmptyRow)).toBe(true);
    expect(classTokens(html)).not.toContain("card");
  });

  it("an empty all-time board says 'No points yet'", async () => {
    M.getLeaderboard.mockResolvedValue(board([]));
    const html = await render({ period: "all" });
    expect(text(html)).toContain("No points yet");
    expect(text(html)).not.toContain("this week yet");
  });

  it("a viewer outside the top gets an info Callout with their rank and points", async () => {
    M.getLeaderboard.mockResolvedValue(board([row()], { rank: 41, points: 12 }));
    const callout = elements(await page()).find((e) => e.type === Callout)!;
    expect(callout.props.tone).toBe("info");
    const html = await render();
    expect(text(html)).toContain("You're ranked #41 with 12 points.");
  });

  it("no Callout when the viewer is on the board, or has no standing", async () => {
    // On the board: the API also reports `me`, and repeating it under the table would be noise.
    M.getLeaderboard.mockResolvedValue(board([row(), row({ rank: 2, isMe: true })], { rank: 2, points: 340 }));
    expect(elements(await page()).some((e) => e.type === Callout)).toBe(false);
    M.getLeaderboard.mockResolvedValue(board([row()], null));
    expect(elements(await page()).some((e) => e.type === Callout)).toBe(false);
  });

  it("keeps the explanation of what counts and how names are shown", async () => {
    const t = text(await render());
    expect(t).toContain("Points from lessons, quizzes, courses and community activity. Weeks start Monday, IST.");
    expect(t).toContain("Members are shown by first name and last initial.");
  });
});

describe("leaderboard: access", () => {
  it("loads the board for this creator and viewer", async () => {
    await page();
    expect(M.requireUser).toHaveBeenCalledWith("/c/meera/community/leaderboard");
    expect(M.resolveCommunity).toHaveBeenCalledWith("meera", "u_1");
    expect(M.getLeaderboard).toHaveBeenCalledWith("cr_1", "week", "u_1");
  });

  it("is a 404 for an unknown community, a community with points off, and a viewer with no channel (members only)", async () => {
    M.resolveCommunity.mockResolvedValue(null);
    await expect(page()).rejects.toThrow("NEXT_NOT_FOUND");
    M.resolveCommunity.mockResolvedValue({ creator: creator({ gamificationEnabled: false }), viewer: learner() });
    await expect(page()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(M.getLeaderboard).not.toHaveBeenCalled();
    M.resolveCommunity.mockResolvedValue({ creator: creator(), viewer: learner({ enrolledProductIds: [] }) });
    M.listChannelsFor.mockResolvedValue([]);
    await expect(page()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(M.getLeaderboard).not.toHaveBeenCalled();
  });

  it("creates the default channel for the creator before checking channels", async () => {
    await page();
    expect(M.ensureDefaultChannel).not.toHaveBeenCalled();
    M.resolveCommunity.mockResolvedValue({ creator: creator(), viewer: learner({ isCreator: true }) });
    await page();
    expect(M.ensureDefaultChannel).toHaveBeenCalledWith("cr_1");
    expect(M.listChannelsFor).toHaveBeenLastCalledWith("cr_1", expect.objectContaining({ isCreator: true }));
  });
});

describe("leaderboard: RSC boundary and source", () => {
  it("passes no function props anywhere, with Tabs a client boundary", async () => {
    const visited = new Set<unknown>();
    expect(functionProps(await page(), BOUNDARIES, { onVisit: (t) => visited.add(t) })).toEqual([]);
    for (const t of [Tabs, Table, Avatar]) expect(visited.has(t)).toBe(true);
    M.getLeaderboard.mockResolvedValue(board([]));
    const empty = new Set<unknown>();
    expect(functionProps(await page(), BOUNDARIES, { onVisit: (t) => empty.add(t) })).toEqual([]);
    expect(empty.has(EmptyRow)).toBe(true);
  });

  it("positive control: a planted handler is reported", async () => {
    expect(functionProps(<>{await page()}<button onClick={() => {}}>x</button></>, BOUNDARIES)).toContain("<button>.onClick");
  });

  it("has no non-null assertion on the period lookup", () => {
    expect(readFileSync(PAGE_PATH, "utf8")).not.toMatch(/\)!\./);
  });

  it("passes the style scan and no longer builds chips by hand", () => {
    const src = readFileSync(PAGE_PATH, "utf8");
    expect(legacyStyleFindings(src)).toEqual([]);
    expect(src).not.toMatch(/chipActive|chipIdle|\bbadge\b|\bcard\b/);
  });
});

describe("leaderboard: heading and column alignment", () => {
  it("titles the page 'Leaderboard' at heading level 2 under the channel heading", async () => {
    expect(await render()).toMatch(/<h2 class="text-xl font-bold">Leaderboard<\/h2>/);
  });

  it("right-aligns only the Points column, in the header and in every row (numbers line up on their right edge)", async () => {
    const html = await render();
    const ths = [...html.matchAll(/<th\b([^>]*)>(.*?)<\/th>/g)].map((m) => [text(m[2]).trim(), /class="([^"]*)"/.exec(m[1])![1].split(/\s+/)] as const);
    expect(ths.map(([label]) => label)).toEqual(["Rank", "Member", "Level", "Points"]);
    for (const [label, cls] of ths) {
      if (label === "Points") expect(cls).toContain("text-right");
      else expect(cls, label).toContain("text-left");
      if (label === "Points") expect(cls).not.toContain("text-left");
    }
    const tds = [...html.matchAll(/<td\b([^>]*)>/g)].map((m) => ({ label: /data-label="([^"]*)"/.exec(m[1])![1], cls: /class="([^"]*)"/.exec(m[1])![1].split(/\s+/) }));
    expect(tds).toHaveLength(12);
    for (const { label, cls } of tds) {
      if (label === "Points") expect(cls).toContain("text-right");
      else expect(cls, label).not.toContain("text-right");
    }
  });

  it("the empty row spans all four columns", async () => {
    M.getLeaderboard.mockResolvedValue(board([]));
    expect(elements(await page()).find((e) => e.type === EmptyRow)!.props.colSpan).toBe(4);
    expect(await render()).toContain('colSpan="4"');
  });
});
