import { readFileSync } from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

type Row = Record<string, unknown>;
type Where = Record<string, unknown> & { productId?: string | { in: string[] }; requiredForCompletion?: boolean; userId?: string };

const state = vi.hoisted(() => ({
  enrollments: [] as Row[],
  items: [] as Row[],
  progress: [] as Row[],
  course: null as null | Record<string, unknown>,
  lesson: null as null | Record<string, unknown>,
  product: null as null | Record<string, unknown>,
  order: { orderId: "o1" } as null | Record<string, unknown>,
}));

const calls = vi.hoisted(() => ({
  enrollmentMany: vi.fn<(args: unknown) => Promise<unknown>>(),
  itemMany: vi.fn<(args: unknown) => Promise<unknown>>(),
  progressMany: vi.fn<(args: unknown) => Promise<unknown>>(),
  productFirst: vi.fn<(args: unknown) => Promise<unknown>>(),
  enrollmentUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  loadCourse: vi.fn<(...a: unknown[]) => Promise<unknown>>(),
  loadLesson: vi.fn<(...a: unknown[]) => Promise<unknown>>(),
}));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  usePathname: () => "/",
  useRouter: () => ({ refresh: () => {} }),
}));
vi.mock("@/lib/auth/session", () => ({ requireUser: async () => ({ id: "u1", email: "asha@example.com" }) }));
vi.mock("@/app/actions/learning", () => ({
  completeLesson: async () => {},
  submitQuizAction: async () => ({ ok: false, error: "x" }),
}));
vi.mock("@/lib/learning/service", () => ({
  loadCourse: calls.loadCourse,
  loadLesson: calls.loadLesson,
}));

// A tiny in-memory db that honours the where-clauses the pages use, so a wrong query changes the numbers.
const inIds = (w: Where) => (typeof w.productId === "object" && w.productId ? w.productId.in : null);
vi.mock("@/lib/db", () => ({
  db: {
    enrollment: { findMany: calls.enrollmentMany, findUnique: calls.enrollmentUnique },
    contentItem: { findMany: calls.itemMany },
    lessonProgress: { findMany: calls.progressMany },
    product: { findFirst: calls.productFirst },
  },
}));

import Link from "next/link";
import { QuizPlayer } from "@/components/QuizPlayer";
import { functionProps } from "@/test/rsc-safe";
import LibraryPage from "./(site)/library/(list)/page";
import LearnPage from "./(site)/library/[productId]/page";

const text = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
const count = (html: string, needle: string) => html.split(needle).length - 1;

const enrollment = (n: number, over: Row = {}): Row => ({
  productId: `p${n}`,
  createdAt: new Date("2026-03-05T10:00:00Z"),
  product: {
    id: `p${n}`,
    title: `Course ${n}`,
    type: "course",
    creator: { displayName: "Meera Nair" },
    _count: { items: 0 },
    ...over,
  },
});

beforeEach(() => {
  state.enrollments = [];
  state.items = [];
  state.progress = [];
  state.course = null;
  state.lesson = null;
  state.product = null;
  state.order = { orderId: "o1" };
  Object.values(calls).forEach((f) => f.mockReset());
  calls.enrollmentMany.mockImplementation(async () => state.enrollments);
  calls.itemMany.mockImplementation(async (args) => {
    const w = (args as { where: Where }).where;
    const ids = inIds(w);
    return state.items.filter((i) => (!ids || ids.includes(i.productId as string)) && (w.requiredForCompletion === undefined || i.requiredForCompletion === w.requiredForCompletion));
  });
  calls.progressMany.mockImplementation(async (args) => {
    const w = (args as { where: Where }).where;
    const ids = inIds(w);
    return state.progress.filter((p) => p.userId === w.userId && (!ids || ids.includes(p.productId as string)));
  });
  calls.productFirst.mockImplementation(async () => state.product);
  calls.enrollmentUnique.mockImplementation(async () => state.order);
  calls.loadCourse.mockImplementation(async () => state.course);
  calls.loadLesson.mockImplementation(async () => state.lesson);
});

/* ---------------- library list ---------------- */

const lessonsOf = (productId: string, n: number, requiredEvery = 1) =>
  Array.from({ length: n }, (_, i) => ({ id: `${productId}-i${i}`, productId, requiredForCompletion: i % requiredEvery === 0 }));

async function renderLibrary(): Promise<string> {
  const tree: ReactNode = await LibraryPage();
  return renderToStaticMarkup(<>{tree}</>);
}

describe("library list", () => {
  it("shows the empty state with no list and runs no progress queries for zero enrollments", async () => {
    const html = await renderLibrary();
    expect(html).toContain("Your library is empty");
    expect(html).not.toContain("<ul");
    expect(calls.itemMany).not.toHaveBeenCalled();
    expect(calls.progressMany).not.toHaveBeenCalled();
  });

  it("renders one ruled row per course, each a link to the player, with progress from required lessons only", async () => {
    state.enrollments = [enrollment(1, { _count: { items: 5 } })];
    // 5 lessons, every second one required => 3 required (i0, i2, i4); learner finished i0 and i1 (i1 is optional).
    state.items = lessonsOf("p1", 5, 2);
    state.progress = [
      { userId: "u1", productId: "p1", itemId: "p1-i0" },
      { userId: "u1", productId: "p1", itemId: "p1-i1" },
    ];
    const html = await renderLibrary();
    expect(html).toContain('<ul class="divide-y divide-line border-y border-line">');
    expect(html).toMatch(/<a [^>]*href="\/library\/p1"/);
    // 5 lessons beside a bar of 3: the wording reconciles the two
    expect(html).toContain('aria-valuetext="1 of 3 required lessons"');
    expect(html).toContain('aria-label="Course progress"');
    expect(html).not.toContain("Course 1 progress");
    expect(text(html)).toContain("5 lessons");
    expect(text(html)).toContain("Course · by Meera Nair");
    expect(html).not.toContain("badge");
    expect(html).not.toContain("hover:-translate-y");
    expect(html).not.toContain("hover:shadow");
    expect(html).not.toMatch(/class="[^"]*\bcard\b/);
    expect(html).toContain("pointer-coarse:min-h-11");
  });

  it("says 'required lessons' only when the bar counts fewer lessons than the row does, and not for a single one", async () => {
    state.enrollments = [enrollment(1, { _count: { items: 3 } })];
    state.items = lessonsOf("p1", 3, 3); // only i0 is required
    expect(await renderLibrary()).toContain('aria-valuetext="0 of 1 required lesson"');
  });

  it("excludes optional lessons from the total: finishing every required lesson reads complete", async () => {
    state.enrollments = [enrollment(1, { _count: { items: 4 } })];
    state.items = lessonsOf("p1", 4, 2); // required: i0, i2
    state.progress = [
      { userId: "u1", productId: "p1", itemId: "p1-i0" },
      { userId: "u1", productId: "p1", itemId: "p1-i2" },
    ];
    const html = await renderLibrary();
    expect(html).toContain('aria-valuetext="2 of 2 required lessons"');
    expect(html).not.toContain("of 4 lessons");
  });

  it("does not count another learner's or another course's completions", async () => {
    state.enrollments = [enrollment(1, { _count: { items: 2 } }), enrollment(2, { _count: { items: 2 } })];
    state.items = [...lessonsOf("p1", 2), ...lessonsOf("p2", 2)];
    state.progress = [
      { userId: "u1", productId: "p2", itemId: "p2-i0" },
      { userId: "someone-else", productId: "p1", itemId: "p1-i0" },
      { userId: "someone-else", productId: "p1", itemId: "p1-i1" },
    ];
    const html = await renderLibrary();
    expect(html).toContain('aria-valuetext="0 of 2 lessons"');
    expect(html).toContain('aria-valuetext="1 of 2 lessons"');
    expect(html).not.toContain("required lessons"); // every lesson is required: nothing to reconcile
  });

  it("shows no progress bar for a product with no lessons (a download) and none when nothing is required", async () => {
    state.enrollments = [
      enrollment(1, { type: "download", _count: { items: 0 } }),
      enrollment(2, { _count: { items: 1 } }),
    ];
    state.items = [{ id: "p2-i0", productId: "p2", requiredForCompletion: false }];
    const html = await renderLibrary();
    expect(html).toContain("Digital download");
    expect(count(html, 'role="progressbar"')).toBe(0);
    expect(text(html)).toContain("0 lessons");
    expect(text(html)).toContain("1 lesson ");
  });

  it("marks a finished course as complete with the good tone", async () => {
    state.enrollments = [enrollment(1, { _count: { items: 1 } })];
    state.items = lessonsOf("p1", 1);
    state.progress = [{ userId: "u1", productId: "p1", itemId: "p1-i0" }];
    const html = await renderLibrary();
    expect(html).toContain('aria-valuetext="1 of 1 lesson"');
    expect(html).toContain("bg-good");
  });

  it("pins the progress queries: scoped to these products and this user, required lessons only", async () => {
    state.enrollments = [enrollment(1, { _count: { items: 1 } }), enrollment(2, { _count: { items: 1 } })];
    await renderLibrary();
    expect(calls.itemMany).toHaveBeenCalledWith({
      where: { productId: { in: ["p1", "p2"] }, requiredForCompletion: true },
      select: { id: true, productId: true },
    });
    expect(calls.progressMany).toHaveBeenCalledWith({
      where: { userId: "u1", productId: { in: ["p1", "p2"] } },
      select: { itemId: true, productId: true },
    });
    expect(calls.enrollmentMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1" } }));
  });

  it("issues a bounded number of queries however many courses there are, and never loads a course per row", async () => {
    const total = async (n: number) => {
      Object.values(calls).forEach((f) => f.mockClear());
      state.enrollments = Array.from({ length: n }, (_, i) => enrollment(i + 1, { _count: { items: 3 } }));
      state.items = state.enrollments.flatMap((e) => lessonsOf(e.productId as string, 3));
      await renderLibrary();
      return calls.enrollmentMany.mock.calls.length + calls.itemMany.mock.calls.length + calls.progressMany.mock.calls.length;
    };
    const one = await total(1);
    const five = await total(5);
    const forty = await total(40);
    expect(one).toBe(3);
    expect(five).toBe(one);
    expect(forty).toBe(one);
    expect(calls.loadCourse).not.toHaveBeenCalled();
  });

  it("passes no function prop anywhere on the page", async () => {
    state.enrollments = [enrollment(1, { _count: { items: 2 } })];
    state.items = lessonsOf("p1", 2);
    const tree = await LibraryPage();
    expect(functionProps(tree, [Link])).toEqual([]);
  });
});

/* ---------------- course player page ---------------- */

const outline = (id: string, over: Row = {}) => ({
  id,
  title: `Lesson ${id}`,
  kind: "text",
  sectionId: null,
  required: true,
  completed: false,
  state: { unlocked: true },
  ...over,
});

function setCourse(lessons: Row[], over: Row = {}) {
  const done = lessons.filter((l) => l.completed).length;
  const required = lessons.filter((l) => l.required).length;
  state.course = {
    product: { id: "p1", title: "Bookkeeping", certificateEnabled: true, creator: { displayName: "Meera Nair", handle: "meera" } },
    enrolledAt: new Date("2026-03-05T10:00:00Z"),
    groups: [{ id: null, title: null, lessons }],
    lessons,
    progress: { done, total: required, pct: required ? Math.round((done / required) * 100) : 0, complete: required > 0 && done === required },
    certificate: null,
    ...over,
  };
}
const textLesson = (id: string, over: Row = {}) => ({ locked: false, id, title: `Lesson ${id}`, kind: "text", url: "", body: "Body text", completed: false, ...over });

async function renderLearn(sp: Record<string, string> = {}): Promise<string> {
  const tree: ReactNode = await LearnPage({ params: Promise.resolve({ productId: "p1" }), searchParams: Promise.resolve(sp) } as never);
  return renderToStaticMarkup(<>{tree}</>);
}

describe("course player: access", () => {
  it("redirects a learner who is not enrolled to the public page when the product is published", async () => {
    state.course = null;
    state.product = { id: "p1", slug: "bookkeeping", creator: { handle: "meera" } };
    await expect(renderLearn()).rejects.toThrow("REDIRECT /c/meera/bookkeeping");
    expect(calls.productFirst).toHaveBeenCalledWith({ where: { id: "p1", status: "published" }, include: { creator: true } });
    expect(calls.loadLesson).not.toHaveBeenCalled();
  });

  it("404s when not enrolled and the product is not published", async () => {
    state.course = null;
    state.product = null;
    await expect(renderLearn()).rejects.toThrow("NOT_FOUND");
  });
});

// The outline is rendered twice (a collapsed <details> below lg, a sticky rail from lg); tests that count its links
// look at one copy. The desktop rail is the div between the details and the article.
const RAIL_OPEN = '<div class="hidden lg:block lg:sticky lg:top-24 lg:self-start">';
const rail = (html: string) => html.slice(html.indexOf(RAIL_OPEN), html.indexOf("<article"));
const disclosure = (html: string) => html.slice(html.indexOf("<details"), html.indexOf("</details>") + "</details>".length);

describe("course player: outline and progress", () => {
  it("shows progress through the Progress primitive with the percentage still visible", async () => {
    setCourse([outline("a", { completed: true }), outline("b"), outline("c"), outline("d")]);
    state.lesson = textLesson("b");
    const html = await renderLearn();
    expect(html).toContain('aria-valuetext="1 of 4 lessons complete"');
    expect(html).toContain('aria-label="Course progress"');
    expect(text(html)).toContain("25%");
    expect(html).not.toContain("transition-all");
  });

  it("marks the current lesson with aria-current, the completed one in words, and a locked one with an icon and its reason", async () => {
    setCourse([
      outline("a", { completed: true }),
      outline("b"),
      outline("c", { state: { unlocked: false, reason: "after_previous" } }),
      outline("d", { state: { unlocked: false, reason: "date", unlockAt: new Date("2026-07-01T09:30:00Z") } }),
    ]);
    state.lesson = textLesson("b");
    const html = await renderLearn();
    const current = rail(html).match(/<a [^>]*aria-current="page"[^>]*>/g) ?? [];
    expect(current).toHaveLength(1);
    expect(current[0]).toContain("lesson=b");
    expect(rail(html)).toContain('<span class="sr-only">Completed: </span>Lesson a');
    expect(text(rail(html))).toContain("Finish the previous lesson to unlock");
    expect(text(html)).toContain("Opens 1 Jul 2026, 3:00 pm"); // 09:30 UTC is 15:00 IST, time of day kept
    expect(html).toContain("lg:top-24");
    expect(html).toContain("pointer-coarse:min-h-11");
  });

  it("labels optional lessons in the rail", async () => {
    setCourse([outline("a", { required: false }), outline("b")]);
    state.lesson = textLesson("b");
    expect(text(rail(await renderLearn()))).toContain("text · optional");
  });
});

describe("course player: the outline does not push the lesson down on a phone", () => {
  const five = () => [outline("a", { completed: true }), outline("b", { completed: true }), outline("c"), outline("d"), outline("e")];

  it("below lg the outline is a closed disclosure: no open attribute, a 44px summary, a chevron, and the lesson state in words", async () => {
    setCourse(five());
    state.lesson = textLesson("c");
    const html = await renderLearn();
    const d = disclosure(html);
    expect(d).toMatch(/^<details class="[^"]*\blg:hidden\b[^"]*">/);
    expect(d).not.toMatch(/^<details[^>]*\sopen/);
    expect(d).toMatch(/<summary [^>]*class="[^"]*\bmin-h-11\b[^"]*focus-visible:outline-ink/);
    expect(d).toContain("group-open:rotate-180");
    expect(text(d.slice(0, d.indexOf("</summary>"))).trim()).toBe("Course content · 2 of 5 complete · Now: Lesson c");
    expect(d).toContain('<nav aria-label="Course content"');
  });

  it("from lg the same outline is a sticky rail pinned at top-24, hidden below lg", async () => {
    setCourse(five());
    state.lesson = textLesson("c");
    const html = await renderLearn();
    expect(html).toContain(RAIL_OPEN);
    expect(rail(html)).toContain('<nav aria-label="Course content"');
    // the nav itself no longer carries the sticky classes; the wrapper does
    expect(html).not.toMatch(/<nav [^>]*lg:sticky/);
  });

  it("both copies list the same lessons, and the lesson article follows the outline directly in the DOM", async () => {
    setCourse(five());
    state.lesson = textLesson("c");
    const html = await renderLearn();
    const hrefs = (h: string) => (h.match(/href="\/library\/p1\?lesson=[a-e]"/g) ?? []).join();
    expect(hrefs(disclosure(html))).toBe(hrefs(rail(html)));
    expect(hrefs(rail(html))).toContain("lesson=e");
    expect(html.indexOf("</details>")).toBeLessThan(html.indexOf(RAIL_OPEN));
    expect(html.indexOf(RAIL_OPEN)).toBeLessThan(html.indexOf("<article"));
    // nothing but the hidden desktop rail sits between the collapsed outline and the lesson
    expect(html.slice(html.indexOf("</details>") + 10, html.indexOf(RAIL_OPEN))).toBe("");
  });

  it("keys the disclosure on the current lesson, so soft navigation resets it to closed (and only that one element)", () => {
    const src = readFileSync(path.join(__dirname, "(site)/library/[productId]/page.tsx"), "utf8");
    expect(src.match(/<details\b[^>]*\bkey=\{current\?\.id\}/g)).toHaveLength(1);
    expect(src.match(/<details\b/g)).toHaveLength(1);
  });

  it("keeps ONE navigation landmark in the accessibility tree: each copy is hidden by CSS at the other breakpoint", async () => {
    setCourse(five());
    state.lesson = textLesson("c");
    const html = await renderLearn();
    expect(html.match(/<nav /g)).toHaveLength(2);
    expect(html).toContain("lg:hidden");
    expect(html).toContain("hidden lg:block");
  });
});

describe("course player: locked lesson", () => {
  it("renders the lock as an icon with the reason, no glyph, and no lesson body or completion form", async () => {
    setCourse([outline("a", { state: { unlocked: false, reason: "after_previous" } })]);
    state.lesson = { locked: true, id: "a", title: "Lesson a", kind: "text", state: { unlocked: false, reason: "after_previous" } };
    const html = await renderLearn({ lesson: "a" });
    const article = html.slice(html.indexOf("<article"), html.indexOf("</article>"));
    expect(article).toContain("<svg");
    expect(article).toContain("Finish the previous lesson to unlock");
    expect(article).not.toContain("<form");
    expect(article).not.toContain("Body text");
    expect(article).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});

describe("course player: completion banner", () => {
  const finished = () => [outline("a", { completed: true }), outline("b", { completed: true })];

  it("with a certificate: a good callout with the certificate link as its action, no emoji or exclamation mark", async () => {
    setCourse(finished(), { certificate: { publicId: "cert-1" } });
    state.lesson = textLesson("a", { completed: true });
    const html = await renderLearn();
    expect(text(html)).toContain("You finished this course.");
    expect(text(html)).not.toContain("finished this course!");
    expect(html).toMatch(/<a [^>]*href="\/certificates\/cert-1"[^>]*>View your certificate<\/a>/);
    expect(html.match(/<a [^>]*href="\/certificates\/cert-1"[^>]*>/)?.[0]).toContain("pointer-coarse:min-h-11"); // 44px on touch
    expect(html).toContain("bg-good-soft");
    expect(html).not.toContain('role="alert"');
  });

  it("without a certificate: the same callout, no certificate link", async () => {
    setCourse(finished(), { certificate: null });
    state.lesson = textLesson("a", { completed: true });
    const html = await renderLearn();
    expect(text(html)).toContain("You finished this course.");
    expect(html).not.toContain("/certificates/");
    expect(html).not.toContain("View your certificate");
  });

  it("is absent while the course is unfinished", async () => {
    setCourse([outline("a", { completed: true }), outline("b")]);
    state.lesson = textLesson("b");
    expect(text(await renderLearn())).not.toContain("You finished this course");
  });
});

describe("course player: notices", () => {
  beforeEach(() => {
    setCourse([outline("a")]);
    state.lesson = textLesson("a");
  });

  it("shows the fixed message for a known code, in an alert", async () => {
    const html = await renderLearn({ notice: "locked" });
    expect(html).toContain('role="alert"');
    expect(text(html)).toContain("That lesson isn't available yet.");
    expect(text(await renderLearn({ notice: "unavailable" }))).toContain("That lesson isn't available.");
  });

  it("rejects unknown codes and never echoes the URL into the page", async () => {
    for (const code of ["<script>alert(1)</script>", "constructor", "__proto__", "toString", ""]) {
      const html = await renderLearn({ notice: code });
      expect(html).not.toContain('role="alert"');
      if (code) expect(html).not.toContain(code);
    }
  });
});

describe("course player: lesson content", () => {
  it("keeps both watermark overlays hidden from AT, inert to the pointer, with no raw hex shadow", async () => {
    setCourse([outline("v", { kind: "video" })]);
    state.lesson = textLesson("v", { kind: "video", url: "https://youtu.be/dQw4w9WgXcQ" });
    const html = await renderLearn();
    const marks = html.match(/<span aria-hidden="true" class="pointer-events-none[^"]*"[^>]*>asha@example\.com<\/span>/g) ?? [];
    expect(marks).toHaveLength(2);
    for (const m of marks) expect(m).toContain("select-none");
    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(html).toContain('referrerPolicy="strict-origin-when-cross-origin"');
    expect(html).toContain("rounded-card bg-ink");
    expect(html).not.toContain("bg-black");
    expect(html).not.toContain("rounded-xl");
    expect(html).not.toMatch(/text-shadow:[^\]"]*#/);
    expect(html).toContain("text-shadow:0_0_2px_var(--ink)");
  });

  it("an unembeddable video URL falls back to a link guarded by safe(): a javascript: URL becomes #", async () => {
    setCourse([outline("v", { kind: "video" })]);
    state.lesson = textLesson("v", { kind: "video", url: "javascript:alert(1)" });
    const html = await renderLearn();
    expect(html).not.toContain("<iframe");
    expect(html).not.toMatch(/href="javascript:/i);
    expect(html).toMatch(/<a href="#" target="_blank" rel="noopener noreferrer"[^>]*>Watch video/);
    expect(html).not.toContain("asha@example.com"); // the watermark belongs to the embed only
  });

  it("an https PDF opens in a new tab with the external icon, a spoken hint, and no arrow glyph", async () => {
    setCourse([outline("f", { kind: "pdf" })]);
    state.lesson = textLesson("f", { kind: "pdf", url: "https://files.example.com/a.pdf" });
    const html = await renderLearn();
    expect(html).toMatch(/<a href="https:\/\/files\.example\.com\/a\.pdf" target="_blank" rel="noopener noreferrer"/);
    expect(text(html)).toContain("Open PDF");
    expect(text(html)).toContain("(opens in a new tab)");
    expect(html).not.toContain("↗");
  });

  it("shows Completed as plain text with an icon, not a pill", async () => {
    setCourse([outline("a", { completed: true }), outline("b")]);
    state.lesson = textLesson("a", { completed: true });
    const html = await renderLearn({ lesson: "a" });
    expect(text(html)).toContain("Completed");
    expect(html).not.toContain("badge");
  });

  it("a completed lesson offers Next lesson (an arrow icon, no glyph) and no completion form", async () => {
    setCourse([outline("a", { completed: true }), outline("b")]);
    state.lesson = textLesson("a", { completed: true });
    const html = await renderLearn({ lesson: "a" });
    expect(html).toMatch(/<a [^>]*href="\/library\/p1\?lesson=b"[^>]*>Next lesson<svg/);
    expect(html).not.toContain("→");
    expect(html).not.toContain("<form");
  });

  it("an unfinished lesson offers the completion form", async () => {
    setCourse([outline("a"), outline("b")]);
    state.lesson = textLesson("a");
    expect(await renderLearn()).toContain("Mark complete &amp; continue");
  });
});

describe("course player: renders from a server component", () => {
  it("reports exactly one function prop on a lesson page: the bound server action on the <form>", async () => {
    setCourse([outline("a"), outline("b")]);
    state.lesson = textLesson("a");
    const tree = await LearnPage({ params: Promise.resolve({ productId: "p1" }), searchParams: Promise.resolve({}) } as never);
    expect(functionProps(tree, [Link, QuizPlayer])).toEqual(["<form>.action"]);
  });

  it("reports none on a completed lesson (no form) and none across the QuizPlayer boundary", async () => {
    setCourse([outline("a", { completed: true }), outline("q", { kind: "quiz" })]);
    state.lesson = textLesson("a", { completed: true });
    const done = await LearnPage({ params: Promise.resolve({ productId: "p1" }), searchParams: Promise.resolve({}) } as never);
    expect(functionProps(done, [Link, QuizPlayer])).toEqual([]);

    state.lesson = {
      locked: false, id: "q", title: "Quiz", kind: "quiz", completed: false, passPct: 60, maxAttempts: 3, attemptsUsed: 0, attemptsLeft: 3, lastScorePct: null,
      questions: [{ id: "q1", prompt: "Pick", kind: "single", options: [{ id: "o1", text: "A" }] }],
    };
    const quiz = await LearnPage({ params: Promise.resolve({ productId: "p1" }), searchParams: Promise.resolve({ lesson: "q" }) } as never);
    expect(functionProps(quiz, [Link, QuizPlayer])).toEqual([]);
  });
});

/* ---------------- the acceptance grep, as a test ---------------- */

describe("no emoji, dingbat or arrow glyph in the learner screens", () => {
  const root = path.resolve(__dirname, "../..");
  const files = [
    "src/app/(site)/library/(list)/page.tsx",
    "src/app/(site)/library/[productId]/page.tsx",
    "src/components/QuizPlayer.tsx",
  ];
  // Emoji, dingbats (including the check mark) and arrows. The middle dot U+00B7 is allowed.
  const GLYPH = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}]/u;

  it.each(files)("%s has none", (f) => {
    expect(readFileSync(path.join(root, f), "utf8")).not.toMatch(GLYPH);
  });

  it("CheckboxCard's code has none", () => {
    const src = readFileSync(path.join(root, "src/components/form.tsx"), "utf8");
    const start = src.indexOf("export function CheckboxCard");
    const end = src.indexOf("const HEX_COLOR");
    expect(start).toBeGreaterThan(0);
    expect(src.slice(start, end)).not.toMatch(GLYPH);
  });

  it("the pattern itself catches each kind it is meant to", () => {
    for (const g of ["\u{1F389}", "\u{1F512}", "✓", "←", "→", "↗"]) expect(g).toMatch(GLYPH);
    expect("a · b").not.toMatch(GLYPH);
  });
});
