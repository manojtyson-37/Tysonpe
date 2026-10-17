import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { legacyStyleFindings } from "@/test/style-scan";
import { focusKeyAfterRemoveOption, focusKeyAfterRemoveQuestion, isQuizDirty, QuizEditor, type QuizDefaults } from "./QuizEditor";

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

describe("QuizEditor: unsaved changes", () => {
  it("shows an always-mounted status region that is empty until something changes", () => {
    const html = render();
    expect(html).toMatch(/<span role="status" class="text-sm font-medium text-muted"><\/span>/);
    expect(html).not.toContain("Unsaved changes");
  });

  it("is dirty exactly when the questions differ from the last accepted JSON", () => {
    const d = defaults();
    const base = JSON.stringify(d.questions);
    expect(isQuizDirty(d.questions, base)).toBe(false);
    expect(isQuizDirty([{ ...d.questions[0], prompt: d.questions[0].prompt + "?" }, d.questions[1]], base)).toBe(true);
    expect(isQuizDirty(d.questions.slice(0, 1), base)).toBe(true);
    // Toggling a correct flag and toggling it back is clean again.
    const flipped = structuredClone(d.questions);
    flipped[0].options[0].correct = true;
    expect(isQuizDirty(flipped, base)).toBe(true);
    flipped[0].options[0].correct = false;
    expect(isQuizDirty(flipped, base)).toBe(false);
  });
});

describe("QuizEditor: focus after removing", () => {
  it("a removed question hands focus to the one that slid into its place, else the one before", () => {
    expect(focusKeyAfterRemoveQuestion(0, 3)).toBe("q0-prompt");
    expect(focusKeyAfterRemoveQuestion(1, 3)).toBe("q1-prompt");
    expect(focusKeyAfterRemoveQuestion(2, 3)).toBe("q1-prompt");
    expect(focusKeyAfterRemoveQuestion(0, 1)).toBe("add-question");
  });

  it("a removed option does the same, else the question's Add option button", () => {
    expect(focusKeyAfterRemoveOption(2, 0, 3)).toBe("q2-option0");
    expect(focusKeyAfterRemoveOption(2, 1, 3)).toBe("q2-option1");
    expect(focusKeyAfterRemoveOption(2, 2, 3)).toBe("q2-option1");
    expect(focusKeyAfterRemoveOption(2, 0, 1)).toBe("q2-add-option");
  });

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
