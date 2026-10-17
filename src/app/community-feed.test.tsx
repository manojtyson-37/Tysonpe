import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// The learner is u_1 on creator cr_1 (handle meera). vi.mock factories are hoisted, so everything they use is in vi.hoisted.
const M = vi.hoisted(() => {
  const action = (name: string) => {
    const fn = (() => undefined) as unknown as { bind: (...a: unknown[]) => unknown };
    fn.bind = (_this: unknown, ...args: unknown[]) => Object.assign(() => undefined, { action: name, args });
    return Object.assign(fn, { action: name });
  };
  return {
    path: "/c/meera/community/general",
    getCurrentUser: vi.fn<() => Promise<unknown>>(),
    requireUser: vi.fn<(next?: string) => Promise<unknown>>(),
    resolveCommunity: vi.fn<(handle: string, userId: string) => Promise<unknown>>(),
    ensureDefaultChannel: vi.fn<(creatorId: string) => Promise<void>>(),
    listChannelsFor: vi.fn<(creatorId: string, viewer: unknown) => Promise<unknown[]>>(),
    getChannelFor: vi.fn<(creatorId: string, slug: string, viewer: unknown) => Promise<unknown>>(),
    listPosts: vi.fn<(a: Record<string, unknown>) => Promise<unknown>>(),
    getProfile: vi.fn<(userId: string, creatorId: string) => Promise<unknown>>(),
    notFound: vi.fn(() => {
      throw new Error("NEXT_NOT_FOUND");
    }),
    createPostAction: action("createPostAction"),
    toggleLikeAction: action("toggleLikeAction"),
    setPinnedAction: action("setPinnedAction"),
    deletePostAction: action("deletePostAction"),
    banMemberAction: action("banMemberAction"),
  };
});

vi.mock("next/navigation", () => ({ usePathname: () => M.path, notFound: M.notFound }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: M.getCurrentUser, requireUser: M.requireUser }));
vi.mock("@/lib/community/viewer", () => ({ resolveCommunity: M.resolveCommunity }));
vi.mock("@/lib/community/channels", () => ({
  ensureDefaultChannel: M.ensureDefaultChannel,
  listChannelsFor: M.listChannelsFor,
  getChannelFor: M.getChannelFor,
}));
vi.mock("@/lib/community/posts", () => ({ listPosts: M.listPosts }));
vi.mock("@/lib/gamification/service", () => ({ getProfile: M.getProfile }));
vi.mock("@/app/actions/community", () => ({
  createPostAction: M.createPostAction,
  toggleLikeAction: M.toggleLikeAction,
  setPinnedAction: M.setPinnedAction,
  deletePostAction: M.deletePostAction,
}));
vi.mock("@/app/actions/community-admin", () => ({ banMemberAction: M.banMemberAction }));

import { ConfirmButton } from "@/components/ConfirmButton";
import { ChannelNav } from "@/components/community/ChannelNav";
import { LikeSubmit } from "@/components/community/LikeSubmit";
import { PostComposer } from "@/components/community/PostComposer";
import { ButtonLink, Callout, EmptyState } from "@/components/ui";
import { AppError } from "@/lib/errors";
import { channel, classTokens, creator, elements as walk, learner, post, profile, text } from "@/test/community-fixtures";
import { functionProps } from "@/test/rsc-safe";
import { legacyStyleFindings } from "@/test/style-scan";
import CommunityLayout from "./(site)/c/[handle]/community/layout";
import ChannelPage from "./(site)/c/[handle]/community/[channel]/page";

const BOUNDARIES: unknown[] = [ChannelNav, ConfirmButton, LikeSubmit, PostComposer];
const LAYOUT_PATH = new URL("./(site)/c/[handle]/community/layout.tsx", import.meta.url);
const PAGE_PATH = new URL("./(site)/c/[handle]/community/[channel]/page.tsx", import.meta.url);

const elements = (node: ReactNode) => walk(node, BOUNDARIES);
const USER = { id: "u_1", name: "Ravi Kumar" };
const params = (over: Record<string, string> = {}) => Promise.resolve({ handle: "meera", ...over });

function setup({ viewer = learner(), c = creator(), channels = [channel()] }: { viewer?: Record<string, unknown>; c?: Record<string, unknown>; channels?: unknown[] } = {}) {
  M.getCurrentUser.mockResolvedValue(USER);
  M.requireUser.mockResolvedValue(USER);
  M.resolveCommunity.mockResolvedValue({ creator: c, viewer });
  M.listChannelsFor.mockResolvedValue(channels);
  M.getChannelFor.mockResolvedValue(channels[0] ?? null);
  M.getProfile.mockResolvedValue(profile());
  M.listPosts.mockResolvedValue({ posts: [post()], nextCursor: null });
}

beforeEach(() => {
  for (const m of Object.values(M)) if (typeof m === "function" && "mockReset" in m) (m as { mockReset: () => void }).mockReset();
  M.notFound.mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  });
  M.path = "/c/meera/community/general";
  setup();
});

const layout = async (over: { handle?: string } = {}) =>
  (await (CommunityLayout as (p: { children: ReactNode; params: Promise<{ handle: string }> }) => Promise<ReactNode>)({ children: <div id="feed">FEED</div>, params: params(over) })) as ReactNode;
const renderLayout = async () => renderToStaticMarkup(<>{await layout()}</>);

const channelPage = async (slug = "general", sp: Record<string, string | string[] | undefined> = {}) =>
  (await (ChannelPage as (p: { params: Promise<{ handle: string; channel: string }>; searchParams: Promise<typeof sp> }) => Promise<ReactNode>)({
    params: params({ channel: slug }) as Promise<{ handle: string; channel: string }>,
    searchParams: Promise.resolve(sp),
  })) as ReactNode;
const renderPage = async (slug = "general", sp: Record<string, string | string[] | undefined> = {}) => renderToStaticMarkup(<>{await channelPage(slug, sp)}</>);

describe("community layout: heading and the empty states", () => {
  it("has no eyebrow above the heading; the screen-reader 'Community: ' prefix stays", async () => {
    const html = await renderLayout();
    expect(html).not.toMatch(/<p[^>]*aria-hidden[^>]*>\s*Community\s*<\/p>/);
    expect(html.slice(0, html.indexOf("<h1"))).not.toContain("uppercase");
    expect(html.indexOf("<h1")).toBeLessThan(html.indexOf("<nav"));
    expect(html).toMatch(/<h1[^>]*><span class="sr-only">Community: <\/span><a [^>]*href="\/c\/meera"[^>]*>Meera Shah<\/a><\/h1>/);
    expect(html.slice(0, html.indexOf("<h1"))).not.toContain("Community");
  });

  const cases: Array<[string, Record<string, unknown>, string, string, boolean]> = [
    ["not a customer", { enrolledProductIds: [] }, "This community is for people who've bought from this creator", "Customers of this creator get access here.", true],
    ["a customer with no open channel", {}, "No channels are open to you yet", "Meera Shah hasn't opened a channel for your purchase yet. Check back soon.", false],
    ["banned", { banned: true }, "You've been removed from this community", "The creator has removed your access. Contact them if you think this is a mistake.", false],
  ];
  it.each(cases)("%s: a ruled block (no .card box), with the call to action only when the visitor can buy", async (_n, v, title, body, cta) => {
    setup({ viewer: learner(v), channels: [] });
    const html = await renderLayout();
    expect(text(html)).toContain(title);
    expect(text(html)).toContain(body);
    expect(html).toMatch(/<div class="mt-6 max-w-xl border-y border-line py-6">/);
    expect(classTokens(html)).not.toContain("card");
    expect(html).not.toContain("rounded-xl");
    // No channels means no nav and no feed.
    expect(html).not.toContain('aria-label="Community channels"');
    expect(html).not.toContain("FEED");
    if (cta) {
      const link = /<a [^>]*href="\/c\/meera"[^>]*class="([^"]*)"[^>]*>See what Meera Shah offers<\/a>|<a [^>]*class="([^"]*)"[^>]*href="\/c\/meera"[^>]*>See what Meera Shah offers<\/a>/.exec(html);
      expect(link, "call to action").not.toBeNull();
      const cls = (link![1] ?? link![2]).split(/\s+/);
      expect(cls).toEqual(expect.arrayContaining(["btn", "btn-primary", "pointer-coarse:min-h-11"]));
    } else {
      expect(html).not.toContain("See what");
    }
  });

  it("the call to action is the ButtonLink primitive, not a hand-typed class string", async () => {
    setup({ viewer: learner({ enrolledProductIds: [] }), channels: [] });
    const link = elements(await layout()).find((e) => e.type === ButtonLink)!;
    expect(link.props.href).toBe("/c/meera");
    expect(link.props.variant).toBeUndefined();
  });
});

describe("community layout: access and data", () => {
  it("renders just the children for a logged-out visitor (the page does the login redirect), and loads nothing", async () => {
    M.getCurrentUser.mockResolvedValue(null);
    const html = await renderLayout();
    expect(html).toBe('<div id="feed">FEED</div>');
    expect(M.resolveCommunity).not.toHaveBeenCalled();
  });

  it("is a 404 for an unknown handle", async () => {
    M.resolveCommunity.mockResolvedValue(null);
    await expect(layout()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("resolves the handle for THIS user and lists channels for this creator and viewer", async () => {
    const viewer = learner();
    setup({ viewer });
    await layout();
    expect(M.resolveCommunity).toHaveBeenCalledWith("meera", "u_1");
    expect(M.listChannelsFor).toHaveBeenCalledWith("cr_1", viewer);
  });

  it("creates the default channel only for the creator", async () => {
    await layout();
    expect(M.ensureDefaultChannel).not.toHaveBeenCalled();
    setup({ viewer: learner({ isCreator: true }) });
    await layout();
    expect(M.ensureDefaultChannel).toHaveBeenCalledWith("cr_1");
  });

  it("loads the progress profile for a learner of a points-enabled community, with this user and creator", async () => {
    await layout();
    expect(M.getProfile).toHaveBeenCalledWith("u_1", "cr_1");
  });

  it.each([
    ["points are off", { c: creator({ gamificationEnabled: false }) }],
    ["the viewer is the creator", { viewer: learner({ isCreator: true }) }],
    ["there are no channels", { channels: [] }],
  ])("loads no profile when %s", async (_n, over) => {
    setup(over);
    await layout();
    expect(M.getProfile).not.toHaveBeenCalled();
  });

  it("hands the nav the handle, the channels it may show and whether there is a leaderboard", async () => {
    setup({ channels: [channel(), channel({ id: "ch_2", slug: "news", name: "News", kind: "announcement" })] });
    const nav = elements(await layout()).find((e) => e.type === ChannelNav)!;
    expect(nav.props.handle).toBe("meera");
    expect(nav.props.showLeaderboard).toBe(true);
    expect(nav.props.channels).toEqual([
      { slug: "general", name: "General", kind: "discussion", access: "open" },
      { slug: "news", name: "News", kind: "announcement", access: "open" },
    ]);
    setup({ c: creator({ gamificationEnabled: false }) });
    expect(elements(await layout()).find((e) => e.type === ChannelNav)!.props.showLeaderboard).toBe(false);
  });
});

// The mobile overflow fix (025b6c2): one minmax(0,1fr) column below lg, in DOM order nav, compact summary, feed, full card.
describe("community layout: the grid that stops mobile overflow", () => {
  it("is a single minmax(0,1fr) column below lg; every grid child can shrink (min-w-0)", async () => {
    const html = await renderLayout();
    const grid = /<div class="(mt-6 grid [^"]*)">/.exec(html)![1];
    const tokens = grid.split(/\s+/);
    expect(tokens).toContain("grid-cols-[minmax(0,1fr)]");
    expect(tokens).toContain("lg:grid-cols-[200px_minmax(0,1fr)]");
    expect(tokens).toContain("xl:grid-cols-[200px_minmax(0,1fr)_240px]");
    expect(tokens).toContain("gap-6");
    const body = html.slice(html.indexOf(grid));
    const children = [...body.matchAll(/<div class="([^"]*\bmin-w-0\b[^"]*)"/g)].map((m) => m[1]);
    expect(children.length).toBeGreaterThanOrEqual(4);
    for (const c of children) expect(c.split(/\s+/)).toContain("min-w-0");
  });

  it("keeps the DOM order: channel nav, compact progress, feed, full progress card", async () => {
    const html = await renderLayout();
    const at = (needle: string) => html.indexOf(needle);
    expect(at('aria-label="Community channels"')).toBeGreaterThan(-1);
    expect(at('aria-label="Community channels"')).toBeLessThan(at("lg:hidden"));
    expect(at("lg:hidden")).toBeLessThan(at('id="feed"'));
    expect(at('id="feed"')).toBeLessThan(at('aria-label="Your progress"'));
  });

  it("without a profile the grid is two columns from lg and has no progress copy", async () => {
    setup({ c: creator({ gamificationEnabled: false }) });
    const html = await renderLayout();
    expect(html).toContain("lg:grid-cols-[200px_minmax(0,1fr)]");
    expect(html).not.toContain("xl:grid-cols-[200px_minmax(0,1fr)_240px]");
    expect(html).not.toContain("Your progress");
  });
});

describe("community layout: security note, RSC boundary and source", () => {
  it("the page walk finds no function props: ChannelNav is a client boundary and gets only data", async () => {
    const visited = new Set<unknown>();
    expect(functionProps(await layout(), BOUNDARIES, { onVisit: (t) => visited.add(t) })).toEqual([]);
    expect(visited.has(ChannelNav)).toBe(true);
    // The empty state is walked too.
    setup({ viewer: learner({ enrolledProductIds: [] }), channels: [] });
    const v2 = new Set<unknown>();
    expect(functionProps(await layout(), BOUNDARIES, { onVisit: (t) => v2.add(t) })).toEqual([]);
    expect(v2.has(ButtonLink)).toBe(true);
  });

  it("positive control: the walk reports a handler planted in the tree", async () => {
    expect(functionProps(<>{await layout()}<button onClick={() => {}}>x</button></>, BOUNDARIES)).toContain("<button>.onClick");
  });

  it("keeps the 'every page must call requireUser' security comment and passes the style scan", () => {
    const src = readFileSync(LAYOUT_PATH, "utf8");
    expect(src).toContain("SECURITY: every page under community/ MUST call requireUser");
    expect(legacyStyleFindings(src)).toEqual([]);
  });
});

describe("channel page: header and notice", () => {
  it("shows the name and description, then one quiet meta line instead of two pills", async () => {
    const html = await renderPage();
    expect(html).toMatch(/<h2 class="[^"]*">General<\/h2>/);
    expect(text(html)).toContain("Say hello.");
    expect(text(html)).toContain("Type: Discussion · Access: All customers");
    expect(html).toMatch(/<p class="t-meta mt-1"><span class="sr-only">Type: <\/span>Discussion <span aria-hidden="true">·<\/span> <span class="sr-only">Access: <\/span>All customers<\/p>/);
    expect(classTokens(html)).not.toContain("badge");
    expect(html).not.toMatch(/badge-/);
  });

  it("says Announcements and Selected products for a gated announcement channel", async () => {
    setup({ channels: [channel({ kind: "announcement", access: "product_gated" })] });
    expect(text(await renderPage())).toContain("Type: Announcements · Access: Selected products");
  });

  it("omits the description line when there is none", async () => {
    setup({ channels: [channel({ description: "" })] });
    const html = await renderPage();
    expect(html).not.toContain("Say hello.");
    expect(html).not.toContain("mt-0.5");
  });

  it("shows the composer to someone who may post, and no notice", async () => {
    const els = elements(await channelPage());
    expect(els.find((e) => e.type === PostComposer)!.props.channelId).toBe("ch_1");
    expect(els.some((e) => e.type === Callout)).toBe(false);
  });

  it("on a channel only the creator posts to: an info Callout, no .card box, no composer", async () => {
    setup({ channels: [channel({ kind: "announcement" })] });
    const els = elements(await channelPage());
    const callout = els.find((e) => e.type === Callout)!;
    expect(callout.props.tone).toBe("info");
    expect(els.some((e) => e.type === PostComposer)).toBe(false);
    const html = await renderPage();
    expect(text(html)).toContain("Only Meera Shah posts here. You can still comment and like.");
    expect(classTokens(html)).not.toContain("card");
  });

  it("the creator may post to an announcement channel", async () => {
    setup({ viewer: learner({ isCreator: true }), channels: [channel({ kind: "announcement" })] });
    expect(elements(await channelPage()).some((e) => e.type === PostComposer)).toBe(true);
  });
});

describe("channel page: the feed", () => {
  it("is a ruled list, one item per post, with no card per post", async () => {
    M.listPosts.mockResolvedValue({ posts: [post(), post({ id: "p_2", title: "Second" })], nextCursor: null });
    const html = await renderPage();
    expect(html).toMatch(/<ul class="divide-y divide-line">/);
    expect(html.match(/<li class="py-5 first:pt-0">/g)).toHaveLength(2);
    expect(classTokens(html)).not.toContain("card");
    expect(html).not.toContain("rounded-xl");
    expect(html.match(/<article/g)).toHaveLength(2);
  });

  it("links each post title to its thread, at heading level 3", async () => {
    const html = await renderPage();
    expect(html).toMatch(/<h3 [^>]*><a [^>]*href="\/c\/meera\/community\/general\/p\/p_1"[^>]*>Welcome to the batch<\/a><\/h3>/);
  });

  it("an empty channel says so in a ruled block, with copy for who may post", async () => {
    M.listPosts.mockResolvedValue({ posts: [], nextCursor: null });
    const html = await renderPage();
    expect(text(html)).toContain("No posts yet");
    expect(text(html)).toContain("Be the first to post.");
    expect(classTokens(html)).not.toContain("card");
    expect(elements(await channelPage()).find((e) => e.type === EmptyState)!.props.inline).toBe(true);
    setup({ channels: [channel({ kind: "announcement" })] });
    M.listPosts.mockResolvedValue({ posts: [], nextCursor: null });
    expect(text(await renderPage())).toContain("Check back soon.");
  });

  it("Older posts is a secondary ButtonLink to the cursor, shown only when there is one", async () => {
    expect(await renderPage()).not.toContain("Older posts");
    M.listPosts.mockResolvedValue({ posts: [post()], nextCursor: "abc/def=" });
    const link = elements(await channelPage()).find((e) => e.type === ButtonLink && e.props.children === "Older posts")!;
    expect(link.props.variant).toBe("secondary");
    expect(link.props.href).toBe("/c/meera/community/general?cursor=abc%2Fdef%3D");
    expect(link.props.className).toContain("pointer-coarse:min-h-11");
    expect(link.props.children).toBe("Older posts");
  });
});

describe("channel page: queries and access", () => {
  it("looks the channel up for this creator, slug and viewer, and lists posts for this channel and user", async () => {
    const viewer = learner();
    setup({ viewer });
    await channelPage("general");
    expect(M.requireUser).toHaveBeenCalledWith("/c/meera/community/general");
    expect(M.getChannelFor).toHaveBeenCalledWith("cr_1", "general", viewer);
    expect(M.listPosts).toHaveBeenCalledWith({ creatorId: "cr_1", channelId: "ch_1", userId: "u_1", cursor: undefined });
  });

  it("passes the cursor on, cut to 64 characters, and ignores a repeated parameter", async () => {
    await channelPage("general", { cursor: "x".repeat(100) });
    expect(M.listPosts.mock.calls[0][0].cursor).toBe("x".repeat(64));
    M.listPosts.mockClear();
    await channelPage("general", { cursor: ["a", "b"] });
    expect(M.listPosts.mock.calls[0][0].cursor).toBeUndefined();
  });

  it("is a 404 when the community, or the channel (missing OR hidden: one answer), is not there", async () => {
    M.resolveCommunity.mockResolvedValue(null);
    await expect(channelPage()).rejects.toThrow("NEXT_NOT_FOUND");
    setup();
    M.getChannelFor.mockResolvedValue(null);
    await expect(channelPage("secret")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(M.listPosts).not.toHaveBeenCalled();
  });

  it("turns an AppError from the list (a bad cursor) into a 404 and rethrows anything else", async () => {
    M.listPosts.mockRejectedValue(new AppError("not_found", "Not found."));
    await expect(channelPage()).rejects.toThrow("NEXT_NOT_FOUND");
    M.listPosts.mockRejectedValue(new Error("db down"));
    await expect(channelPage()).rejects.toThrow("db down");
  });
});

describe("channel page: RSC boundary and source", () => {
  it("passes no function props except bound server actions on forms", async () => {
    setup({ viewer: learner({ isCreator: true }) });
    M.listPosts.mockResolvedValue({ posts: [post({ canDelete: true }), post({ id: "p_2" })], nextCursor: "c" });
    const visited = new Set<unknown>();
    const found = functionProps(await channelPage(), BOUNDARIES, { onVisit: (t) => visited.add(t) });
    // The composer only gets its channel id (it binds its own action). Per post: the like, pin and remove-from-community forms, and delete on post 1 only.
    expect(found).toEqual([
      "<form>.action", "<form>.action", "<form>.action", "<form>.action",
      "<form>.action", "<form>.action", "<form>.action",
    ]);
    for (const t of [PostComposer, ConfirmButton, LikeSubmit, ButtonLink]) expect(visited.has(t)).toBe(true);
  });

  it("positive control: the same walk reports a function prop planted in the page tree", async () => {
    expect(functionProps(<>{await channelPage()}<button onClick={() => {}}>x</button></>, BOUNDARIES)).toContain("<button>.onClick");
  });

  it("passes the style scan and no longer hand-builds a button or badge", () => {
    const src = readFileSync(PAGE_PATH, "utf8");
    expect(legacyStyleFindings(src)).toEqual([]);
    expect(src).not.toMatch(/\bbadge\b|\bbtn\b/);
  });
});
