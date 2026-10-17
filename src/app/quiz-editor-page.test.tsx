import { readFileSync } from "node:fs";
import { isValidElement, type ReactNode } from "react";
import Link from "next/link";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => {
  /** A stand-in server action: `.bind` returns a tagged function so a test can read WHICH action a form got, and its bound args. */
  const action = (name: string) => {
    const fn = (() => undefined) as unknown as { bind: (...a: unknown[]) => unknown };
    fn.bind = (_this: unknown, ...args: unknown[]) => Object.assign(() => undefined, { action: name, args });
    return fn;
  };
  return {
    findFirst: vi.fn<(a: Record<string, unknown>) => Promise<unknown>>(),
    exhausted: vi.fn<(creatorId: string, itemId: string) => Promise<unknown[]>>(),
    notFound: vi.fn(() => {
      throw new Error("NOT_FOUND");
    }),
    saveQuiz: action("saveQuiz"),
    resetAttemptsAction: action("resetAttemptsAction"),
  };
});

vi.mock("next/navigation", () => ({ notFound: mocks.notFound, redirect: (to: string) => { throw new Error(`REDIRECT ${to}`); }, usePathname: () => "/dashboard/products/p_1/quiz/i_1" }));
vi.mock("@/lib/auth/session", () => ({ requireCreator: async () => ({ user: {}, creator: { id: "cr_1" } }) }));
vi.mock("@/lib/db", () => ({ db: { contentItem: { findFirst: mocks.findFirst } } }));
vi.mock("@/lib/learning/admin", () => ({ listExhaustedLearners: mocks.exhausted }));
vi.mock("@/app/actions/curriculum", () => ({ saveQuiz: mocks.saveQuiz, resetAttemptsAction: mocks.resetAttemptsAction }));

import { QuizEditor, type QuizDefaults } from "@/components/QuizEditor";
import { Button, PageHeader } from "@/components/ui";
import { functionProps } from "@/test/rsc-safe";
import { legacyStyleFindings } from "@/test/style-scan";
import QuizPage from "./dashboard/(console)/products/[id]/quiz/[itemId]/page";

const PAGE_PATH = new URL("./dashboard/(console)/products/[id]/quiz/[itemId]/page.tsx", import.meta.url);
const BOUNDARIES: unknown[] = [QuizEditor, Link];

const quizItem = (over: Record<string, unknown> = {}) => ({
  id: "i_1",
  productId: "p_1",
  kind: "quiz",
  title: "GST basics quiz",
  product: { creatorId: "cr_1" },
  quiz: {
    // Values that differ from the editor's own defaults (70 / 3), so a hardcoded copy of those cannot pass.
    passPct: 80,
    maxAttempts: 5,
    shuffle: true,
    // Stored rows carry ids and positions the editor must not receive.
    questions: [
      {
        id: "q_1", position: 0, prompt: "Rate for online courses?", kind: "single", explanation: "18%",
        options: [{ id: "o_1", position: 0, text: "5%", correct: false }, { id: "o_2", position: 1, text: "18%", correct: true }],
      },
      {
        id: "q_2", position: 1, prompt: "Valid UPI handles?", kind: "multi", explanation: "",
        options: [{ id: "o_3", position: 0, text: "meera@okhdfc", correct: true }, { id: "o_4", position: 1, text: "meera", correct: false }, { id: "o_5", position: 2, text: "shop@ybl", correct: true }],
      },
    ],
  },
  ...over,
});
const learner = (over: Record<string, unknown> = {}) => ({ userId: "u_1", name: "Asha Rao", email: "asha@example.com", attempts: 3, lastScorePct: 40, ...over });

let current: ReturnType<typeof quizItem> | null;
beforeEach(() => {
  current = quizItem();
  mocks.findFirst.mockReset();
  mocks.exhausted.mockReset();
  mocks.notFound.mockClear();
  // Behaves like the database: the item must match every clause of the where.
  mocks.findFirst.mockImplementation(async (a) => {
    const w = a.where as { id?: string; productId?: string; kind?: string; product?: { creatorId?: string } };
    return current && w.id === current.id && w.productId === current.productId && w.kind === current.kind && w.product?.creatorId === current.product.creatorId ? current : null;
  });
  mocks.exhausted.mockResolvedValue([]);
});

type Props = { params?: Promise<{ id: string; itemId: string }> };
const call = async (p: Props = {}) =>
  (await (QuizPage as (p: unknown) => Promise<ReactNode>)({ params: Promise.resolve({ id: "p_1", itemId: "i_1" }), ...p })) as ReactNode;
const render = async (p: Props = {}) => renderToStaticMarkup(<>{await call(p)}</>);
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

type El = { type: unknown; props: Record<string, any>; ancestors: Array<{ type: unknown; props: Record<string, any> }> }; // eslint-disable-line @typescript-eslint/no-explicit-any
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

describe("quiz page: lookup", () => {
  it("finds the quiz item by id AND product AND kind quiz AND the signed-in creator's product", async () => {
    await render();
    expect(mocks.findFirst).toHaveBeenCalledTimes(1);
    const args = mocks.findFirst.mock.calls[0][0] as { where: unknown; include: Record<string, unknown> };
    expect(args.where).toEqual({ id: "i_1", productId: "p_1", kind: "quiz", product: { creatorId: "cr_1" } });
    // Both levels are ordered by position, each on its own: questions in the quiz, options in each question.
    const questions = (args.include as { quiz: { include: { questions: { orderBy?: unknown; include: { options: { orderBy?: unknown } } } } } }).quiz.include.questions;
    expect(questions.orderBy).toEqual({ position: "asc" });
    expect(questions.include.options.orderBy).toEqual({ position: "asc" });
  });

  it("is a 404 for another product's item, another creator's, a non-quiz lesson, or a quiz with no body", async () => {
    for (const mutate of [
      { productId: "p_other" },
      { product: { creatorId: "cr_other" } },
      { kind: "video" },
      { quiz: null },
    ]) {
      current = quizItem(mutate);
      mocks.notFound.mockClear();
      await expect(render()).rejects.toThrow("NOT_FOUND");
      expect(mocks.notFound).toHaveBeenCalled();
    }
    expect(mocks.exhausted).not.toHaveBeenCalled();
  });

  it("asks for the stuck learners of this creator's item only after the lookup passed", async () => {
    await render();
    expect(mocks.exhausted).toHaveBeenCalledWith("cr_1", "i_1");
  });
});

describe("quiz page: header and editor", () => {
  it("uses the PageHeader back link with an icon instead of a typed arrow", async () => {
    const html = await render();
    expect(html).toMatch(/<a [^>]*href="\/dashboard\/products\/p_1"[^>]*><svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg>Back to product<\/a>/);
    expect(html).not.toContain("←");
    expect(html).toContain(">GST basics quiz</h1>");
    const header = elements(await call()).find((e) => e.type === PageHeader)!;
    expect(header.props.back).toEqual({ label: "Back to product", href: "/dashboard/products/p_1" });
  });

  it("hands QuizEditor saveQuiz bound to the item, and the stored quiz as defaults", async () => {
    const ed = elements(await call()).find((e) => e.type === QuizEditor)!;
    const bound = ed.props.action as unknown as { action: string; args: unknown[] };
    expect({ action: bound.action, args: bound.args }).toEqual({ action: "saveQuiz", args: ["i_1"] });
    expect(ed.props.defaults).toEqual({
      passPct: 80, maxAttempts: 5, shuffle: true,
      questions: [
        { prompt: "Rate for online courses?", kind: "single", explanation: "18%", options: [{ text: "5%", correct: false }, { text: "18%", correct: true }] },
        {
          prompt: "Valid UPI handles?", kind: "multi", explanation: "",
          options: [{ text: "meera@okhdfc", correct: true }, { text: "meera", correct: false }, { text: "shop@ybl", correct: true }],
        },
      ],
    });
  });

  it("maps the kind of each question as stored, and passes shuffle off and unlimited attempts through", async () => {
    const ed = elements(await call()).find((e) => e.type === QuizEditor)!;
    expect((ed.props.defaults as QuizDefaults).questions.map((q) => q.kind)).toEqual(["single", "multi"]);
    current = quizItem({ quiz: { passPct: 60, maxAttempts: null, shuffle: false, questions: [] } });
    const again = elements(await call()).find((e) => e.type === QuizEditor)!;
    expect(again.props.defaults).toEqual({ passPct: 60, maxAttempts: null, shuffle: false, questions: [] });
  });

  it("renders the editor with the questions and settings", async () => {
    const html = await render();
    expect(html).toContain("Question 1 prompt");
    expect(html).toContain('name="passPct"');
  });
});

describe("quiz page: out of attempts", () => {
  it("renders nothing for it when nobody is stuck", async () => {
    expect(text(await render())).not.toContain("Out of attempts");
  });

  it("lists each stuck learner in a ruled section (no .card), with divide-y rows", async () => {
    mocks.exhausted.mockResolvedValue([learner(), learner({ userId: "u_2", name: "Ravi K", email: "ravi@example.com", attempts: 1, lastScorePct: 10 })]);
    const html = await render();
    const tokens = [...html.matchAll(/\sclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
    expect(tokens).not.toContain("card");
    expect(html).toMatch(/<section aria-labelledby="out-of-attempts-h" class="[^"]*\bborder-t\b/);
    expect(html).toMatch(/<h2 id="out-of-attempts-h"[^>]*>Out of attempts<\/h2>/);
    expect(html).toMatch(/<ul class="[^"]*\bdivide-y\b/);
    const t = text(html);
    expect(t).toContain("asha@example.com · 3 attempts · last score 40%");
    expect(t).toContain("ravi@example.com · 1 attempt · last score 10%");
    expect(t).not.toContain("1 attempts");
  });

  it("gives each learner a Give new attempts secondary button named for them, with a touch floor, in a form bound to that learner", async () => {
    mocks.exhausted.mockResolvedValue([learner(), learner({ userId: "u_2", name: 'Ravi "R" K' })]);
    const html = await render();
    const btns = [...html.matchAll(/<button\b[^>]*>\s*Give new attempts<\/button>/g)].map((m) => m[0]);
    expect(btns).toHaveLength(2);
    expect(btns[0]).toContain('aria-label="Give new attempts to Asha Rao"');
    expect(btns[1]).toContain('aria-label="Give new attempts to Ravi &quot;R&quot; K"');
    for (const b of btns) {
      expect(b).toContain('type="submit"');
      expect(b).toMatch(/class="[^"]*\bbtn-secondary\b[^"]*\bbtn-sm\b/);
      expect(b).toContain("pointer-coarse:min-h-11");
    }
    const forms = elements(await call()).filter((e) => e.type === "form" && e.ancestors.every((a) => a.type !== QuizEditor));
    const bound = forms.map((f) => f.props.action as unknown as { action: string; args: unknown[] }).map((a) => ({ action: a.action, args: a.args }));
    expect(bound).toEqual([
      { action: "resetAttemptsAction", args: ["i_1", "u_1"] },
      { action: "resetAttemptsAction", args: ["i_1", "u_2"] },
    ]);
  });
});

describe("quiz page: RSC boundary", () => {
  it("only server actions cross, QuizEditor is a declared client boundary and is reached", async () => {
    mocks.exhausted.mockResolvedValue([learner()]);
    const visited = new Set<unknown>();
    const found = functionProps(await call(), BOUNDARIES, { onVisit: (t) => visited.add(t) });
    expect(found.length).toBeGreaterThan(0);
    expect(found.filter((p) => !/^<(?:form|QuizEditor)>\.action$/.test(p))).toEqual([]);
    for (const type of [PageHeader, QuizEditor, Button]) expect(visited.has(type), String((type as { name?: string }).name)).toBe(true);
  });

  it("the page without stuck learners is walked too", async () => {
    const found = functionProps(await call(), BOUNDARIES);
    expect(found.filter((p) => !/^<(?:form|QuizEditor)>\.action$/.test(p))).toEqual([]);
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

describe("quiz page: source hygiene", () => {
  it("has no legacy classes, ! utilities, glyphs or title tooltips", () => {
    expect(legacyStyleFindings(readFileSync(PAGE_PATH, "utf8"))).toEqual([]);
  });
});
