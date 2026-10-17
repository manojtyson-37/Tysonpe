"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { ActionForm, Checkbox, Field, FormError, Input, SavedNote, Select, SubmitButton, Textarea } from "./form";
import { IconPlus, IconX } from "./icons";
import { Button } from "./ui/button";

type Opt = { text: string; correct: boolean };
type Q = { prompt: string; kind: "single" | "multi"; explanation: string; options: Opt[] };
export type QuizDefaults = { passPct: number; maxAttempts: number | null; shuffle: boolean; questions: Q[] };

const blankQ = (): Q => ({ prompt: "", kind: "single", explanation: "", options: [{ text: "", correct: true }, { text: "", correct: false }] });

const MAX_QUESTIONS = 100;
const MAX_OPTIONS = 6;
// 44px targets on touch. `.btn` already extends its hit area with a pseudo-element, but neighbouring buttons would
// overlap, so the buttons here take a real min-height instead.
const COARSE = "pointer-coarse:min-h-11";
// The field's label is the accessible name but the row already shows what it is: keep it for screen readers only.
const NAME_ONLY = "[&>label]:sr-only";

/** Where focus goes after the last add or remove. Each registered control has one key; see `reg` below. */
type FocusTarget = { key: string };
const promptKey = (qi: number) => `q${qi}-prompt`;
const optionKey = (qi: number, oi: number) => `q${qi}-option${oi}`;
const addOptionKey = (qi: number) => `q${qi}-add-option`;
const ADD_QUESTION_KEY = "add-question";

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

/** Unsaved when the questions now differ from the JSON the server last accepted (the loaded quiz, or the last save). */
export function isQuizDirty(questions: Q[], savedJson: string): boolean {
  return JSON.stringify(questions) !== savedJson;
}

/** The single-answer twin of `Checkbox`: a native radio (arrow keys move within the question's group), same size and hit area. */
function CorrectRadio({ name, checked, onChange, label }: { name: string; checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex shrink-0 cursor-pointer items-start gap-3 py-1.5 pointer-coarse:py-3">
      <input type="radio" name={name} checked={checked} onChange={onChange} aria-label={label} className="mt-0.5 size-5 shrink-0 cursor-pointer accent-brand" />
      <span className="text-sm font-medium text-ink">Correct</span>
    </label>
  );
}

/**
 * The question editor lives OUTSIDE the <form>: React resets form fields after an action, which would
 * visually revert controlled inputs. Only the settings and the serialised questions go through the form.
 * Because of that, edits are not part of the form's own state, so "Unsaved changes" compares the questions with
 * the last saved copy, and focus after an add or remove is moved by hand.
 */
export function QuizEditor({ action, defaults }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; defaults: QuizDefaults }) {
  const uid = useId();
  const [qs, setQs] = useState<Q[]>(() => (defaults.questions.length ? defaults.questions : [blankQ()]));
  // What the server last stored, as the same JSON the form posts. Starts as the loaded quiz; moves on a successful save.
  const [saved, setSaved] = useState(() => JSON.stringify(defaults.questions.length ? defaults.questions : [blankQ()]));
  const serialised = JSON.stringify(qs);
  const dirty = isQuizDirty(qs, saved);

  // Controls that can receive focus after an add or remove carry `data-focus-key`; the effect finds them under this root.
  const root = useRef<HTMLDivElement>(null);
  const [focusTo, setFocusTo] = useState<FocusTarget | null>(null);
  // Runs after the commit that added or removed the control, so the target exists. Focus is moved in the effect body.
  useEffect(() => {
    if (focusTo) root.current?.querySelector<HTMLElement>(`[data-focus-key="${focusTo.key}"]`)?.focus();
  }, [focusTo]);

  const set = (i: number, patch: Partial<Q>) => setQs((p) => p.map((q, k) => (k === i ? { ...q, ...patch } : q)));
  const setOpt = (qi: number, oi: number, patch: Partial<Opt>) =>
    setQs((p) => p.map((q, k) => (k !== qi ? q : { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) })));
  const markCorrect = (qi: number, oi: number) =>
    setQs((p) => p.map((q, k) => {
      if (k !== qi) return q;
      return { ...q, options: q.options.map((o, j) => (q.kind === "single" ? { ...o, correct: j === oi } : j === oi ? { ...o, correct: !o.correct } : o)) };
    }));
  const changeKind = (i: number, kind: Q["kind"]) =>
    setQs((p) => p.map((q, k) => {
      if (k !== i) return q;
      if (kind === "single") { // keep only the first correct option
        let seen = false;
        return { ...q, kind, options: q.options.map((o) => { const c = o.correct && !seen; if (o.correct) seen = true; return { ...o, correct: c }; }) };
      }
      return { ...q, kind };
    }));

  const addQuestion = () => {
    setQs((p) => [...p, blankQ()]);
    setFocusTo({ key: promptKey(qs.length) });
  };
  const removeQuestion = (qi: number) => {
    setQs((p) => p.filter((_, k) => k !== qi));
    setFocusTo({ key: focusKeyAfterRemoveQuestion(qi, qs.length) });
  };
  const addOption = (qi: number) => {
    set(qi, { options: [...qs[qi].options, { text: "", correct: false }] });
    setFocusTo({ key: optionKey(qi, qs[qi].options.length) });
  };
  const removeOption = (qi: number, oi: number) => {
    set(qi, { options: qs[qi].options.filter((_, j) => j !== oi) });
    setFocusTo({ key: focusKeyAfterRemoveOption(qi, oi, qs[qi].options.length) });
  };

  // The settings form posts the questions as JSON. When the server accepts them (the `saved` field), that exact
  // JSON becomes the baseline, so anything edited while the save was running still counts as unsaved.
  const saveAction = async (prev: FormState, fd: FormData) => {
    const res = await action(prev, fd);
    if (res?.fields?.saved && !res.error) setSaved(String(fd.get("questions") ?? ""));
    return res;
  };

  return (
    <div ref={root} className="space-y-8">
      <section aria-labelledby={`${uid}-questions`}>
        <h2 id={`${uid}-questions`} className="font-semibold">Questions</h2>
        <ol className="mt-3 divide-y divide-line border-y border-line">
          {qs.map((q, qi) => {
            const n = qi + 1;
            const group = `${uid}-q${qi}-correct`;
            return (
              <li key={qi} className="space-y-3 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Question {n}</h3>
                  <div className="flex items-center gap-2">
                    <Select
                      label={`Question ${n} type`}
                      className={`${NAME_ONLY} w-44`}
                      value={q.kind}
                      onChange={(e) => changeKind(qi, e.target.value as Q["kind"])}
                    >
                      <option value="single">Single answer</option>
                      <option value="multi">Multiple answers</option>
                    </Select>
                    <Button variant="danger" size="sm" className={COARSE} disabled={qs.length === 1} onClick={() => removeQuestion(qi)}
                      aria-label={`Remove question ${n}`}>
                      Remove
                    </Button>
                  </div>
                </div>
                <Textarea
                  data-focus-key={promptKey(qi)}
                  label={`Question ${n} prompt`}
                  className={NAME_ONLY}
                  value={q.prompt}
                  onChange={(e) => set(qi, { prompt: e.target.value })}
                  rows={2}
                  placeholder="Ask your question"
                />
                <fieldset className="min-w-0">
                  <legend className="mb-1 text-xs text-muted">
                    <span className="sr-only">Question {n}: </span>
                    {q.kind === "single" ? "Select the one correct answer" : "Tick every correct answer"}
                  </legend>
                  <ul className="space-y-1">
                    {q.options.map((o, oi) => (
                      <li key={oi} className="flex items-center gap-2">
                        {q.kind === "single" ? (
                          <CorrectRadio name={group} checked={o.correct} onChange={() => markCorrect(qi, oi)} label={`Mark option ${oi + 1} as correct`} />
                        ) : (
                          <Checkbox
                            className="shrink-0"
                            label="Correct"
                            aria-label={`Mark option ${oi + 1} as correct`}
                            checked={o.correct}
                            onChange={() => markCorrect(qi, oi)}
                          />
                        )}
                        <Input
                          data-focus-key={optionKey(qi, oi)}
                          label={`Question ${n} option ${oi + 1}`}
                          className={`${NAME_ONLY} min-w-0 flex-1`}
                          value={o.text}
                          onChange={(e) => setOpt(qi, oi, { text: e.target.value })}
                          placeholder={`Option ${oi + 1}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`${COARSE} pointer-coarse:min-w-11 shrink-0`}
                          aria-label={`Remove option ${oi + 1}`}
                          disabled={q.options.length <= 2}
                          onClick={() => removeOption(qi, oi)}
                        >
                          <IconX size={16} />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </fieldset>
                <Button data-focus-key={addOptionKey(qi)} variant="secondary" size="sm" className={COARSE} icon={<IconPlus size={16} />}
                  disabled={q.options.length >= MAX_OPTIONS} onClick={() => addOption(qi)}>
                  Add option
                </Button>
                <Input
                  label={`Question ${n} explanation`}
                  hint="Shown to learners after they pass. Optional."
                  value={q.explanation}
                  onChange={(e) => set(qi, { explanation: e.target.value })}
                />
              </li>
            );
          })}
        </ol>
        <Button data-focus-key={ADD_QUESTION_KEY} variant="secondary" className={`mt-4 ${COARSE}`} icon={<IconPlus size={16} />}
          disabled={qs.length >= MAX_QUESTIONS} onClick={addQuestion}>
          Add question
        </Button>
      </section>

      <ActionForm action={saveAction} className="space-y-4">
        <h2 className="font-semibold">Quiz settings</h2>
        <input type="hidden" name="questions" value={serialised} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field name="passPct" label="Pass mark (%)" type="number" defaultValue={defaults.passPct} required />
          <Field name="maxAttempts" label="Max attempts" type="number" defaultValue={defaults.maxAttempts ?? ""} hint="Empty = unlimited. Unlimited retakes let learners probe the answers by trial and error; 3 is a good default." />
          <Field name="shuffle" label="Shuffle options" as="select" defaultValue={defaults.shuffle ? "yes" : "no"}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </Field>
        </div>
        <FormError />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <SubmitButton variant="primary" size="md" className={COARSE} pendingText="Saving…">Save quiz</SubmitButton>
          {/* Always mounted so a screen reader announces the text when it appears. "Saved" would contradict it, so it yields. */}
          <span role="status" className="text-sm font-medium text-muted">{dirty ? "Unsaved changes" : ""}</span>
          {!dirty && <SavedNote />}
        </div>
      </ActionForm>
    </div>
  );
}
