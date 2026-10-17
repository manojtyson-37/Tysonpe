import { describe, expect, it } from "vitest";
import {
  baselineAfterSave,
  focusKeyAfterAddOption,
  focusKeyAfterAddQuestion,
  focusKeyAfterRemoveOption,
  focusKeyAfterRemoveQuestion,
  hasUnsavedChanges,
  isQuizDirty,
  saveSucceeded,
  type Q,
} from "./quiz-editor-state";

const questions = (): Q[] => [
  { prompt: "Which GST rate applies to online courses?", kind: "single", explanation: "", options: [{ text: "5%", correct: false }, { text: "18%", correct: true }] },
  { prompt: "Pick the valid UPI handles", kind: "multi", explanation: "", options: [{ text: "meera@okhdfc", correct: true }, { text: "meera", correct: false }] },
];

describe("isQuizDirty", () => {
  it("is dirty exactly when the posted JSON differs from the last accepted JSON", () => {
    const base = JSON.stringify(questions());
    expect(isQuizDirty(JSON.stringify(questions()), base)).toBe(false);
    const edited = questions();
    edited[0].prompt += "?";
    expect(isQuizDirty(JSON.stringify(edited), base)).toBe(true);
    expect(isQuizDirty(JSON.stringify(questions().slice(0, 1)), base)).toBe(true);
    // Toggling a correct flag and toggling it back is clean again.
    const flipped = questions();
    flipped[0].options[0].correct = true;
    expect(isQuizDirty(JSON.stringify(flipped), base)).toBe(true);
    flipped[0].options[0].correct = false;
    expect(isQuizDirty(JSON.stringify(flipped), base)).toBe(false);
  });
});

describe("hasUnsavedChanges", () => {
  it("is true when either the questions or the settings are edited, false only when both are clean", () => {
    expect(hasUnsavedChanges(false, false)).toBe(false);
    expect(hasUnsavedChanges(true, false)).toBe(true);
    expect(hasUnsavedChanges(false, true)).toBe(true);
    expect(hasUnsavedChanges(true, true)).toBe(true);
  });
});

describe("saveSucceeded / baselineAfterSave", () => {
  const OK = { fields: { saved: "1" } };
  it("counts a save only when the server echoes `saved` and reports no error", () => {
    expect(saveSucceeded(OK)).toBe(true);
    expect(saveSucceeded({ fields: { saved: "1" }, error: "Pass mark must be 1 to 100." })).toBe(false);
    expect(saveSucceeded({ error: "Nope" })).toBe(false);
    expect(saveSucceeded({ fields: {} })).toBe(false);
    expect(saveSucceeded(undefined)).toBe(false);
    expect(saveSucceeded(null)).toBe(false);
  });

  it("moves the baseline to exactly the posted JSON on success", () => {
    expect(baselineAfterSave(OK, '{"posted":1}', '{"old":1}')).toBe('{"posted":1}');
  });

  it("keeps the previous baseline on an error, a missing result, or no `saved` echo", () => {
    expect(baselineAfterSave({ fields: { saved: "1" }, error: "x" }, "posted", "old")).toBe("old");
    expect(baselineAfterSave(undefined, "posted", "old")).toBe("old");
    expect(baselineAfterSave({ fields: {} }, "posted", "old")).toBe("old");
  });

  it("an edit made during the save stays unsaved: the baseline is the posted JSON, not the current one", () => {
    const posted = JSON.stringify(questions());
    const current = questions();
    current[1].prompt = "typed while saving";
    const baseline = baselineAfterSave(OK, posted, "old");
    expect(isQuizDirty(JSON.stringify(current), baseline)).toBe(true);
    expect(isQuizDirty(posted, baseline)).toBe(false);
  });
});

describe("focus keys", () => {
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

  it("a new question's prompt sits at the old count", () => {
    expect(focusKeyAfterAddQuestion(1)).toBe("q1-prompt");
    expect(focusKeyAfterAddQuestion(4)).toBe("q4-prompt");
  });

  it("a new option sits at the old option count, in the same question", () => {
    expect(focusKeyAfterAddOption(0, 2)).toBe("q0-option2");
    expect(focusKeyAfterAddOption(3, 5)).toBe("q3-option5");
  });
});
