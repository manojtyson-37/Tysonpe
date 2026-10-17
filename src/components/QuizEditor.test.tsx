import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { declaresUseClient } from "@/test/client-imports";
import { legacyStyleFindings } from "@/test/style-scan";
import { QuizEditor, type QuizDefaults } from "./QuizEditor";
import { hasUnsavedChanges, isQuizDirty, focusKeyAfterAddOption, focusKeyAfterAddQuestion, focusKeyAfterRemoveOption, focusKeyAfterRemoveQuestion } from "./quiz-editor-state";

const action = async () => undefined;
const defaults = (over: Partial<QuizDefaults> = {}): QuizDefaults => ({
  passPct: 70,
  maxAttempts: 3,
  shuffle: false,
  questions: [
    {
      prompt: "Which GST rate applies to online courses?",
      kind: "single",
      explanation: "Courses are taxed at 18%.",
      options: [{ text: "5%", correct: false }, { text: "18%", correct: true }, { text: "28%", correct: false }],
    },
    {
      prompt: "Pick the valid UPI handles",
      kind: "multi",
      explanation: "",
      options: [{ text: "meera@okhdfc", correct: true }, { text: "meera", correct: false }, { text: "shop@ybl", correct: true }],
    },
  ],
  ...over,
});
const render = (d: QuizDefaults = defaults()) => renderToStaticMarkup(<QuizEditor action={action} defaults={d} />);
const unescape = (s: string) => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const tag = (html: string, re: RegExp) => re.exec(html)?.[0] ?? "";
/** Accessible name of the control whose label text (label[for] or aria-label) is `name`. */
function control(html: string, name: string): string {
  const byAria = tag(html, new RegExp(`<(?:input|select|textarea|button)\\b[^>]*aria-label="${name}"[^>]*>`));
  if (byAria) return byAria;
  const label = new RegExp(`<label for="([^"]+)"[^>]*>${name}</label>`).exec(html);
  expect(label, `label ${name}`).not.toBeNull();
  return tag(html, new RegExp(`<(?:input|select|textarea)\\b[^>]*id="${label![1].replace(/[:]/g, "\\:")}"[^>]*>`));
}

describe("QuizEditor: the posted contract", () => {
  it("posts the questions as JSON in a hidden input, byte for byte what was loaded", () => {
    const d = defaults();
    const m = /<input type="hidden" name="questions" value="([^"]*)"\/>/.exec(render(d));
    expect(m).not.toBeNull();
    expect(JSON.parse(unescape(m![1]))).toEqual(d.questions);
    expect(unescape(m![1])).toBe(JSON.stringify(d.questions));
  });

  it("keeps the settings field names the action reads, with shuffle as a yes/no select", () => {
    const html = render();
    const form = html.slice(html.indexOf("<form"));
    expect([...form.matchAll(/<(?:input|select|textarea)\b[^>]*\sname="([^"]+)"/g)].map((m) => m[1])).toEqual(["questions", "passPct", "maxAttempts", "shuffle"]);
    expect(form).toMatch(/<select[^>]*name="shuffle"/);
    expect(form).toContain('<option value="no" selected="">No</option>');
    expect(form).toContain('<option value="yes">Yes</option>');
    expect(render(defaults({ shuffle: true }))).toContain('<option value="yes" selected="">Yes</option>');
  });

  it("carries pass mark and max attempts, and keeps the unlimited-retakes hint", () => {
    const html = render();
    expect(control(html, "Pass mark \\(%\\)")).toContain('value="70"');
    expect(control(html, "Max attempts")).toContain('value="3"');
    expect(html).toContain("Unlimited retakes let learners probe the answers by trial and error; 3 is a good default.");
    expect(control(render(defaults({ maxAttempts: null })), "Max attempts")).toContain('value=""');
  });

  it("starts an empty quiz with one blank single-answer question of two options", () => {
    const html = render(defaults({ questions: [] }));
    const posted = JSON.parse(unescape(/name="questions" value="([^"]*)"/.exec(html)![1]));
    expect(posted).toEqual([{ prompt: "", kind: "single", explanation: "", options: [{ text: "", correct: true }, { text: "", correct: false }] }]);
    expect(html).toContain("Question 1 prompt");
    expect(html).not.toContain("Question 2 prompt");
  });

  it("has a Save quiz submit button", () => {
    expect(render()).toMatch(/<button[^>]*type="submit"[^>]*>Save quiz<\/button>/);
  });
});

describe("QuizEditor: structure and accessible names", () => {
  const html = render();

  it("names every question control, per question and option", () => {
    for (const n of [1, 2]) {
      expect(html).toContain(`<h3 class="text-sm font-semibold">Question ${n}</h3>`);
      expect(control(html, `Question ${n} prompt`)).toMatch(/^<textarea/);
      expect(control(html, `Question ${n} type`)).toMatch(/^<select/);
      expect(control(html, `Question ${n} explanation`)).toMatch(/^<input/);
      expect(control(html, `Remove question ${n}`)).toMatch(/^<button/);
    }
    for (const o of [1, 2, 3]) {
      expect(control(html, `Question 1 option ${o}`)).toMatch(/^<input/);
      expect(control(html, `Question 2 option ${o}`)).toMatch(/^<input/);
      expect(control(html, `Remove option ${o}`)).toMatch(/^<button/);
      expect(control(html, `Mark option ${o} as correct`)).toMatch(/^<input/);
    }
  });

  it("puts the question text and options in the right controls, in order", () => {
    expect(html).toMatch(/<textarea[^>]*>Which GST rate applies to online courses\?<\/textarea>/);
    expect(html.indexOf('value="5%"')).toBeLessThan(html.indexOf('value="18%"'));
    expect(html.indexOf('value="18%"')).toBeLessThan(html.indexOf('value="28%"'));
    expect(control(html, "Question 1 explanation")).toContain('value="Courses are taxed at 18%."');
  });

  it("groups each question's correct-answer controls in a fieldset with a legend that names the question", () => {
    const sets = [...html.matchAll(/<fieldset\b[^>]*>\s*<legend\b[^>]*>(.*?)<\/legend>/g)].map((m) => m[1].replace(/<[^>]+>/g, ""));
    expect(sets).toEqual(["Question 1: Select the one correct answer", "Question 2: Tick every correct answer"]);
  });

  it("uses native radios sharing one name for a single-answer question, checked on the correct option", () => {
    const q1 = html.slice(html.indexOf("<fieldset"), html.indexOf("</fieldset>"));
    const radios = [...q1.matchAll(/<input\b[^>]*type="radio"[^>]*>/g)].map((m) => m[0]);
    expect(radios).toHaveLength(3);
    const names = new Set(radios.map((r) => /name="([^"]+)"/.exec(r)![1]));
    expect(names.size).toBe(1);
    expect(radios.map((r) => /\schecked=""/.test(r))).toEqual([false, true, false]);
    expect(q1).not.toContain('type="checkbox"');
  });

  it("gives each single-answer question its own radio group, so ticking one question never unchecks another's", () => {
    const single = (prompt: string, correct: number) => ({
      prompt, kind: "single" as const, explanation: "",
      options: [0, 1, 2].map((i) => ({ text: `${prompt}${i}`, correct: i === correct })),
    });
    const two = render(defaults({ questions: [single("a", 0), single("b", 2)] }));
    const sets = [...two.matchAll(/<fieldset\b[^>]*>.*?<\/fieldset>/g)].map((m) => m[0]);
    expect(sets).toHaveLength(2);
    const groups = sets.map((set) => [...set.matchAll(/<input\b[^>]*type="radio"[^>]*>/g)].map((m) => /name="([^"]+)"/.exec(m[0])![1]));
    expect(groups.map((g) => g.length)).toEqual([3, 3]);
    // Within a question: one shared name, so the browser makes the radios exclusive and arrow keys move among them.
    for (const g of groups) expect(new Set(g).size).toBe(1);
    // Across questions: different names, or a radio in question 2 would uncheck question 1's answer in a real browser.
    expect(groups[0][0]).not.toBe(groups[1][0]);
    expect(sets.map((set) => [...set.matchAll(/<input\b[^>]*type="radio"[^>]*>/g)].map((m) => /\schecked=""/.test(m[0])))).toEqual([[true, false, false], [false, false, true]]);
  });

  it('names the correct-answer control "Mark option N as correct" on a radio (single) and, separately, on a checkbox (multi)', () => {
    const controls = (set: string, type: string) => [...set.matchAll(new RegExp(`<input\\b[^>]*type="${type}"[^>]*>`, "g"))].map((m) => /aria-label="([^"]*)"/.exec(m[0])?.[1]);
    const [single, multi] = [...html.matchAll(/<fieldset\b[^>]*>.*?<\/fieldset>/g)].map((m) => m[0]);
    expect(controls(single, "radio")).toEqual(["Mark option 1 as correct", "Mark option 2 as correct", "Mark option 3 as correct"]);
    expect(controls(single, "checkbox")).toEqual([]);
    expect(controls(multi, "checkbox")).toEqual(["Mark option 1 as correct", "Mark option 2 as correct", "Mark option 3 as correct"]);
    expect(controls(multi, "radio")).toEqual([]);
  });

  it("uses real checkboxes (the Checkbox primitive) for a multi-answer question, each ticked as loaded", () => {
    const rest = html.slice(html.indexOf("</fieldset>"));
    const boxes = [...rest.matchAll(/<input\b[^>]*type="checkbox"[^>]*>/g)].map((m) => m[0]);
    expect(boxes).toHaveLength(3);
    expect(boxes.map((b) => /\schecked=""/.test(b))).toEqual([true, false, true]);
    expect(boxes.every((b) => /\ssize-5\b|class="[^"]*\bsize-5\b/.test(b))).toBe(true);
  });

  it("the type select offers single and multiple answers and reflects the question's kind", () => {
    const q1 = control(html, "Question 1 type");
    expect(q1).toMatch(/<select/);
    expect(html).toMatch(/<option value="single" selected="">Single answer<\/option><option value="multi">Multiple answers<\/option>/);
    expect(html).toMatch(/<option value="single">Single answer<\/option><option value="multi" selected="">Multiple answers<\/option>/);
  });

  it("removes an option with an icon button (an SVG, no text glyph) named for the option", () => {
    const btn = html.match(/<button\b[^>]*aria-label="Remove option 1"[^>]*>.*?<\/button>/)![0];
    expect(btn).toContain("<svg");
    expect(btn).toContain('aria-hidden="true"');
    expect(text(btn)).toBe("");
    expect(html).not.toContain("✕");
  });

  it("has Add option per question and one Add question at the end", () => {
    expect([...html.matchAll(/>Add option<\/button>/g)]).toHaveLength(2);
    expect([...html.matchAll(/>Add question<\/button>/g)]).toHaveLength(1);
    expect(html.lastIndexOf("Add question")).toBeGreaterThan(html.lastIndexOf("Add option"));
  });

  it("removes a question with a danger Button named for it, and puts every action button at a touch-sized floor", () => {
    const rm = html.match(/<button\b[^>]*aria-label="Remove question 1"[^>]*>Remove<\/button>/)![0];
    expect(rm).toMatch(/class="[^"]*\bbtn-danger\b[^"]*\bbtn-sm\b/);
    const buttons = [...html.matchAll(/<button\b[^>]*>/g)].map((m) => m[0]).filter((b) => /Remove|Add|Save/.test(b) || /aria-label="Remove/.test(b));
    for (const b of buttons.filter((b) => !/type="submit"/.test(b))) expect(b, b).toContain("pointer-coarse:min-h-11");
  });
});

describe("QuizEditor: limits", () => {
  const q = (options: number) => ({
    prompt: "p", kind: "single" as const, explanation: "",
    options: Array.from({ length: options }, (_, i) => ({ text: `o${i}`, correct: i === 0 })),
  });
  const buttons = (html: string) => [...html.matchAll(/<button\b[^>]*>/g)].map((m) => m[0]);
  const disabled = (html: string, label: RegExp) => buttons(html).filter((b) => label.test(b)).map((b) => b.includes('disabled=""'));
  const addOption = (html: string) => [...html.matchAll(/<button\b[^>]*>(?:(?!<\/button>).)*Add option<\/button>/g)].map((m) => m[0].includes('disabled=""'));

  it("cannot remove the only question", () => {
    expect(disabled(render(defaults({ questions: [q(2)] })), /aria-label="Remove question 1"/)).toEqual([true]);
    expect(disabled(render(), /aria-label="Remove question \d"/)).toEqual([false, false]);
  });

  it("cannot remove an option below two, or add past six", () => {
    const two = render(defaults({ questions: [q(2)] }));
    expect(disabled(two, /aria-label="Remove option \d"/)).toEqual([true, true]);
    expect(addOption(two)).toEqual([false]);
    const six = render(defaults({ questions: [q(6)] }));
    expect(addOption(six)).toEqual([true]);
    expect(disabled(six, /aria-label="Remove option \d"/)).toEqual([false, false, false, false, false, false]);
  });
});

describe("QuizEditor: limits at the boundary", () => {
  // The caps are not exported (they are client-file constants), so the brief's literal values are used: 2..6 options, 1..100 questions.
  const q = (options: number) => ({
    prompt: "p", kind: "single" as const, explanation: "",
    options: Array.from({ length: options }, (_, i) => ({ text: `o${i}`, correct: i === 0 })),
  });
  const buttons = (html: string) => [...html.matchAll(/<button\b[^>]*>/g)].map((m) => m[0]);
  const flags = (html: string, label: RegExp) => buttons(html).filter((b) => label.test(b)).map((b) => b.includes('disabled=""'));
  const addOption = (html: string) => [...html.matchAll(/<button\b[^>]*>(?:(?!<\/button>).)*Add option<\/button>/g)].map((m) => m[0].includes('disabled=""'));
  const withOptions = (n: number) => render(defaults({ questions: [q(n)] }));

  it("Remove option is off at exactly 2 options and on at exactly 3", () => {
    expect(flags(withOptions(2), /aria-label="Remove option \d"/)).toEqual([true, true]);
    expect(flags(withOptions(3), /aria-label="Remove option \d"/)).toEqual([false, false, false]);
  });

  it("Add option is on at exactly 5 options and off at exactly 6", () => {
    expect(addOption(withOptions(5))).toEqual([false]);
    expect(addOption(withOptions(6))).toEqual([true]);
    expect(addOption(withOptions(4))).toEqual([false]);
  });

  it("Add question is on at 99 questions and off at exactly 100", () => {
    const many = (n: number) => render(defaults({ questions: Array.from({ length: n }, () => q(2)) }));
    const addQuestion = (html: string) => buttons(html).filter((b) => b.includes('data-focus-key="add-question"')).map((b) => b.includes('disabled=""'));
    expect(addQuestion(many(99))).toEqual([false]);
    expect(addQuestion(many(100))).toEqual([true]);
    // Remove question stays on for every question once there is more than one.
    expect(flags(many(100), /aria-label="Remove question \d+"/).every((d) => !d)).toBe(true);
  });
});

describe("QuizEditor: unsaved changes", () => {
  it("does not flag a brand-new quiz with no questions: the baseline is the blank question the editor starts with", () => {
    const html = render(defaults({ questions: [] }));
    expect(html).toMatch(/<span role="status"[^>]*><\/span>/);
    expect(html).not.toContain("Unsaved changes");
    // The same blank question is what is posted, so posted and baseline cannot differ before an edit.
    const posted = unescape(/name="questions" value="([^"]*)"/.exec(html)![1]);
    const blank = JSON.stringify([{ prompt: "", kind: "single", explanation: "", options: [{ text: "", correct: true }, { text: "", correct: false }] }]);
    expect(hasUnsavedChanges(isQuizDirty(posted, blank), false)).toBe(false);
    // That the editor's own baseline is this same blank question is proved by QuizEditor.interactions.test.tsx
    // ("a brand-new quiz with no questions is clean at once"), which runs the closures instead of reading the source.
  });

  it("flags a quiz as unsaved when either the questions or the settings differ", () => {
    // The initial render of any quiz is clean, so the words and the Saved note are asserted in
    // QuizEditor.interactions.test.tsx (stubbed hooks). Here: the pure rule that feeds the flag.
    expect(hasUnsavedChanges(true, false)).toBe(true);
    expect(hasUnsavedChanges(false, true)).toBe(true);
    expect(hasUnsavedChanges(false, false)).toBe(false);
  });

  it("shows an always-mounted status region that is empty until something changes", () => {
    const html = render();
    expect(html).toMatch(/<span role="status"[^>]*><\/span>/);
    expect(html).not.toContain("Unsaved changes");
  });

  it("renders the three settings fields (pass mark, max attempts, shuffle) that the settings wrapper listens to", () => {
    // That an edit in them flags the quiz, and that a save clears it, is driven in QuizEditor.interactions.test.tsx.
    const html = render();
    for (const name of ["passPct", "maxAttempts", "shuffle"]) expect(html, name).toContain(`name="${name}"`);
  });

  it("stringifies the questions once per render", () => {
    const src = readFileSync(new URL("./QuizEditor.tsx", import.meta.url), "utf8");
    expect(src.match(/JSON\.stringify\(qs\)/g)).toHaveLength(1);
  });

  it("points add-question and add-option focus at the key of the control that was just added", () => {
    // The handlers that pick these keys are driven in QuizEditor.interactions.test.tsx; here the keys exist on the
    // rendered controls once the list has grown by one.
    const html = render();
    const keys = [...html.matchAll(/data-focus-key="([^"]+)"/g)].map((m) => m[1]);
    expect(keys).toContain(focusKeyAfterAddQuestion(1)); // a second question exists in the fixture: q1-prompt
    expect(keys).toContain(focusKeyAfterAddOption(0, 2)); // the fixture's first question has option 2
  });
});

describe("QuizEditor: the pure state module", () => {
  it("is not a client module, so a server file or a test can call it", () => {
    const src = readFileSync(new URL("./quiz-editor-state.ts", import.meta.url), "utf8");
    expect(declaresUseClient(src)).toBe(false);
    const editor = readFileSync(new URL("./QuizEditor.tsx", import.meta.url), "utf8");
    expect(declaresUseClient(editor)).toBe(true);
    // Nothing the editor used to export as a helper is exported from the client file any more.
    expect([...editor.matchAll(/^export (?:async )?(?:function|const) (\w+)/gm)].map((m) => m[1])).toEqual(["QuizEditor"]);
  });
});

describe("QuizEditor: focus after removing", () => {
  it("every key the helpers can return is on a rendered control (prompt, option, Add option, Add question)", () => {
    const html = render();
    const keys = [...html.matchAll(/data-focus-key="([^"]+)"/g)].map((m) => m[1]);
    for (const k of [focusKeyAfterRemoveQuestion(0, 2), focusKeyAfterRemoveQuestion(1, 2), focusKeyAfterRemoveOption(0, 0, 3), focusKeyAfterRemoveOption(1, 2, 3), "q0-add-option", "add-question"]) {
      expect(keys, k).toContain(k);
    }
    // The key sits on the focusable control itself, not on a wrapper.
    expect(html).toMatch(/<textarea\b[^>]*data-focus-key="q0-prompt"/);
    expect(html).toMatch(/<input\b[^>]*data-focus-key="q1-option2"/);
    expect(html).toMatch(/<button\b[^>]*data-focus-key="add-question"/);
    expect(html).toMatch(/<button\b[^>]*data-focus-key="q1-add-option"/);
  });

  it("focus moves in an effect body, never in a cleanup", () => {
    const src = readFileSync(new URL("./QuizEditor.tsx", import.meta.url), "utf8");
    const effect = /useEffect\(\(\) => \{([\s\S]*?)\}, \[focusTo\]\)/.exec(src)![1];
    expect(effect).toContain(".focus()");
    expect(effect).not.toMatch(/return\s*\(\)\s*=>/);
  });
});

describe("QuizEditor: source hygiene", () => {
  it("has no ! utilities, legacy .input/.card/.btn strings, glyphs or tooltips", () => {
    expect(legacyStyleFindings(readFileSync(new URL("./QuizEditor.tsx", import.meta.url), "utf8"))).toEqual([]);
  });

  it("has no raw .input / .card class and no 16px accent override", () => {
    const src = readFileSync(new URL("./QuizEditor.tsx", import.meta.url), "utf8");
    expect(src).not.toMatch(/accent-\[/);
    expect(src).not.toMatch(/["'\s]input["'\s]|className="[^"]*\binput\b/);
    expect(src).not.toContain("✕");
  });
});

function text(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}
