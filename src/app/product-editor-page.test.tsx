import { readFileSync } from "node:fs";
import { isValidElement, type ReactNode } from "react";
import Link from "next/link";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// The creator is cr_1 / meera. vi.mock factories are hoisted, so those values are written inline there.
const mocks = vi.hoisted(() => {
  /** A stand-in server action: `.bind` returns a tagged function so a test can read WHICH action a form got, and its bound args. */
  const action = (name: string) => {
    const fn = (() => undefined) as unknown as { bind: (...a: unknown[]) => unknown };
    fn.bind = (_this: unknown, ...args: unknown[]) => Object.assign(() => undefined, { action: name, args });
    return fn;
  };
  return {
    findFirst: vi.fn<(a: Record<string, unknown>) => Promise<unknown>>(),
    insights: vi.fn<(id: string) => Promise<unknown>>(),
    notFound: vi.fn(() => {
      throw new Error("NOT_FOUND");
    }),
    actions: Object.fromEntries(
      [
        "deleteProduct", "unpublishProduct", "updateProduct", "addLesson", "addSection", "deleteLesson", "deleteSection",
        "moveLesson", "moveLessonToSection", "moveSection", "publishProduct", "renameSection", "setCertificates", "updateLesson",
      ].map((n) => [n, action(n)]),
    ) as Record<string, ReturnType<typeof action>>,
  };
});

vi.mock("next/navigation", () => ({ notFound: mocks.notFound, redirect: (to: string) => { throw new Error(`REDIRECT ${to}`); }, usePathname: () => "/dashboard/products/p_1" }));
vi.mock("@/lib/auth/session", () => ({ requireCreator: async () => ({ user: {}, creator: { id: "cr_1", handle: "meera" } }) }));
vi.mock("@/lib/db", () => ({ db: { product: { findFirst: mocks.findFirst } } }));
vi.mock("@/lib/learning/insights", () => ({ getCourseInsights: mocks.insights }));
vi.mock("@/app/actions/creator", () => mocks.actions);
vi.mock("@/app/actions/curriculum", () => mocks.actions);

import { ConfirmButton } from "@/components/ConfirmButton";
import { ActionForm, Field, FormError, Select, SubmitButton } from "@/components/form";
import { LessonForm } from "@/components/LessonForm";
import { KIND_LABEL } from "@/lib/lesson-kinds";
import { ProductForm } from "@/components/ProductForm";
import { PageHeader, StatStrip, StatusBadge } from "@/components/ui";
import { functionProps } from "@/test/rsc-safe";
import { legacyStyleFindings } from "@/test/style-scan";
import EditProduct from "./dashboard/(console)/products/[id]/page";

const PAGE_PATH = new URL("./dashboard/(console)/products/[id]/page.tsx", import.meta.url);
const BOUNDARIES: unknown[] = [ProductForm, LessonForm, ConfirmButton, ActionForm, SubmitButton, Field, Select, FormError, Link];

const item = (over: Record<string, unknown>) => ({
  id: "x", title: "x", kind: "video", url: "https://youtu.be/x", body: "", sectionId: null, position: 0,
  requiredForCompletion: true, dripType: "none", dripDays: null, dripAt: null, ...over,
});

/** loose: Intro (video). Module 1: Setup (video), Quiz time (quiz, drip, optional). Module 2: Wrap-up (text). Bonus: empty. */
const product = (over: Record<string, unknown> = {}) => ({
  id: "p_1", slug: "bookkeeping", title: "Bookkeeping for Small Shops", status: "published", type: "course",
  tagline: "t", description: "d", pricePaise: 49900, gstRatePct: 18, billing: "one_time", certificateEnabled: true,
  sections: [{ id: "s1", title: "Module 1" }, { id: "s2", title: "Module 2" }, { id: "s3", title: "Bonus" }],
  items: [
    item({ id: "l0", title: "Intro" }),
    item({ id: "l1", title: "Setup", sectionId: "s1" }),
    item({ id: "l2", title: "Quiz time", kind: "quiz", sectionId: "s1", requiredForCompletion: false, dripType: "on_date", dripAt: new Date("2026-11-01T06:30:00Z") }),
    item({ id: "l3", title: "Wrap-up", kind: "text", body: "Bye", sectionId: "s2" }),
  ],
  _count: { orders: 0 },
  ...over,
});

const insights = (over: Record<string, unknown> = {}) => ({
  enrolled: 10, completed: 4, completionPct: 40, certificates: 3,
  lessons: [{ id: "l0", pct: 90 }, { id: "l1", pct: 40 }],
  ...over,
});

let current: ReturnType<typeof product> | null;
beforeEach(() => {
  current = product();
  mocks.findFirst.mockReset();
  mocks.notFound.mockClear();
  mocks.insights.mockReset();
  // Behaves like the database: only the owning creator's product, found by id.
  mocks.findFirst.mockImplementation(async (a) => {
    const where = a.where as { id?: string; creatorId?: string };
    return current && where.id === current.id && where.creatorId === "cr_1" ? current : null;
  });
  mocks.insights.mockResolvedValue(insights());
});

type Props = { params?: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };
const call = async (p: Props = {}) =>
  (await (EditProduct as (p: unknown) => Promise<ReactNode>)({ params: Promise.resolve({ id: "p_1" }), searchParams: Promise.resolve({}), ...p })) as ReactNode;
const render = async (p: Props = {}) => renderToStaticMarkup(<>{await call(p)}</>);
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const tag = (html: string, re: RegExp) => re.exec(html)?.[0] ?? "";

type El = { type: unknown; props: Record<string, any>; ancestors: Array<{ type: unknown; props: Record<string, any> }> }; // eslint-disable-line @typescript-eslint/no-explicit-any
/** Flattens the page's element tree: plain components are called, boundaries (client components) are not. */
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
const actionOf = (el: El) => {
  const form = [...el.ancestors].reverse().find((a) => a.type === "form");
  return form ? (form.props.action as { action: string; args: unknown[] }) : undefined;
};
type Bound = { action: string; args: unknown[] };
const forms = (tree: El[]): Bound[] =>
  tree.filter((e) => e.type === "form").map((e) => ({ action: e.props.action.action, args: e.props.action.args }));
const confirms = (tree: El[]) => tree.filter((e) => e.type === ConfirmButton);

describe("editor: lookup", () => {
  it("looks the product up by id AND creatorId, with sections and items in position order", async () => {
    await render();
    expect(mocks.findFirst).toHaveBeenCalledTimes(1);
    const args = mocks.findFirst.mock.calls[0][0] as { where: unknown; include: Record<string, unknown> };
    expect(args.where).toEqual({ id: "p_1", creatorId: "cr_1" });
    expect(args.include.sections).toEqual({ orderBy: { position: "asc" } });
    expect(args.include.items).toEqual({ orderBy: { position: "asc" } });
    expect(mocks.insights).toHaveBeenCalledWith("p_1");
  });

  it("is a 404 for another creator's product, or none", async () => {
    current = null;
    await expect(render()).rejects.toThrow("NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
    expect(mocks.insights).not.toHaveBeenCalled();
  });
});

describe("editor: header", () => {
  it("shows title, sub, status badge, a View page link that opens a new tab with the external icon, and no glyph", async () => {
    const html = await render();
    expect(html).toContain(">Bookkeeping for Small Shops</h1>");
    expect(text(html)).toContain("Live on your storefront.");
    expect(text(html)).toContain("Published");
    const link = tag(html, /<a [^>]*href="\/c\/meera\/bookkeeping"[^>]*>.*?<\/a>/);
    expect(link).toContain('target="_blank"');
    expect(link).toContain("<svg");
    expect(text(link)).toContain("View page");
    expect(link).toContain('rel="noreferrer"');
    // The new-tab warning is for screen readers only: present in the link, hidden visually.
    expect(link).toContain('<span class="sr-only"> (opens in a new tab)</span>');
    expect(html).not.toMatch(/[↗↑↓→]/);
  });

  it("says Preview for a draft, with the draft sub line", async () => {
    current = product({ status: "draft" });
    const html = await render();
    expect(text(html)).toContain("Draft. Not visible to buyers.");
    const link = tag(html, /<a [^>]*href="\/c\/meera\/bookkeeping"[^>]*>.*?<\/a>/);
    expect(text(link)).toContain("Preview");
    expect(link).toContain('<span class="sr-only"> (opens in a new tab)</span>');
  });

  it("a published product gets an Unpublish form (secondary), a draft gets a Publish form (primary), both bound to the id", async () => {
    let tree = elements(await call());
    expect(forms(tree).find((f) => f.action === "unpublishProduct")?.args).toEqual(["p_1"]);
    expect(forms(tree).some((f) => f.action === "publishProduct")).toBe(false);
    expect(await render()).toMatch(/<button type="submit" class="btn btn-secondary btn-sm[^"]*">Unpublish<\/button>/);

    current = product({ status: "draft" });
    tree = elements(await call());
    expect(forms(tree).find((f) => f.action === "publishProduct")?.args).toEqual(["p_1"]);
    expect(forms(tree).some((f) => f.action === "unpublishProduct")).toBe(false);
    expect(await render()).toMatch(/<button type="submit" class="btn btn-primary btn-sm[^"]*">Publish<\/button>/);
  });

  it("shows the error as a bad Callout with role=alert, trimmed to 300 characters, and nothing without one", async () => {
    const html = await render({ searchParams: Promise.resolve({ error: "x".repeat(400) }) });
    const alert = tag(html, /<div role="alert"[^>]*>.*?<\/div><\/div>/);
    expect(alert).toContain("text-bad");
    expect(alert).toContain("x".repeat(300));
    expect(alert).not.toContain("x".repeat(301));
    expect(html).not.toContain("rounded-xl");
    expect(await render()).not.toContain('role="alert"');
  });

  it("ignores an array-valued error param", async () => {
    expect(await render({ searchParams: Promise.resolve({ error: ["a", "b"] }) })).not.toContain('role="alert"');
  });
});

describe("editor: learner stats", () => {
  it("is one StatStrip with Learners, Completed, Certificates and Lessons", async () => {
    const tree = elements(await call());
    const strip = tree.find((e) => e.type === StatStrip)!;
    expect(strip.props.items).toEqual([
      { label: "Learners", value: 10 },
      { label: "Completed", value: 4, sub: "40% of learners" },
      { label: "Certificates", value: 3, sub: "Auto-issued on completion" },
      { label: "Lessons", value: 4, sub: "3 sections" },
    ]);
  });

  it("says 'Turned off' and '1 section' where it applies", async () => {
    current = product({ certificateEnabled: false, sections: [{ id: "s1", title: "Module 1" }] });
    const strip = elements(await call()).find((e) => e.type === StatStrip)!;
    expect(strip.props.items[2].sub).toBe("Turned off");
    expect(strip.props.items[3].sub).toBe("1 section");
  });
});

describe("editor: certificate toggle", () => {
  it("names the action it will take and is bound to the opposite state", async () => {
    let tree = elements(await call());
    expect(forms(tree).find((f) => f.action === "setCertificates")?.args).toEqual(["p_1", false]);
    expect(text(await render())).toContain("Turn off certificates");
    current = product({ certificateEnabled: false });
    tree = elements(await call());
    expect(forms(tree).find((f) => f.action === "setCertificates")?.args).toEqual(["p_1", true]);
    expect(text(await render())).toContain("Turn on certificates");
  });
});

describe("editor: curriculum structure", () => {
  it("lists the loose lessons first, then each section in order, and keeps lessons in their group in order", async () => {
    const html = await render();
    const inSummary = (title: string) => new RegExp(`<summary[^>]*>(?:(?!</summary>).)*${title}`);
    const order = [
      /<h3[^>]*>Lessons<\/h3>/, inSummary("Intro"), /<h3[^>]*>Module 1<\/h3>/, inSummary("Setup"),
      inSummary("Quiz time"), /<h3[^>]*>Module 2<\/h3>/, inSummary("Wrap-up"), /<h3[^>]*>Bonus<\/h3>/,
    ].map((re) => html.search(re));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("says 'No lessons here yet.' for an empty section, and only for it", async () => {
    const t = text(await render());
    expect(t.match(/No lessons here yet\./g)).toHaveLength(1);
  });

  it("hides the loose group when it is empty and sections exist, shows it (empty) when nothing exists", async () => {
    current = product({ items: [item({ id: "l1", title: "Setup", sectionId: "s1" })] });
    const sectioned = await render();
    expect(sectioned).not.toMatch(/<h3[^>]*>Lessons<\/h3>/);
    current = product({ sections: [], items: [] });
    const empty = await render();
    expect(empty).toMatch(/<h3[^>]*>Lessons<\/h3>/);
    expect(text(empty)).toContain("No lessons here yet.");
  });

  it("treats a lesson whose section no longer exists as loose", async () => {
    current = product({ items: [item({ id: "l9", title: "Orphan", sectionId: "gone" })] });
    const html = await render();
    expect(text(html.slice(html.indexOf("Lessons<")))).toContain("Orphan");
  });

  it("each lesson is a details whose summary shows its index and title, and is a touch-sized row", async () => {
    const html = await render();
    const summaries = [...html.matchAll(/<summary\b[^>]*>(.*?)<\/summary>/g)].map((m) => m[0]);
    const lessons = summaries.filter((s) => /Intro|Setup|Quiz time|Wrap-up/.test(s));
    expect(lessons).toHaveLength(4);
    for (const s of lessons) expect(s).toContain("pointer-coarse:min-h-11");
    expect(text(lessons[0])).toMatch(/^\s*1 Intro/);
    expect(text(lessons[1])).toMatch(/^\s*1 Setup/);
    expect(text(lessons[2])).toMatch(/^\s*2 Quiz time/);
  });
});

describe("editor: lesson rows", () => {
  const summaryOf = (html: string, title: string) => tag(html, new RegExp(`<summary\\b[^>]*>(?:(?!</summary>).)*${title}.*?</summary>`));

  it("shows drip, optional and kind as Badges (no legacy badge strings in the page source)", async () => {
    const html = await render();
    const quiz = summaryOf(html, "Quiz time");
    expect(quiz).toContain('<span class="badge badge-warn">drip</span>');
    expect(quiz).toContain('<span class="badge badge-muted">optional</span>');
    expect(quiz).toContain('<span class="badge badge-muted">Quiz</span>');
    const plain = summaryOf(html, "Setup");
    expect(plain).not.toContain("drip");
    expect(plain).not.toContain("optional");
    expect(plain).toContain('<span class="badge badge-muted">Video</span>');
  });

  it("labels the kind Badge with the same names as the Type select (KIND_LABEL, shared with LessonForm), not the raw value", async () => {
    const html = await render();
    expect(summaryOf(html, "Wrap-up")).toContain('<span class="badge badge-muted">Text</span>');
    expect(html).not.toMatch(/<span class="badge badge-muted">(?:video|quiz|text|pdf|link)<\/span>/);
    expect(KIND_LABEL).toMatchObject({ video: "Video", pdf: "PDF", text: "Text", link: "Link", quiz: "Quiz" });
  });

  it("puts '<n>% done' in the row when learners exist (0% for a lesson with no data), as text not a tooltip", async () => {
    const html = await render();
    expect(text(summaryOf(html, "Intro"))).toContain("90% done");
    expect(text(summaryOf(html, "Setup"))).toContain("40% done");
    expect(text(summaryOf(html, "Wrap-up"))).toContain("0% done");
    expect(html).not.toContain("title=");
  });

  it("shows no '% done' at all while nobody is enrolled", async () => {
    mocks.insights.mockResolvedValue(insights({ enrolled: 0, lessons: [] }));
    expect(text(await render())).not.toContain("% done");
  });
});

describe("editor: lesson panel", () => {
  it("quiz lessons, and only they, get Edit questions pointing at the quiz editor", async () => {
    const html = await render();
    const links = [...html.matchAll(/<a [^>]*>Edit questions<\/a>/g)].map((m) => m[0]);
    expect(links).toHaveLength(1);
    expect(links[0]).toContain('href="/dashboard/products/p_1/quiz/l2"');
  });

  it("passes LessonForm the lesson's saved values (dripDate in IST) and the update action; add form gets sections", async () => {
    const lessonForms = elements(await call()).filter((e) => e.type === LessonForm);
    expect(lessonForms).toHaveLength(5); // four edit forms and one add form
    const edit = lessonForms.find((e) => e.props.lesson?.title === "Quiz time")!;
    expect(edit.props.submitLabel).toBe("Save lesson");
    expect(edit.props.action.action).toBe("updateLesson");
    expect(edit.props.action.args).toEqual(["l2"]);
    expect(edit.props.lesson).toEqual({
      title: "Quiz time", kind: "quiz", url: "https://youtu.be/x", body: "", requiredForCompletion: false,
      dripType: "on_date", dripDays: null, dripDate: "2026-11-01",
    });
    const add = lessonForms.find((e) => !e.props.lesson)!;
    expect(add.props.submitLabel).toBe("Add lesson");
    expect(add.props.action.action).toBe("addLesson");
    expect(add.props.action.args).toEqual(["p_1"]);
    expect(add.props.sections).toEqual([{ id: "s1", title: "Module 1" }, { id: "s2", title: "Module 2" }, { id: "s3", title: "Bonus" }]);
  });

  it("Up is disabled on the first lesson of a group and Down on the last, both labelled with the lesson title", async () => {
    const html = await render();
    const btn = (label: string) => tag(html, new RegExp(`<button\\b[^>]*aria-label="${label}"[^>]*>.*?</button>`));
    const disabled = (b: string) => /\sdisabled(?:=""|\s|>)/.test(b);
    expect(disabled(btn("Move Intro up"))).toBe(true);
    expect(disabled(btn("Move Intro down"))).toBe(true); // alone in its group
    expect(disabled(btn("Move Setup up"))).toBe(true);
    expect(disabled(btn("Move Setup down"))).toBe(false);
    expect(disabled(btn("Move Quiz time up"))).toBe(false);
    expect(disabled(btn("Move Quiz time down"))).toBe(true);
    for (const l of ["Intro", "Setup"]) {
      expect(btn(`Move ${l} up`)).toContain("<svg");
      expect(text(btn(`Move ${l} up`)).trim()).toBe("Up");
      expect(btn(`Move ${l} up`)).toContain("pointer-coarse:min-h-11");
    }
    expect(text(btn("Move Setup down")).trim()).toBe("Down");
  });

  it("reorders through the real actions: moveLesson with the direction", async () => {
    const calls = forms(elements(await call())).filter((f) => f.action === "moveLesson");
    expect(calls).toHaveLength(8);
    expect(calls).toContainEqual({ action: "moveLesson", args: ["l2", "up"] });
    expect(calls.filter((c) => c.args[1] === "down")).toHaveLength(4);
  });

  it("offers Move to section as a labelled Select, preselected on the current section, with a Move button", async () => {
    const html = await render();
    // Setup (l1) is the first lesson whose Move to section form follows its summary.
    const setup = tag(html.slice(html.indexOf(">Setup<")), /<form [^>]*>(?:(?!<\/form>).)*Move to section(?:(?!<\/form>).)*Move<\/button><\/form>/);
    expect(setup).toContain('<label for=');
    expect(setup).toContain(">Move to section</label>");
    expect(setup).toMatch(/<option value=""[^>]*>Lessons \(no section\)<\/option>/);
    expect(setup).toMatch(/<option value="s1" selected="">Module 1<\/option>/);
    expect(setup).toMatch(/<option value="s2">Module 2<\/option>/);
    expect(setup).toContain('name="sectionId"');
    expect(html).not.toContain("sr-only\">Move to section");
    const moves = forms(elements(await call())).filter((f) => f.action === "moveLessonToSection");
    expect(moves.map((m) => m.args)).toEqual([["l0"], ["l1"], ["l2"], ["l3"]]);
  });

  it("has no Move to section control when there are no sections", async () => {
    current = product({ sections: [], items: [item({ id: "l0", title: "Intro" })] });
    expect(text(await render())).not.toContain("Move to section");
  });
});

describe("editor: sections", () => {
  it("each section has a heading, a visible Rename cue with a save form, and Up / Down", async () => {
    const html = await render();
    for (const s of ["Module 1", "Module 2", "Bonus"]) expect(html).toMatch(new RegExp(`<h3[^>]*>${s}</h3>`));
    expect(text(html).match(/Rename/g)!.length).toBeGreaterThanOrEqual(3);
    const renames = elements(await call()).filter((e) => e.type === ActionForm && e.props.action.action === "renameSection");
    expect(renames.map((r) => r.props.action.args)).toEqual([["s1"], ["s2"], ["s3"]]);
  });

  it("Up is disabled on the first section, Down on the last; the middle one has both", async () => {
    const html = await render();
    const disabled = (label: string) => /\sdisabled(?:=""|\s|>)/.test(tag(html, new RegExp(`<button\\b[^>]*aria-label="${label}"[^>]*>`)));
    expect(disabled("Move section Module 1 up")).toBe(true);
    expect(disabled("Move section Module 1 down")).toBe(false);
    expect(disabled("Move section Module 2 up")).toBe(false);
    expect(disabled("Move section Module 2 down")).toBe(false);
    expect(disabled("Move section Bonus up")).toBe(false);
    expect(disabled("Move section Bonus down")).toBe(true);
    const moves = forms(elements(await call())).filter((f) => f.action === "moveSection");
    expect(moves).toContainEqual({ action: "moveSection", args: ["s2", "down"] });
  });

  it("the loose Lessons group has no section controls", async () => {
    const html = await render();
    expect(html).not.toContain('aria-label="Move section Lessons');
  });
});

describe("editor: add forms", () => {
  it("add section is an ActionForm with a Title field and a real secondary submit button", async () => {
    const tree = elements(await call());
    const add = tree.find((e) => e.type === ActionForm && e.props.action.action === "addSection")!;
    expect(add.props.action.args).toEqual(["p_1"]);
    const html = await render();
    expect(html).toMatch(/<button type="submit" class="btn btn-secondary btn-sm[^"]*">Add section<\/button>/);
    expect(html).toMatch(/<h3[^>]*>Add a section<\/h3>/);
    expect(html).toMatch(/<h3[^>]*>Add a lesson<\/h3>/);
  });
});

describe("editor: confirmations", () => {
  it("has one ConfirmButton per lesson, per section, and one for the product", async () => {
    const all = confirms(elements(await call()));
    expect(all.filter((c) => actionOf(c)?.action === "deleteLesson")).toHaveLength(4);
    expect(all.filter((c) => actionOf(c)?.action === "deleteSection")).toHaveLength(3);
    expect(all.filter((c) => actionOf(c)?.action === "deleteProduct")).toHaveLength(1);
    expect(all).toHaveLength(8);
  });

  it("names what is deleted in the dialog title and the confirm button, and in the trigger's accessible name", async () => {
    const all = confirms(elements(await call()));
    const lesson = all.find((c) => actionOf(c)?.action === "deleteLesson" && actionOf(c)?.args[0] === "l1")!;
    expect(lesson.props.message).toBe("Delete this lesson? Learner progress on it is removed.");
    expect(lesson.props.confirmLabel).toBe("Delete lesson");
    expect(lesson.props["aria-label"]).toBe("Delete lesson Setup");
    expect(lesson.props.children).toBe("Delete");
    const section = all.find((c) => actionOf(c)?.action === "deleteSection" && actionOf(c)?.args[0] === "s1")!;
    expect(section.props.message).toBe("Delete this section? Its lessons are kept and move to “Lessons”.");
    expect(section.props.confirmLabel).toBe("Delete section");
    expect(section.props["aria-label"]).toBe("Delete section Module 1");
    const prod = all.find((c) => actionOf(c)?.action === "deleteProduct")!;
    expect(actionOf(prod)?.args).toEqual(["p_1"]);
    expect(prod.props.message).toBe("Delete this product and its lessons permanently?");
    expect(prod.props.confirmLabel).toBe("Delete product");
    expect(prod.props.children).toBe("Delete product");
  });

  it("renders each trigger as the small danger button with only the touch floor as extra classes (the look comes from ConfirmButton)", async () => {
    const html = await render();
    const COARSE = "pointer-coarse:min-h-11";
    const all = confirms(elements(await call()));
    for (const c of all) {
      expect(c.props.className).toBe(COARSE);
      expect(c.props.variant).toBeUndefined();
      expect(c.props.size).toBeUndefined();
    }
    expect(html).toContain(`<button type="submit" class="btn btn-danger btn-sm ${COARSE}" aria-label="Delete lesson Setup">Delete</button>`);
    expect(html).toContain(`<button type="submit" class="btn btn-danger btn-sm ${COARSE}" aria-label="Delete section Module 1">Delete</button>`);
    expect(html).toContain(`<button type="submit" class="btn btn-danger btn-sm ${COARSE}">Delete product</button>`);
  });

  it("with orders the product button says Unpublish & archive and reassures buyers keep access", async () => {
    current = product({ _count: { orders: 3 } });
    const prod = confirms(elements(await call())).find((c) => actionOf(c)?.action === "deleteProduct")!;
    expect(prod.props.message).toBe("Unpublish this product? Existing buyers keep access.");
    expect(prod.props.confirmLabel).toBe("Unpublish & archive");
    expect(prod.props.children).toBe("Unpublish & archive");
    expect(text(await render())).toContain("This product has orders, so it can");
  });

  it("without orders the danger zone says deleting is permanent", async () => {
    expect(text(await render())).toContain("Deleting removes the product and its lessons permanently.");
  });
});

describe("editor: layout", () => {
  it("is ruled sections on paper: no .card boxes, no resting shadow", async () => {
    const html = await render();
    const classTokens = [...html.matchAll(/\sclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
    expect(classTokens).not.toContain("card");
    expect(html).not.toContain("shadow");
    expect(html).toMatch(/xl:grid-cols-\[/);
  });
});

describe("editor: RSC boundary", () => {
  it("only server actions cross into client components or forms, and the client boundaries are all reached", async () => {
    const visited = new Set<unknown>();
    const found = functionProps(await call(), BOUNDARIES, { onVisit: (t) => visited.add(t) });
    expect(found.length).toBeGreaterThan(0);
    expect(found.filter((p) => !/^<(?:form|ProductForm|LessonForm|ActionForm)>\.action$/.test(p))).toEqual([]);
    for (const type of [PageHeader, StatStrip, StatusBadge, ProductForm, LessonForm, ConfirmButton, ActionForm, SubmitButton, Field, Select]) {
      expect(visited.has(type), String((type as { name?: string }).name)).toBe(true);
    }
  });

  it("the empty curriculum is walked too", async () => {
    current = product({ sections: [], items: [] });
    const found = functionProps(await call(), BOUNDARIES);
    expect(found.filter((p) => !/\.action$/.test(p))).toEqual([]);
  });

  it("positive control: a handler planted in the page tree is reported", async () => {
    const planted = (
      <>
        {await call()}
        <button onClick={() => {}}>x</button>
      </>
    );
    expect(functionProps(planted, BOUNDARIES)).toContain("<button>.onClick");
  });
});

describe("editor: source hygiene", () => {
  const clean = 'const a = "btn-sm px-2"; if (!product) return; const b = x !== y; const c = `p-4 ${y}`;';
  const dirty = [
    'className="input !w-auto !py-1.5 text-xs"',
    'className="mb-5 rounded-xl bg-bad-soft px-4"',
    'className="btn btn-secondary btn-sm"',
    'className="card p-5"',
    '<span className="badge badge-warn">drip</span>',
    '<span title="Learners who completed this lesson">',
    '"View page ↗"',
    'className="sm:!hidden"',
    'className="sm:hidden!"',
    'className="bg-[#fff]!"',
    'className="w-auto!"',
    'className="px-2 sm:py-1.5! text-xs"',
    "className={wide ? 'w-full' : 'w-auto!'}",
    "className='mb-5 rounded-xl'",
    "const cls = 'btn btn-secondary';",
    '<span title={"Learners who completed this lesson"}>',
    "<span title={'Learners who completed this lesson'}>",
    "<span title='Learners'>",
  ];

  it("the scanner passes ordinary code and class names, including `!` in plain JS", () => {
    expect(legacyStyleFindings(clean.replace("btn-sm", "gap-2"))).toEqual([]);
  });

  it("the scanner does not mistake copy ending in `!`, apostrophes in prose or a variable title for a finding", () => {
    expect(legacyStyleFindings('<p className="text-sm">Saved!</p> const m = "Saved!"; const n = \'Saved!\'; const t = "Done!";')).toEqual([]);
    expect(legacyStyleFindings("// it's fine, we don't scan prose here\nconst a = 'gap-2 px-3'; <PageHeader title={product.title} />")).toEqual([]);
  });

  it.each(dirty)("the scanner catches %s", (line) => {
    expect(legacyStyleFindings(line).length).toBeGreaterThan(0);
  });

  it("the editor page source has none of it", () => {
    expect(legacyStyleFindings(readFileSync(PAGE_PATH, "utf8"))).toEqual([]);
  });
});
