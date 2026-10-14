"use client";

import { useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { ActionForm, Field, FormError, SavedNote, SubmitButton } from "./form";

type Opt = { text: string; correct: boolean };
type Q = { prompt: string; kind: "single" | "multi"; explanation: string; options: Opt[] };
export type QuizDefaults = { passPct: number; maxAttempts: number | null; shuffle: boolean; questions: Q[] };

const blankQ = (): Q => ({ prompt: "", kind: "single", explanation: "", options: [{ text: "", correct: true }, { text: "", correct: false }] });

/**
 * The question editor lives OUTSIDE the <form>: React resets form fields after an action, which would
 * visually revert controlled inputs. Only the settings and the serialised questions go through the form.
 */
export function QuizEditor({ action, defaults }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; defaults: QuizDefaults }) {
  const [qs, setQs] = useState<Q[]>(defaults.questions.length ? defaults.questions : [blankQ()]);
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

  return (
    <div className="space-y-6">
      <ol className="space-y-4">
        {qs.map((q, qi) => (
          <li key={qi} className="card space-y-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Question {qi + 1}</h3>
              <div className="flex items-center gap-2">
                <select aria-label={`Question ${qi + 1} type`} value={q.kind} onChange={(e) => changeKind(qi, e.target.value as Q["kind"])} className="input !w-auto !py-1.5 text-xs">
                  <option value="single">Single answer</option>
                  <option value="multi">Multiple answers</option>
                </select>
                <button type="button" className="btn btn-danger btn-sm" disabled={qs.length === 1} onClick={() => setQs((p) => p.filter((_, k) => k !== qi))}>Remove</button>
              </div>
            </div>
            <textarea aria-label={`Question ${qi + 1} prompt`} value={q.prompt} onChange={(e) => set(qi, { prompt: e.target.value })} rows={2} placeholder="Ask your question" className="input" />
            <ul className="space-y-2">
              {q.options.map((o, oi) => (
                <li key={oi} className="flex items-center gap-2">
                  <input
                    type={q.kind === "single" ? "radio" : "checkbox"}
                    checked={o.correct} onChange={() => markCorrect(qi, oi)}
                    aria-label={`Mark option ${oi + 1} as correct`} className="h-4 w-4 accent-[var(--brand)]"
                  />
                  <input aria-label={`Question ${qi + 1} option ${oi + 1}`} value={o.text} onChange={(e) => setOpt(qi, oi, { text: e.target.value })} placeholder={`Option ${oi + 1}`} className="input" />
                  <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove option ${oi + 1}`} disabled={q.options.length <= 2}
                    onClick={() => set(qi, { options: q.options.filter((_, j) => j !== oi) })}>✕</button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between">
              <button type="button" className="btn btn-secondary btn-sm" disabled={q.options.length >= 6} onClick={() => set(qi, { options: [...q.options, { text: "", correct: false }] })}>Add option</button>
              <span className="text-xs text-muted">{q.kind === "single" ? "Select the one correct answer" : "Tick every correct answer"}</span>
            </div>
            <input aria-label={`Question ${qi + 1} explanation`} value={q.explanation} onChange={(e) => set(qi, { explanation: e.target.value })} placeholder="Explanation shown after the learner passes (optional)" className="input" />
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn-secondary" disabled={qs.length >= 100} onClick={() => setQs((p) => [...p, blankQ()])}>Add question</button>

      <ActionForm action={action} className="card space-y-4 p-5">
        <h3 className="font-semibold">Quiz settings</h3>
        <input type="hidden" name="questions" value={JSON.stringify(qs)} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field name="passPct" label="Pass mark (%)" type="number" defaultValue={defaults.passPct} required />
          <Field name="maxAttempts" label="Max attempts" type="number" defaultValue={defaults.maxAttempts ?? ""} hint="Empty = unlimited. Unlimited retakes let learners probe the answers by trial and error; 3 is a good default." />
          <Field name="shuffle" label="Shuffle options" as="select" defaultValue={defaults.shuffle ? "yes" : "no"}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </Field>
        </div>
        <FormError />
        <div className="flex items-center gap-4">
          <SubmitButton pendingText="Saving…">Save quiz</SubmitButton>
          <SavedNote />
        </div>
      </ActionForm>
    </div>
  );
}
