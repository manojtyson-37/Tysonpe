import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const nav = vi.hoisted(() => ({ path: "/c/meera/community/general" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path }));

import { Tabs } from "@/components/ui";
import { classTokens } from "@/test/community-fixtures";
import { legacyStyleFindings } from "@/test/style-scan";
import { ChannelNav } from "./ChannelNav";

const CHANNELS = [
  { slug: "general", name: "General", kind: "discussion", access: "open" },
  { slug: "news", name: "News", kind: "announcement", access: "open" },
  { slug: "vip", name: "VIP Lounge", kind: "discussion", access: "product_gated" },
];
const render = (over: { showLeaderboard?: boolean; channels?: typeof CHANNELS } = {}) =>
  renderToStaticMarkup(<ChannelNav handle="meera" channels={over.channels ?? CHANNELS} showLeaderboard={over.showLeaderboard ?? true} />);
/** href -> aria-current of every link in the nav. */
const current = (html: string) =>
  Object.fromEntries([...html.matchAll(/<a\b([^>]*)>/g)].map((m) => [/href="([^"]*)"/.exec(m[1])![1], /aria-current="([^"]*)"/.exec(m[1])?.[1] ?? null]));
const navClasses = () => /^<nav [^>]*class="([^"]*)"/.exec(render())![1].replace(/&amp;/g, "&").replace(/&gt;/g, ">").split(/\s+/);
const at = (path: string, over?: Parameters<typeof render>[0]) => {
  nav.path = path;
  return current(render(over));
};

beforeEach(() => {
  nav.path = "/c/meera/community/general";
});

describe("ChannelNav: the Tabs link mode", () => {
  it("is the Tabs primitive in link mode: one named nav of links, vertical, with no chip classes of its own", () => {
    const tree = ChannelNav({ handle: "meera", channels: CHANNELS, showLeaderboard: true }) as { type: unknown; props: Record<string, unknown> };
    expect(tree.type).toBe(Tabs);
    expect(tree.props.ariaLabel).toBe("Community channels");
    expect(tree.props.orientation).toBe("vertical");
    expect("onChange" in tree.props).toBe(false);
    const html = render();
    expect(html).toMatch(/^<nav aria-label="Community channels"/);
    expect(html).not.toContain('role="tablist"');
    expect(html.match(/<a /g)).toHaveLength(4);
  });

  it("is a column from lg and ONE scrolling row below it (no wrapping, items keep their size, focus ring has room)", () => {
    const cls = /^<nav [^>]*class="([^"]*)"/.exec(render())![1].replace(/&amp;/g, "&").replace(/&gt;/g, ">").split(/\s+/);
    expect(cls).toContain("flex-col");
    for (const c of ["max-lg:flex-row", "max-lg:overflow-x-auto", "max-lg:p-1", "max-lg:[&>a]:shrink-0"]) expect(cls, c).toContain(c);
    expect(cls).not.toContain("flex-wrap");
  });

  it("draws its focus ring INSIDE each link, in the brand ring colour (the lg+ wrapper scrolls and would clip an outside ring)", () => {
    const cls = navClasses();
    for (const c of ["[&>a:focus-visible]:-outline-offset-2", "[&>a:focus-visible]:outline-[color:var(--brand-ring)]"]) expect(cls, c).toContain(c);
    expect(cls.some((c) => c.includes("!"))).toBe(false);
  });

  it("clip rule: a nav inside an overflow container must use an inset (negative) outline offset", () => {
    const layout = readFileSync(new URL("../../app/(site)/c/[handle]/community/layout.tsx", import.meta.url), "utf8");
    const wrapper = /<div className=\{`([^`]*)`\}>\s*<ChannelNav\b/.exec(layout);
    expect(wrapper, "ChannelNav wrapper not found in the community layout").not.toBeNull();
    expect(wrapper![1]).toMatch(/overflow-y-auto/); // if this stops being true the rule below is moot: update both together
    const offsets = navClasses().filter((c) => /outline-offset/.test(c));
    expect(offsets.length).toBeGreaterThan(0);
    for (const c of offsets) expect(c, c).toMatch(/:-outline-offset-\d/);
  });

  it("lists the channels in the order given, then the Leaderboard when points are on", () => {
    const html = render();
    const hrefs = [...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual([
      "/c/meera/community/general",
      "/c/meera/community/news",
      "/c/meera/community/vip",
      "/c/meera/community/leaderboard",
    ]);
    expect(render({ showLeaderboard: false })).not.toContain("Leaderboard");
  });

  it("no hand-rolled chip: no rounded-xl, no truncate, no hand-typed active:scale", () => {
    const html = render();
    expect(html).not.toContain("rounded-xl");
    expect(html).not.toContain("truncate");
    expect(html).not.toContain("active:scale-[0.98]");
    expect(classTokens(html)).not.toContain("badge-brand");
  });
});

describe("ChannelNav: aria-current follows the route", () => {
  it("marks the exact channel page, and only it", () => {
    expect(at("/c/meera/community/general")).toEqual({
      "/c/meera/community/general": "page",
      "/c/meera/community/news": null,
      "/c/meera/community/vip": null,
      "/c/meera/community/leaderboard": null,
    });
  });

  it("keeps a channel current for a thread inside it", () => {
    const c = at("/c/meera/community/news/p/p_9");
    expect(c["/c/meera/community/news"]).toBe("page");
    expect(c["/c/meera/community/general"]).toBeNull();
    expect(c["/c/meera/community/leaderboard"]).toBeNull();
  });

  it("marks the Leaderboard on its own route, and only it", () => {
    const c = at("/c/meera/community/leaderboard");
    expect(c["/c/meera/community/leaderboard"]).toBe("page");
    expect(Object.values(c).filter(Boolean)).toHaveLength(1);
  });

  it("matches the path case-insensitively, on a segment boundary", () => {
    expect(at("/C/Meera/Community/GENERAL")["/c/meera/community/general"]).toBe("page");
    expect(at("/C/MEERA/COMMUNITY/NEWS/P/ABC")["/c/meera/community/news"]).toBe("page");
    // A channel whose slug merely starts with another's does not light it up.
    const c = at("/c/meera/community/general-chat", { channels: [...CHANNELS, { slug: "general-chat", name: "Chat", kind: "discussion", access: "open" }] });
    expect(c["/c/meera/community/general"]).toBeNull();
    expect(c["/c/meera/community/general-chat"]).toBe("page");
  });

  it("compares both sides in lower case: a mixed-case handle or slug still matches the lower-cased browser path", () => {
    nav.path = "/c/meera/community/general";
    const html = renderToStaticMarkup(<ChannelNav handle="Meera" channels={[{ slug: "General", name: "General", kind: "discussion", access: "open" }]} showLeaderboard={false} />);
    expect(current(html)).toEqual({ "/c/Meera/community/General": "page" });
  });

  it("marks nothing on the community index or someone else's community", () => {
    expect(Object.values(at("/c/meera/community")).filter(Boolean)).toHaveLength(0);
    expect(Object.values(at("/c/other/community/general")).filter(Boolean)).toHaveLength(0);
  });

  it("the current link is the heavier one (weight, not only tone)", () => {
    nav.path = "/c/meera/community/news";
    const html = render();
    const cls = (href: string) => new RegExp(`<a [^>]*href="${href}"[^>]*class="([^"]*)"|<a [^>]*class="([^"]*)"[^>]*href="${href}"`).exec(html)!;
    const active = cls("/c/meera/community/news");
    const idle = cls("/c/meera/community/general");
    expect(active[1] ?? active[2]).toContain("font-semibold");
    expect(idle[1] ?? idle[2]).not.toContain("font-semibold");
  });
});

describe("ChannelNav: labels and hints", () => {
  const label = (html: string, href: string) => new RegExp(`href="${href}"[^>]*>(.*?)</a>`).exec(html)![1];

  it("a news channel carries a News hint and a gated one a Gated hint, as Badges; an open discussion has none", () => {
    const html = render();
    expect(label(html, "/c/meera/community/news")).toContain(">News</span></span>");
    expect(label(html, "/c/meera/community/news")).toContain("badge badge-muted");
    expect(label(html, "/c/meera/community/vip")).toContain("Gated");
    expect(label(html, "/c/meera/community/general")).not.toContain("badge");
    expect(label(html, "/c/meera/community/leaderboard")).not.toContain("badge");
  });

  it("an announcement beats a gate for the hint (News, not Gated)", () => {
    const html = render({ channels: [{ slug: "n", name: "Notices", kind: "announcement", access: "product_gated" }] });
    expect(html).toContain(">News<");
    expect(html).not.toContain("Gated");
  });

  it("a long channel name wraps; it is not cut off", () => {
    const name = "Weekly accountability check-ins for the January cohort of bookkeepers";
    const html = render({ channels: [{ slug: "long", name, kind: "discussion", access: "open" }] });
    expect(html).toContain(name);
    expect(html).toMatch(/<span class="[^"]*\bwhitespace-normal\b[^"]*\bbreak-words\b[^"]*">Weekly/);
    for (const c of ["truncate", "text-ellipsis", "line-clamp-1"]) expect(html).not.toContain(c);
  });

  it("escapes a channel name", () => {
    const html = render({ channels: [{ slug: "x", name: "<b>Hi</b>", kind: "discussion", access: "open" }] });
    expect(html).toContain("&lt;b&gt;Hi&lt;/b&gt;");
  });
});

describe("ChannelNav: source", () => {
  it("passes the style scan and keeps client-only values out of server files by being the only reader of usePathname here", () => {
    const src = readFileSync(new URL("./ChannelNav.tsx", import.meta.url), "utf8");
    expect(src.trimStart().startsWith('"use client"')).toBe(true);
    expect(legacyStyleFindings(src)).toEqual([]);
    expect(src).not.toMatch(/chipActive|chipIdle|focusRingInset/);
  });
});

describe("ChannelNav: the Leaderboard item", () => {
  const leaderboardLink = (html: string) => [...html.matchAll(/<a\b([^>]*)>(.*?)<\/a>/g)].find((m) => /href="[^"]*\/leaderboard"/.test(m[1]));
  it("is labelled exactly 'Leaderboard', with no hint, and only when points are on", () => {
    const link = leaderboardLink(render())!;
    expect(link[2].replace(/<[^>]+>/g, "")).toBe("Leaderboard");
    expect(link[2]).not.toContain("badge");
    expect(leaderboardLink(render({ showLeaderboard: false }))).toBeUndefined();
  });
});
