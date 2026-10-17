import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));
vi.mock("@/app/actions/learning", () => ({ submitQuizAction: async () => ({ ok: false, error: "x" }) }));

import type { QuizSubmission } from "@/lib/learning/service";
import { QuizFailed, QuizForm, QuizPassed, QuizPlayer, QuizReview, QuizView, toggleAnswer, type QuizQuestion } from "./QuizPlayer";

const render = renderToStaticMarkup;
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const GLYPH = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}]/u;

const single: QuizQuestion = { id: "q1", prompt: "Which book records sales?", kind: "single", options: [{ id: "a", text: "Sales day book" }, { id: "b", text: "Cash book" }] };
const multi: QuizQuestion = { id: "q2", prompt: "Which are assets?", kind: "multi", options: [{ id: "c", text: "Cash" }, { id: "d", text: "Debtors" }, { id: "e", text: "Capital" }] };
const questions = [single, multi];

const props = { itemId: "i1", questions, passPct: 60, attemptsLeft: 3 as number | null, lastScorePct: null as number | null, nextHref: "/library/p1?lesson=next", completed: false };
const sub = (over: Partial<QuizSubmission> = {}): QuizSubmission => ({ passed: false, scorePct: 40, correctCount: 1, total: 2, attemptsLeft: 2, ...over });
const form = (over: Partial<Parameters<typeof QuizForm>[0]> = {}) =>
  render(
    <QuizForm questions={questions} passPct={60} attemptsLeft={3} lastScorePct={null} result={null} answers={{}} error={null} pending={false}
      onToggle={() => {}} onSubmit={() => {}} {...over} />,
  );

describe("toggleAnswer", () => {
  it("single choice: the clicked option replaces any earlier one", () => {
    const a1 = toggleAnswer({}, single, "a");
    expect(a1).toEqual({ q1: ["a"] });
    expect(toggleAnswer(a1, single, "b")).toEqual({ q1: ["b"] });
  });

  it("single choice: clicking the chosen option again keeps it chosen, as a radio does", () => {
    expect(toggleAnswer({ q1: ["a"] }, single, "a")).toEqual({ q1: ["a"] });
  });

  it("multi choice: adds, then removes, and keeps the order of the rest", () => {
    let a = toggleAnswer({}, multi, "c");
    a = toggleAnswer(a, multi, "e");
    expect(a).toEqual({ q2: ["c", "e"] });
    a = toggleAnswer(a, multi, "c");
    expect(a).toEqual({ q2: ["e"] });
    expect(toggleAnswer(a, multi, "e")).toEqual({ q2: [] });
  });

  it("never touches other questions and never mutates its input", () => {
    const before = { q1: ["a"], q2: ["c"] };
    const frozen = JSON.stringify(before);
    const after = toggleAnswer(before, multi, "d");
    expect(JSON.stringify(before)).toBe(frozen);
    expect(after.q1).toBe(before.q1);
    expect(after).toEqual({ q1: ["a"], q2: ["c", "d"] });
  });
});

describe("QuizPlayer: initial states", () => {
  it("fresh quiz: radios for single, checkboxes for multi, one fieldset and legend each, and the right hints", () => {
    const html = render(<QuizPlayer {...props} />);
    expect(html.match(/<fieldset/g)).toHaveLength(2);
    expect(html.match(/<legend/g)).toHaveLength(2);
    expect(html.match(/type="radio"/g)).toHaveLength(2);
    expect(html.match(/type="checkbox"/g)).toHaveLength(3);
    expect(html).toContain("Choose one");
    expect(html).toContain("Choose all that apply");
    expect(html).toContain('name="q-q1"');
    expect(html).toContain('name="q-q2"');
    expect(html).not.toMatch(/<input[^>]*\schecked/);
    expect(text(html)).toContain("Pass mark 60%. 3 attempts left.");
    expect(html).toMatch(/<button [^>]*type="button"[^>]*>Submit answers<\/button>/);
    expect(html).not.toContain('role="alert"');
  });

  it("says 1 attempt left in the singular, unlimited when there is no cap, and shows the last score", () => {
    expect(text(render(<QuizPlayer {...props} attemptsLeft={1} />))).toContain("1 attempt left.");
    expect(text(render(<QuizPlayer {...props} attemptsLeft={null} />))).toContain("Unlimited attempts.");
    expect(text(render(<QuizPlayer {...props} lastScorePct={40} />))).toContain("Last score 40%.");
  });

  it("already passed: a good callout, no form, not an alert", () => {
    const html = render(<QuizPlayer {...props} completed />);
    expect(text(html)).toBe("You've passed this quiz.");
    expect(html).toContain("bg-good-soft");
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain("<fieldset");
    expect(html).not.toContain("<button");
  });

  it("no attempts left: a bad callout in an alert with the original wording, no form", () => {
    const html = render(<QuizPlayer {...props} attemptsLeft={0} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("bg-bad-soft");
    expect(text(html)).toBe("You've used all attempts for this quiz. Contact the creator if you need another.");
    expect(html).not.toContain("<fieldset");
  });

  it("completed wins over attemptsLeft 0 (a passed quiz is not 'out of attempts')", () => {
    const html = render(<QuizPlayer {...props} completed attemptsLeft={0} />);
    expect(text(html)).toBe("You've passed this quiz.");
    expect(html).not.toContain('role="alert"');
  });
});

describe("QuizForm: answers, errors, pending", () => {
  it("draws the chosen answers as checked and leaves the rest unchecked", () => {
    const html = form({ answers: { q1: ["b"], q2: ["c", "e"] } });
    expect(html.match(/<input[^>]*\schecked/g)).toHaveLength(3);
    expect(html).toMatch(/<input[^>]*value="b"[^>]*checked|<input[^>]*checked[^>]*value="b"/);
    expect(html).not.toMatch(/<input[^>]*value="a"[^>]*\schecked/);
    expect(html).not.toMatch(/<input[^>]*value="d"[^>]*\schecked/);
  });

  it("shows the server's error string verbatim in a bad callout, with nothing added", () => {
    for (const err of ["No attempts left.", "You've already passed this quiz.", "Another submission was just processed. Reload and check your attempts.", "Those answers couldn't be read. Reload and try again."]) {
      const html = form({ error: err });
      const alert = html.match(/<div role="alert"[^>]*>[\s\S]*?<\/svg><div class="min-w-0 flex-1">([\s\S]*?)<\/div><\/div>/);
      expect(alert, err).not.toBeNull();
      expect(text(alert![1])).toBe(err);
      expect(html).toContain("bg-bad-soft");
    }
  });

  it("escapes an error string rather than injecting it", () => {
    const html = form({ error: "<img src=x onerror=alert(1)>" });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("renders no alert when there is no error", () => {
    expect(form()).not.toContain('role="alert"');
  });

  it("pending: every answer is disabled and the submit button is busy and not activatable", () => {
    const html = form({ pending: true });
    expect(html.match(/<input[^>]*\sdisabled/g)).toHaveLength(5);
    expect(html).toMatch(/<button [^>]*aria-busy="true"[^>]*aria-disabled="true"/);
  });

  it("not pending: nothing is disabled", () => {
    expect(form()).not.toMatch(/\sdisabled/);
  });

  it("each answer is a card with its text as the accessible name, and the 44px touch floor on checkboxes", () => {
    const html = form();
    expect(html).toMatch(/<span id="[^"]+" class="block text-sm font-semibold text-ink">Sales day book<\/span>/);
    expect(html).toContain("pointer-coarse:min-h-11");
  });

  it("after a failed attempt: 'Try again', the new attempts count and the form stays", () => {
    const html = form({ result: sub({ attemptsLeft: 2 }) });
    expect(text(html)).toContain("2 attempts left.");
    expect(html).toContain("Try again");
    expect(html).toContain("<fieldset");
  });

  it("when the last attempt fails: no form and no submit, the callout says so, answers revealed", () => {
    const html = form({ result: sub({ attemptsLeft: 0, reveal: [{ questionId: "q1", correct: false, correctOptionIds: ["a"], explanation: "" }] }) });
    expect(html).not.toContain("<fieldset");
    expect(html).not.toContain("<button");
    expect(text(html)).toContain("You've used all your attempts.");
    expect(text(html)).toContain("Correct answer");
  });
});

describe("QuizFailed and QuizPassed: every Callout tone", () => {
  it("a failed attempt with attempts left is a bad alert that says to try again and reveals nothing", () => {
    const html = render(<QuizFailed questions={questions} result={sub({ attemptsLeft: 2 })} passPct={60} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("bg-bad-soft");
    expect(text(html)).toBe("You scored 40% (1 of 2). You need 60%. Review the material and try again.");
    expect(html).not.toContain("Correct answer");
  });

  it("a failed final attempt is a bad alert that says attempts are used and reveals the answers", () => {
    const reveal = [
      { questionId: "q1", correct: false, correctOptionIds: ["a"], explanation: "Sales go in the sales day book." },
      { questionId: "q2", correct: false, correctOptionIds: ["c", "d"], explanation: "" },
    ];
    const html = render(<QuizFailed questions={questions} result={sub({ attemptsLeft: 0, reveal })} passPct={60} />);
    expect(text(html)).toContain("You've used all your attempts.");
    expect(text(html)).not.toContain("try again");
    expect(html.match(/Correct answer/g)).toHaveLength(3);
    expect(text(html)).toContain("Sales go in the sales day book.");
  });

  it("a passed attempt is a good callout (not an alert) with the score, the review and a Continue link", () => {
    const reveal = [{ questionId: "q1", correct: true, correctOptionIds: ["a"], explanation: "" }, { questionId: "q2", correct: true, correctOptionIds: ["c"], explanation: "" }];
    const html = render(<QuizPassed questions={questions} result={sub({ passed: true, scorePct: 100, correctCount: 2, reveal })} nextHref="/library/p1?lesson=next" />);
    expect(text(html)).toContain("Passed with 100%. 2 of 2 correct.");
    expect(html).toContain("bg-good-soft");
    expect(html).not.toContain('role="alert"');
    expect(html).toMatch(/<a [^>]*href="\/library\/p1\?lesson=next"[^>]*>Continue<svg/);
    expect(html).not.toContain("→");
  });

  it("a passed attempt with no next lesson offers no Continue link", () => {
    const html = render(<QuizPassed questions={questions} result={sub({ passed: true })} nextHref={null} />);
    expect(html).not.toContain("Continue");
    expect(html).not.toContain("<a ");
  });
});

describe("QuizReview: the right answer is marked in words, not colour alone", () => {
  const reveal = [{ questionId: "q1", correct: true, correctOptionIds: ["a"], explanation: "Because." }, { questionId: "q2", correct: true, correctOptionIds: ["c", "d"], explanation: "" }];
  const html = render(<QuizReview questions={questions} reveal={reveal} />);

  it("prints 'Correct answer' beside each right option, with an icon, and only those", () => {
    expect(html.match(/\(Correct answer\)/g)).toHaveLength(3);
    for (const right of ["Sales day book", "Cash", "Debtors"]) {
      expect(html).toMatch(new RegExp(`<svg[^>]*aria-hidden="true"[^>]*>(?:<path[^>]*></path>)+</svg><span>${right} <span class="font-medium">\\(Correct answer\\)</span></span>`));
    }
    for (const wrong of ["Cash book", "Capital"]) {
      const li = html.match(new RegExp(`<li[^>]*>${wrong}</li>`));
      expect(li, wrong).not.toBeNull();
      expect(li![0]).not.toContain("Correct answer");
      expect(li![0]).not.toContain("<svg");
    }
  });

  it("uses no '✓ ' or '· ' prefix characters and no glyphs at all", () => {
    expect(html).not.toMatch(GLYPH);
    expect(text(html)).not.toMatch(/· (Sales|Cash|Debtors|Capital)/);
  });

  it("shows an explanation when there is one and marks nothing when there is no reveal data", () => {
    expect(text(html)).toContain("Because.");
    const bare = render(<QuizReview questions={questions} reveal={undefined} />);
    expect(bare).not.toContain("Correct answer");
    expect(text(bare)).toContain("Sales day book");
  });
});

/*
 * Result announcement and focus. A node suite cannot assert real focus or what a screen reader says, so these pin the
 * structure that makes both work: ONE polite live region that is in the DOM before its text changes, and a focusable
 * wrapper around the result for the effect to focus. The real behaviour is checked in a browser.
 */
const view = (over: Partial<Parameters<typeof QuizView>[0]> = {}) =>
  render(
    <QuizView
      {...props} result={null} answers={{}} error={null} pending={false} announce="" onToggle={() => {}} onSubmit={() => {}} {...over} />,
  );
const reveal = [{ questionId: "q1", correct: true, correctOptionIds: ["a"], explanation: "" }, { questionId: "q2", correct: true, correctOptionIds: ["c"], explanation: "" }];
const LIVE = /<p role="status" class="sr-only"><\/p>/g;

describe("QuizView: one persistent, empty live region in every state", () => {
  const states: Array<[string, Partial<Parameters<typeof QuizView>[0]>]> = [
    ["fresh", {}],
    ["already passed", { completed: true }],
    ["out of attempts", { attemptsLeft: 0 }],
    ["passed just now", { result: sub({ passed: true, scorePct: 100, correctCount: 2, reveal }) }],
    ["failed with attempts left", { result: sub({ attemptsLeft: 2 }) }],
    ["failed on the last attempt", { result: sub({ attemptsLeft: 0 }) }],
  ];
  for (const [name, over] of states) {
    it(`${name}: exactly one empty role="status" and no other live region of that kind`, () => {
      const html = view(over);
      expect(html.match(LIVE)).toHaveLength(1);
      expect(html.match(/role="status"/g)).toHaveLength(1);
    });
  }

  it("the live region comes first, so it keeps its place when the branch below it changes", () => {
    for (const [, over] of states) expect(view(over).startsWith('<p role="status" class="sr-only">')).toBe(true);
  });

  it("carries the announcement text when there is one", () => {
    expect(view({ announce: "Passed with 100%. 2 of 2 correct." })).toContain('<p role="status" class="sr-only">Passed with 100%. 2 of 2 correct.</p>');
  });

  it("the result Callout does not carry the role: a region inserted together with its text is the unreliable case", () => {
    const passed = view({ result: sub({ passed: true, scorePct: 100, correctCount: 2, reveal }) });
    expect(passed).toContain("bg-good-soft");
    expect(passed.match(/role="status"/g)).toHaveLength(1);
  });
});

describe("the result is wrapped in a focus target", () => {
  it("passed: a tabindex=-1 wrapper holds the Callout, with scroll margin for the sticky header", () => {
    const html = render(<QuizPassed questions={questions} result={sub({ passed: true, scorePct: 100, correctCount: 2, reveal })} nextHref={null} />);
    expect(html).toMatch(/<div tabindex="-1" class="outline-none scroll-mt-24"><div class="[^"]*bg-good-soft/);
  });

  it("failed: the same wrapper holds the alert", () => {
    const html = render(<QuizFailed questions={questions} result={sub()} passPct={60} />);
    expect(html).toMatch(/<div tabindex="-1" class="outline-none scroll-mt-24"><div role="alert"/);
  });

  it("the form shows exactly one wrapper after a failed attempt, and none before any attempt", () => {
    expect(form({ result: sub() }).match(/tabindex="-1"/g)).toHaveLength(1);
    expect(form()).not.toContain('tabindex="-1"');
  });
});

describe("focus is moved in an effect body, never a cleanup", () => {
  const src = readFileSync(path.join(__dirname, "QuizPlayer.tsx"), "utf8");

  it("focuses the result wrapper inside a useEffect keyed on the result", () => {
    expect(src).toMatch(/useEffect\(\(\) => \{\s*if \(result\) resultRef\.current\?\.focus\(\);\s*\}, \[result\]\)/);
  });

  it("no .focus( call appears inside a cleanup function: React DOM re-focuses the pre-commit element after the mutation phase", () => {
    // Every `return () =>` in this file is an effect cleanup (no component here returns a function).
    const cleanups = [...src.matchAll(/return\s*\(\)\s*=>\s*(\{[\s\S]*?\}|[^;\n]*)/g)].map((m) => m[1]);
    for (const body of cleanups) expect(body).not.toContain(".focus(");
  });
});
