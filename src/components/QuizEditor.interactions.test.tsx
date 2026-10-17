// Drives QuizEditor's closures (markCorrect, changeKind, add/remove question and option, saveAction, the focus
// hand-off, the Unsaved changes flag). The repo has no DOM runner and server rendering only ever shows the first
// render, so React's hooks are replaced with a tiny synchronous store: QuizEditor() is called as a plain function, the
// returned element tree is walked, and a control's onClick/onChange is invoked exactly as React would invoke it.
//
// WHAT THIS CANNOT PROVE (needs a real React runtime, i.e. a browser or jsdom + act):
// - Stale closures. Here every render re-reads the store, so a handler captured from an OLD render is never exercised
//   against a newer state. In particular `saveAction` must baseline on `fd.get("questions")` (the JSON that was
//   posted), not on the `serialised` its own render captured. The tests catch that mutant by posting a payload that
//   differs from the editor's copy and by editing during the save, but whether React hands saveAction a stale or a
//   fresh closure at the moment the real form submits, and how updates made mid-await interleave, is not modelled.
// - useState batching, functional-updater ordering across several setState calls in one event, and effect timing
//   (the effect is run by hand after the render, so "focus is set in the commit after the DOM changed" is not proven).
// - The DOM: native radio exclusivity, real focus(), React 19's form reset after an action, change events bubbling
//   from the settings inputs to the wrapper's onChange/onInput.
import { createElement, isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const H = vi.hoisted(() => ({ slots: [] as unknown[], i: 0, effects: [] as Array<() => void> }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const useState = (init: unknown) => {
    const idx = H.i++;
    if (!(idx in H.slots)) H.slots[idx] = typeof init === "function" ? (init as () => unknown)() : init;
    const set = (v: unknown) => {
      H.slots[idx] = typeof v === "function" ? (v as (p: unknown) => unknown)(H.slots[idx]) : v;
    };
    return [H.slots[idx], set];
  };
  const useRef = (init: unknown) => {
    const idx = H.i++;
    if (!(idx in H.slots)) H.slots[idx] = { current: init };
    return H.slots[idx];
  };
  const useEffect = (fn: () => void) => {
    H.effects.push(fn);
  };
  const useId = () => ":r0:";
  return { ...actual, default: { ...actual, useState, useRef, useEffect, useId }, useState, useRef, useEffect, useId };
});

import { SavedNote } from "./form";
import { QuizEditor, type QuizDefaults } from "./QuizEditor";

type P = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type El = { type: unknown; props: P };
type Questions = QuizDefaults["questions"];
type Action = (prev: never, fd: FormData) => Promise<unknown>;

function walk(node: ReactNode, out: El[] = []): El[] {
  if (Array.isArray(node)) {
    node.forEach((c) => walk(c, out));
    return out;
  }
  if (!isValidElement(node)) return out;
  const props = node.props as P;
  out.push({ type: node.type, props });
  walk(props.children, out);
  if (props.icon) walk(props.icon, out);
  return out;
}

function mount(defaults: QuizDefaults, action: (fd: FormData) => Promise<unknown> = async () => undefined) {
  H.slots = [];
  H.effects = [];
  let els: El[] = [];
  const render = () => {
    H.i = 0;
    H.effects = [];
    els = walk(QuizEditor({ action: ((_: unknown, fd: FormData) => action(fd)) as Action as never, defaults }) as ReactNode);
  };
  render();
  /** Every control carrying this accessible name / label / text, in document order (so index = question index). */
  const all = (label: string) => els.filter((e) => e.props["aria-label"] === label || e.props.label === label || e.props.children === label);
  const one = (label: string, nth = 0) => {
    const found = all(label)[nth];
    expect(found, `${label} #${nth}`).toBeDefined();
    return found;
  };
  const api = {
    els: () => els,
    all,
    one,
    posted: () => JSON.parse(els.find((e) => e.props.name === "questions")!.props.value as string) as Questions,
    status: () => String(els.find((e) => e.props.role === "status")!.props.children ?? ""),
    statusMarkup: () => renderToStaticMarkup(createElement("span", els.find((e) => e.props.role === "status")!.props)),
    savedNote: () => els.some((e) => e.type === SavedNote),
    click: (label: string, nth = 0) => {
      one(label, nth).props.onClick();
      render();
    },
    change: (label: string, value: string, nth = 0) => {
      one(label, nth).props.onChange({ target: { value } });
      render();
    },
    toggle: (label: string, nth = 0) => {
      one(label, nth).props.onChange();
      render();
    },
    disabled: (label: string, nth = 0) => Boolean(one(label, nth).props.disabled),
    /** The settings wrapper (pass mark, max attempts, shuffle) reports an edit the way a bubbled input event would. */
    editSettings: () => {
      els.find((e) => typeof e.props.onInput === "function")!.props.onInput();
      render();
    },
    /** Submits the settings form with the CURRENT hidden-input value; `during` runs while the save is in flight. */
    save: async (during?: () => void, posted: string = JSON.stringify(api.posted())) => {
      const fd = new FormData();
      fd.set("questions", posted);
      const pending = els.find((e) => typeof e.props.action === "function")!.props.action({}, fd) as Promise<unknown>;
      during?.();
      const res = await pending;
      render();
      return res;
    },
    /**
     * The key the focus effect will look up, found by running the last render's effect against a fake root. null when
     * nothing is to be focused. Also checks that a control with that key exists in the tree.
     */
    focusKey: (): string | null => {
      // React 19 passes `ref` as an ordinary prop; the only element with one is the root <div ref={root}>.
      const ref = els.find((e) => e.props.ref)!.props.ref as { current: unknown };
      let selector: string | null = null;
      ref.current = { querySelector: (s: string) => ((selector = s), { focus: () => undefined }) };
      H.effects.forEach((fn) => fn());
      if (selector === null) return null;
      const key = /^\[data-focus-key="([^"]+)"\]$/.exec(selector)![1];
      expect(els.some((e) => e.props["data-focus-key"] === key), `a control carries ${key}`).toBe(true);
      return key;
    },
  };
  return api;
}

const Q = (kind: "single" | "multi", correct: number[], n = 3, prompt = "p") => ({
  prompt, kind, explanation: "", options: Array.from({ length: n }, (_, i) => ({ text: `o${i}`, correct: correct.includes(i) })),
});
const D = (questions: Questions): QuizDefaults => ({ passPct: 70, maxAttempts: 3, shuffle: false, questions });
const corr = (qs: Questions, qi = 0) => qs[qi].options.map((o) => o.correct);
const BLANK = { prompt: "", kind: "single", explanation: "", options: [{ text: "", correct: true }, { text: "", correct: false }] };

describe("QuizEditor closures: correct answers", () => {
  it("an untouched editor posts what it was given and shows no unsaved note", () => {
    const m = mount(D([Q("single", [1])]));
    expect(corr(m.posted())).toEqual([false, true, false]);
    expect(m.status()).toBe("");
  });

  it("single: marking an option leaves exactly one correct, whichever is clicked", () => {
    const m = mount(D([Q("single", [1])]));
    m.toggle("Mark option 3 as correct");
    expect(corr(m.posted())).toEqual([false, false, true]);
    m.toggle("Mark option 1 as correct");
    expect(corr(m.posted())).toEqual([true, false, false]);
    m.toggle("Mark option 1 as correct"); // marking the checked one again keeps it checked: a radio cannot be unticked
    expect(corr(m.posted())).toEqual([true, false, false]);
  });

  it("multi: marking toggles each option independently", () => {
    const m = mount(D([Q("multi", [0])]));
    m.toggle("Mark option 2 as correct");
    expect(corr(m.posted())).toEqual([true, true, false]);
    m.toggle("Mark option 1 as correct");
    expect(corr(m.posted())).toEqual([false, true, false]);
  });

  it("marking an option changes only its own question", () => {
    const m = mount(D([Q("single", [0]), Q("multi", [0])]));
    m.toggle("Mark option 3 as correct", 1);
    expect(corr(m.posted(), 0)).toEqual([true, false, false]);
    expect(corr(m.posted(), 1)).toEqual([true, false, true]);
    m.toggle("Mark option 2 as correct", 0);
    expect(corr(m.posted(), 0)).toEqual([false, true, false]);
    expect(corr(m.posted(), 1)).toEqual([true, false, true]);
  });

  it("each single-answer question hands its radios a group of its own, and the radios follow the state", () => {
    const m = mount(D([Q("single", [0]), Q("single", [2])]));
    const group = (qi: number) => ["1", "2", "3"].map((n) => m.one(`Mark option ${n} as correct`, qi).props);
    const names = [group(0), group(1)].map((g) => new Set(g.map((p) => p.name)));
    expect(names.map((n) => n.size)).toEqual([1, 1]);
    expect([...names[0]][0]).not.toBe([...names[1]][0]);
    expect(group(0).map((p) => p.checked)).toEqual([true, false, false]);
    expect(group(1).map((p) => p.checked)).toEqual([false, false, true]);
    m.toggle("Mark option 2 as correct", 1);
    expect(group(0).map((p) => p.checked)).toEqual([true, false, false]);
    expect(group(1).map((p) => p.checked)).toEqual([false, true, false]);
  });
});

describe("QuizEditor closures: changing the question type", () => {
  it("multi -> single keeps only the FIRST correct option; single -> multi keeps the one", () => {
    const m = mount(D([Q("multi", [1, 2])]));
    m.change("Question 1 type", "single");
    expect(m.posted()[0].kind).toBe("single");
    expect(corr(m.posted())).toEqual([false, true, false]);
    m.change("Question 1 type", "multi");
    expect(m.posted()[0].kind).toBe("multi");
    expect(corr(m.posted())).toEqual([false, true, false]);
  });

  it("multi -> single with every option correct keeps the first, with none correct keeps none", () => {
    const m = mount(D([Q("multi", [0, 1, 2]), Q("multi", [])]));
    m.change("Question 1 type", "single");
    m.change("Question 2 type", "single");
    expect(corr(m.posted(), 0)).toEqual([true, false, false]);
    expect(corr(m.posted(), 1)).toEqual([false, false, false]);
  });

  it("touches only its own question", () => {
    const m = mount(D([Q("multi", [0, 1]), Q("multi", [1, 2])]));
    m.change("Question 2 type", "single");
    expect(corr(m.posted(), 0)).toEqual([true, true, false]);
    expect(corr(m.posted(), 1)).toEqual([false, true, false]);
    expect(m.posted().map((q) => q.kind)).toEqual(["multi", "single"]);
  });
});

describe("QuizEditor closures: editing text", () => {
  it("patches only the addressed question, option, prompt and explanation", () => {
    const m = mount(D([Q("single", [0]), Q("single", [0])]));
    m.change("Question 2 option 2", "changed");
    expect(m.posted()[1].options.map((o) => o.text)).toEqual(["o0", "changed", "o2"]);
    expect(m.posted()[0].options.map((o) => o.text)).toEqual(["o0", "o1", "o2"]);
    m.change("Question 1 prompt", "P1");
    expect(m.posted().map((q) => q.prompt)).toEqual(["P1", "p"]);
    m.change("Question 2 explanation", "why");
    expect(m.posted().map((q) => q.explanation)).toEqual(["", "why"]);
  });
});

describe("QuizEditor closures: adding and removing", () => {
  it("add question appends a blank single question of two options; Remove question is off at one question only", () => {
    const m = mount(D([Q("single", [0])]));
    expect(m.disabled("Remove question 1")).toBe(true);
    m.click("Add question");
    expect(m.posted()).toHaveLength(2);
    expect(m.posted()[1]).toEqual(BLANK);
    expect(m.disabled("Remove question 1")).toBe(false);
    expect(m.disabled("Remove question 2")).toBe(false);
  });

  it("remove question removes exactly the addressed one (first, middle and last)", () => {
    const m = mount(D(["A", "B", "C", "D"].map((p) => Q("single", [0], 3, p))));
    m.click("Remove question 2");
    expect(m.posted().map((q) => q.prompt)).toEqual(["A", "C", "D"]);
    m.click("Remove question 1");
    expect(m.posted().map((q) => q.prompt)).toEqual(["C", "D"]);
    m.click("Remove question 2");
    expect(m.posted().map((q) => q.prompt)).toEqual(["C"]);
  });

  it("add option appends an UNCHECKED blank option to the addressed question only; the cap is 6", () => {
    const m = mount(D([Q("single", [1], 2), Q("single", [0], 2)]));
    for (let i = 0; i < 4; i++) m.click("Add option", 0);
    expect(m.posted()[0].options).toHaveLength(6);
    expect(m.posted()[1].options).toHaveLength(2);
    expect(corr(m.posted())).toEqual([false, true, false, false, false, false]);
    expect(m.posted()[0].options[5]).toEqual({ text: "", correct: false });
    expect(m.disabled("Add option", 0)).toBe(true);
    expect(m.disabled("Add option", 1)).toBe(false);
  });

  it("remove option removes exactly the addressed one; the floor is 2", () => {
    const m = mount(D([Q("single", [0], 4), Q("single", [0], 4)]));
    m.click("Remove option 2", 0);
    expect(m.posted()[0].options.map((o) => o.text)).toEqual(["o0", "o2", "o3"]);
    expect(m.posted()[1].options).toHaveLength(4);
    m.click("Remove option 3", 0);
    expect(m.posted()[0].options.map((o) => o.text)).toEqual(["o0", "o2"]);
    expect(m.disabled("Remove option 1", 0)).toBe(true);
    expect(m.disabled("Remove option 1", 1)).toBe(false);
  });
});

describe("QuizEditor closures: where focus goes", () => {
  const three = () => mount(D(["A", "B", "C"].map((p) => Q("single", [0], 3, p))));

  it("nothing is focused until something is added or removed", () => {
    expect(three().focusKey()).toBeNull();
  });

  it("add question focuses the new prompt (index = old count)", () => {
    const m = three();
    m.click("Add question");
    expect(m.focusKey()).toBe("q3-prompt");
  });

  it("add option focuses the new option of that question, not the first question's", () => {
    const m = three();
    m.click("Add option", 1);
    expect(m.focusKey()).toBe("q1-option3");
  });

  it("removing the MIDDLE question focuses the prompt that slid into its place", () => {
    const m = three();
    m.click("Remove question 2");
    expect(m.posted().map((q) => q.prompt)).toEqual(["A", "C"]);
    expect(m.focusKey()).toBe("q1-prompt");
  });

  it("removing the LAST question focuses the one before it", () => {
    const m = three();
    m.click("Remove question 3");
    expect(m.focusKey()).toBe("q1-prompt");
  });

  it("removing a middle option focuses the option that slid in; the last option, the one before", () => {
    const m = mount(D([Q("single", [0], 4), Q("single", [0], 4)]));
    m.click("Remove option 2", 1);
    expect(m.focusKey()).toBe("q1-option1");
    m.click("Remove option 3", 1);
    expect(m.focusKey()).toBe("q1-option1");
  });
});

describe("QuizEditor closures: Unsaved changes", () => {
  it("shows the words when a question is edited, hides the Saved note meanwhile, and clears when edited back", () => {
    const m = mount(D([Q("single", [0])]));
    expect(m.status()).toBe("");
    expect(m.statusMarkup()).toBe('<span role="status" class="text-sm font-medium text-muted"></span>');
    expect(m.savedNote()).toBe(true);
    m.change("Question 1 prompt", "x");
    expect(m.statusMarkup()).toBe('<span role="status" class="text-sm font-medium text-muted">Unsaved changes</span>');
    expect(m.savedNote()).toBe(false);
    m.change("Question 1 prompt", "p");
    expect(m.status()).toBe("");
    expect(m.savedNote()).toBe(true);
  });

  it("a brand-new quiz with no questions is clean at once, and dirty after its blank question is edited", () => {
    const m = mount(D([]));
    expect(m.posted()).toEqual([BLANK]);
    expect(m.status()).toBe("");
    expect(m.savedNote()).toBe(true);
    m.change("Question 1 prompt", "first");
    expect(m.status()).toBe("Unsaved changes");
    m.change("Question 1 prompt", "");
    expect(m.status()).toBe("");
  });

  it("adding or removing a question or option counts as an edit", () => {
    const m = mount(D([Q("single", [0])]));
    m.click("Add option");
    expect(m.status()).toBe("Unsaved changes");
    m.click("Remove option 4");
    expect(m.status()).toBe("");
    m.click("Add question");
    expect(m.status()).toBe("Unsaved changes");
  });

  it("an edit to the settings fields shows it too", () => {
    const m = mount(D([Q("single", [0])]));
    m.editSettings();
    expect(m.status()).toBe("Unsaved changes");
    expect(m.savedNote()).toBe(false);
  });
});

describe("QuizEditor closures: saving", () => {
  const ok = { fields: { saved: "1" } };

  it("a successful save moves the baseline to the JSON that was posted, so an edit made WHILE saving stays unsaved", async () => {
    const m = mount(D([Q("single", [0])]), async () => ok);
    m.change("Question 1 prompt", "edited");
    expect(m.status()).toBe("Unsaved changes");
    await m.save(() => m.change("Question 1 prompt", "edited-again"));
    expect(m.status()).toBe("Unsaved changes");
    m.change("Question 1 prompt", "edited"); // back to exactly what was posted
    expect(m.status()).toBe("");
  });

  it("the baseline is the form data the action received, not the editor's own live copy of the questions", async () => {
    const m = mount(D([Q("single", [0])]), async () => ok);
    m.change("Question 1 prompt", "live");
    const sent = JSON.stringify([Q("single", [0], 3, "sent")]);
    await m.save(undefined, sent);
    expect(m.status()).toBe("Unsaved changes"); // live differs from what the server accepted
    m.change("Question 1 prompt", "sent");
    expect(m.status()).toBe("");
  });

  it("a successful save clears the unsaved note and brings the Saved note back", async () => {
    const m = mount(D([Q("single", [0])]), async () => ok);
    m.change("Question 1 prompt", "edited");
    await m.save();
    expect(m.status()).toBe("");
    expect(m.savedNote()).toBe(true);
  });

  it("hands the action's result back unchanged", async () => {
    const res = { fields: { saved: "1" }, extra: 1 };
    const m = mount(D([Q("single", [0])]), async () => res);
    expect(await m.save()).toBe(res);
  });

  it("an error, a missing `saved` echo or no result leaves the baseline alone", async () => {
    for (const res of [{ error: "bad", fields: { saved: "1" } }, { fields: {} }, undefined]) {
      const m = mount(D([Q("single", [0])]), async () => res);
      m.change("Question 1 prompt", "edited");
      expect(await m.save()).toBe(res);
      expect(m.status(), JSON.stringify(res)).toBe("Unsaved changes");
    }
  });

  it("clears the settings flag on success, but not when a settings field was edited during the save, nor on failure", async () => {
    const done = mount(D([Q("single", [0])]), async () => ok);
    done.editSettings();
    await done.save();
    expect(done.status()).toBe("");

    const during = mount(D([Q("single", [0])]), async () => ok);
    during.editSettings();
    await during.save(() => during.editSettings());
    expect(during.status()).toBe("Unsaved changes");

    const failed = mount(D([Q("single", [0])]), async () => ({ error: "bad" }));
    failed.editSettings();
    await failed.save();
    expect(failed.status()).toBe("Unsaved changes");
  });
});
