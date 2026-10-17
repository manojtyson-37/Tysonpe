import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { ButtonLink, Progress } from "@/components/ui";
import { classTokens, elements as walk, profile, text } from "@/test/community-fixtures";
import { functionProps } from "@/test/rsc-safe";
import { legacyStyleFindings } from "@/test/style-scan";
import { MemberCard, MemberCardCompact } from "./MemberCard";

const HREF = "/c/meera/community/leaderboard";
type P = Parameters<typeof MemberCard>[0]["profile"];
const prof = (over: Record<string, unknown> = {}) => profile(over) as unknown as P;
const full = (p: P = prof()) => renderToStaticMarkup(<MemberCard profile={p} leaderboardHref={HREF} />);
const compact = (p: P = prof()) => renderToStaticMarkup(<MemberCardCompact profile={p} leaderboardHref={HREF} />);
const elements = (node: ReactNode) => walk(node);

describe("MemberCard: ruled panel", () => {
  it("is a named section shown from lg only, ruled rather than boxed, with no gradient or glow", () => {
    const html = full();
    expect(html).toMatch(/^<section aria-label="Your progress" class="hidden border-y border-line py-4 lg:block">/);
    const tokens = classTokens(html);
    for (const t of ["card", "rounded-xl", "shadow"]) expect(tokens, t).not.toContain(t);
    expect(html).not.toMatch(/gradient|glow|blur|shadow/);
    expect(html).not.toContain("border-dashed");
  });

  it("shows the level, the streak and the points to the next level from the profile, nothing invented", () => {
    const t = text(full());
    expect(t).toContain("Your level");
    expect(t).toMatch(/Your level 2 /);
    expect(t).toContain("120 points · 130 to level 3");
    expect(t).toContain("3-day streak");
    expect(t).toContain("Finish a lesson each day to keep it going.");
    const none = text(full(prof({ streak: 0 })));
    expect(none).toContain("No active streak");
    expect(none).toContain("Finish a lesson each day to start one.");
  });
});

describe("MemberCard: level progress", () => {
  it("is the Progress primitive in the ring tone: role=progressbar, named for the next level, with the percentage printed", () => {
    const p = elements(<MemberCard profile={prof()} leaderboardHref={HREF} />).find((e) => e.type === Progress)!;
    expect(p.props).toMatchObject({ value: 13, label: "Progress to level 3", tone: "ring" });
    const html = full();
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-label="Progress to level 3"');
    expect(html).toContain('aria-valuenow="13"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="100"');
    expect(html).toContain('aria-valuetext="13%"');
    expect(html).toContain('<span class="text-sm tabular-nums text-muted">13%</span>');
    expect(html).toContain("bg-[color:var(--brand-ring)]");
    expect(html).not.toMatch(/\bbg-brand\b/);
  });

  it.each([
    [{ level: 1, floor: 0, next: 100, into: 0, span: 100 }, 0],
    [{ level: 4, floor: 500, next: 1000, into: 499, span: 500 }, 100],
    [{ level: 12, floor: 22000, next: 27000, into: 2500, span: 5000 }, 50],
  ])("rounds the fill to a whole percentage (%j -> %i)", (level, pct) => {
    const html = full(prof({ level, points: level.floor + level.into }));
    expect(html).toContain(`aria-valuenow="${pct}"`);
    expect(html).toContain(`aria-label="Progress to level ${level.level + 1}"`);
  });
});

describe("MemberCard: badges", () => {
  it("lists every badge as a ruled row with its description; earned ones get a drawn tick and the words 'earned'", () => {
    const html = full();
    expect(html).toMatch(/<ul class="divide-y divide-line">/);
    expect(html.match(/<li class="py-2">/g)).toHaveLength(5);
    const items = [...html.matchAll(/<li class="py-2">(.*?)<\/li>/g)].map((m) => m[1]);
    const earned = items.find((i) => i.includes("First lesson"))!;
    expect(earned).toContain("<svg");
    expect(earned).toContain("(earned)");
    expect(earned).toContain("Completed your first lesson.");
    const idle = items.find((i) => i.includes("Course complete"))!;
    expect(idle).not.toContain("<svg");
    expect(idle).toContain("(not earned yet)");
    expect(idle).toContain("text-muted");
    expect(html.match(/<svg/g)).toHaveLength(1);
  });

  it("uses no pill, no rounded-xl and no dashed outline for an unearned badge", () => {
    const html = full();
    expect(classTokens(html)).not.toContain("badge");
    expect(html).not.toContain("rounded-xl");
    expect(html).not.toContain("border-dashed");
    expect(html).not.toContain("bg-brand-soft");
  });

  it("ignores a badge the catalogue does not know about", () => {
    const html = full(prof({ badges: [{ key: "ghost", label: "Ghost", description: "x", earnedAt: new Date() }] }));
    expect(html).not.toContain("Ghost");
    expect(html).not.toContain("(earned)");
  });
});

describe("MemberCard: leaderboard link", () => {
  it("is a secondary small ButtonLink to the leaderboard with the brand focus ring and a 44px coarse floor", () => {
    const link = elements(<MemberCard profile={prof()} leaderboardHref={HREF} />).find((e) => e.type === ButtonLink)!;
    expect(link.props).toMatchObject({ href: HREF, variant: "secondary", size: "sm" });
    expect(link.props.className).toContain("pointer-coarse:min-h-11");
    expect(link.props.className).toContain("var(--brand-ring)");
    expect(link.props.children).toBe("View leaderboard");
    expect(full()).toContain(`href="${HREF}"`);
  });
});

describe("MemberCardCompact: the phone summary", () => {
  it("is a collapsed ruled <details> hidden from lg, with a 44px summary of level, points and streak", () => {
    const html = compact();
    expect(html).toMatch(/^<details class="group border-y border-line lg:hidden"><summary class="[^"]*\bmin-h-11\b[^"]*\bcursor-pointer\b/);
    expect(html).not.toContain(" open");
    expect(text(html)).toContain("Your progress: Level 2 · 120 points · 3-day streak");
    expect(text(compact(prof({ streak: 0 })))).toContain("Your progress: Level 2 · 120 points ");
    expect(text(compact(prof({ streak: 0 })))).not.toContain("streak Your");
    expect(classTokens(html)).not.toContain("card");
  });

  it("hides the native marker and turns a drawn chevron when open", () => {
    const html = compact();
    expect(html).toContain("list-none");
    expect(html).toContain("[&amp;::-webkit-details-marker]:hidden");
    expect(html).toContain("group-open:rotate-180");
    expect(html).toMatch(/<summary[^>]*>.*<svg [^>]*aria-hidden="true"/);
  });

  it("opens onto the same detail content, with a progressbar of its own", () => {
    const html = compact();
    expect(html).toContain('role="progressbar"');
    expect(html).toContain("View leaderboard");
    expect(html).toContain("(earned)");
  });
});

describe("MemberCard: RSC and source", () => {
  it("passes no function props", () => {
    expect(functionProps(<><MemberCard profile={prof()} leaderboardHref={HREF} /><MemberCardCompact profile={prof()} leaderboardHref={HREF} /></>)).toEqual([]);
  });

  it("passes the style scan and has no inline svg of its own", () => {
    const src = readFileSync(new URL("./MemberCard.tsx", import.meta.url), "utf8");
    expect(legacyStyleFindings(src)).toEqual([]);
    expect(src).not.toContain("<svg");
    expect(src).not.toMatch(/rounded-xl|border-dashed|\bcard\b/);
  });
});
