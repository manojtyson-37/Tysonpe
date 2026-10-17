// Pure rules behind QuizEditor. This file has NO "use client" on purpose: QuizEditor.tsx does, and tests (and any
// server module) can only call a client module's exports as real functions in dev, never in a production build.
// Keep every rule here and import it into the editor.

export type Opt = { text: string; correct: boolean };
export type Q = { prompt: string; kind: "single" | "multi"; explanation: string; options: Opt[] };

/** Each control that can receive focus after an add or remove has one key, written to `data-focus-key`. */
export const promptKey = (qi: number) => `q${qi}-prompt`;
export const optionKey = (qi: number, oi: number) => `q${qi}-option${oi}`;
export const addOptionKey = (qi: number) => `q${qi}-add-option`;
export const ADD_QUESTION_KEY = "add-question";

/**
 * Focus after removing question `qi` of `count`: the question that slid into the slot, else the one before it, else
 * (cannot happen while Remove is off at one question) the Add question button.
 */
export function focusKeyAfterRemoveQuestion(qi: number, count: number): string {
  return qi < count - 1 ? promptKey(qi) : qi > 0 ? promptKey(qi - 1) : ADD_QUESTION_KEY;
}

/** Same rule for options; the fallback is the question's Add option button (Remove is off at two options). */
export function focusKeyAfterRemoveOption(qi: number, oi: number, count: number): string {
  return oi < count - 1 ? optionKey(qi, oi) : oi > 0 ? optionKey(qi, oi - 1) : addOptionKey(qi);
}

/** After adding a question to a list of `count`, the new one sits at index `count`: focus its prompt. */
export function focusKeyAfterAddQuestion(count: number): string {
  return promptKey(count);
}

/** After adding an option to question `qi` that had `count` options, the new one sits at index `count`. */
export function focusKeyAfterAddOption(qi: number, count: number): string {
  return optionKey(qi, count);
}

/** Unsaved when the questions' JSON (what the form posts) differs from the JSON the server last accepted. */
export function isQuizDirty(serialised: string, savedJson: string): boolean {
  return serialised !== savedJson;
}

/** True when the server accepted the save: it echoes `fields.saved` and reports no error. */
export function saveSucceeded(res: { error?: unknown; fields?: { saved?: unknown } } | null | undefined): boolean {
  return Boolean(res?.fields?.saved) && !res?.error;
}

/**
 * The questions baseline after a save attempt. On success it is exactly the JSON that was posted, so anything edited
 * while the save was running still counts as unsaved; on failure it stays where it was.
 */
export function baselineAfterSave(res: Parameters<typeof saveSucceeded>[0], posted: string, prev: string): string {
  return saveSucceeded(res) ? posted : prev;
}

/** Edits to the questions or to the settings fields both leave the quiz unsaved. */
export function hasUnsavedChanges(questionsDirty: boolean, settingsDirty: boolean): boolean {
  return questionsDirty || settingsDirty;
}
