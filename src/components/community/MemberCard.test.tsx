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

describe("MemberCard: clamp, streak boundary, badge tone", () => {
  it("caps the fill at 100 when the profile reports more progress than the level spans", () => {
    const html = full(prof({ level: { level: 3, floor: 250, next: 500, into: 600, span: 500 } }));
    expect(html).toContain('aria-valuenow="100"');
    expect(html).toContain('aria-valuetext="100%"');
    expect(html).not.toContain('aria-valuenow="120"');
    expect(elements(<MemberCard profile={prof({ level: { level: 3, floor: 250, next: 500, into: 600, span: 500 } })} leaderboardHref={HREF} />).find((e) => e.type === Progress)!.props.value).toBe(100);
  });

  it("a one-day streak is a streak: '1-day streak' in the full card and the compact summary", () => {
    const one = prof({ streak: 1 });
    const t = text(full(one));
    expect(t).toContain("1-day streak");
    expect(t).toContain("Finish a lesson each day to keep it going.");
    expect(t).not.toContain("No active streak");
    expect(text(compact(one))).toContain("Your progress: Level 2 · 120 points · 1-day streak");
  });

  it("a zero streak is 'No active streak' and leaves the summary without a streak", () => {
    const zero = prof({ streak: 0 });
    expect(text(full(zero))).toContain("No active streak");
    expect(text(full(zero))).toContain("Finish a lesson each day to start one.");
    expect(text(full(zero))).not.toContain("keep it going");
    expect(text(compact(zero))).toContain("Your progress: Level 2 · 120 points");
    expect(text(compact(zero))).not.toContain("Your progress: Level 2 · 120 points ·");
  });

  it("the compact card's own leaderboard link goes to the href it was given", () => {
    const link = elements(<MemberCardCompact profile={prof()} leaderboardHref="/c/zed/community/leaderboard" />).find((e) => e.type === ButtonLink)!;
    expect(link.props.href).toBe("/c/zed/community/leaderboard");
    expect(compact()).toContain(`href="${HREF}"`);
    expect(compact(prof())).not.toContain("href=\"undefined\"");
  });

  it("earned badges read in ink with a good-tone tick; unearned ones are muted throughout (name and description)", () => {
    const html = full();
    const rows = [...html.matchAll(/<li class="py-2">(.*?)<\/li>/g)].map((m) => m[1]);
    const classesOf = (row: string) => [...row.matchAll(/<p class="([^"]*)"/g)].map((m) => m[1].split(/\s+/));
    const [earnedName, earnedDesc] = classesOf(rows.find((r) => r.includes("First lesson"))!);
    expect(earnedName).toContain("text-ink");
    expect(earnedName).not.toContain("text-muted");
    expect(earnedDesc).toContain("text-ink");
    expect(earnedDesc).not.toContain("text-muted");
    expect(rows.find((r) => r.includes("First lesson"))).toMatch(/<svg [^>]*class="[^"]*\btext-good\b/);
    const unearned = rows.filter((r) => !r.includes("First lesson"));
    expect(unearned.length).toBeGreaterThan(0); // the loop below would pass on none
    for (const row of unearned) {
      const [name, desc] = classesOf(row);
      expect(name).toContain("text-muted");
      expect(name).not.toContain("text-ink");
      expect(desc).toContain("text-muted");
      expect(desc).not.toContain("text-ink");
    }
  });
});
