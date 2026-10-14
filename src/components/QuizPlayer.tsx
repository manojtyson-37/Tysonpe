"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitQuizAction } from "@/app/actions/learning";
import type { QuizSubmission } from "@/lib/learning/service";

type Question = { id: string; prompt: string; kind: "single" | "multi"; options: Array<{ id: string; text: string }> };

/**
 * One stable instance owns every quiz state (new, failed, passed, out of attempts). The page refreshes
 * server data after each submit; if state lived in different components the result screen would vanish.
 */
export function QuizPlayer(props: {
  itemId: string; questions: Question[]; passPct: number; attemptsLeft: number | null;
  lastScorePct: number | null; nextHref: string | null; completed: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<QuizSubmission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = (q: Question, optId: string) =>
    setAnswers((a) => {
      const cur = a[q.id] ?? [];
      if (q.kind === "single") return { ...a, [q.id]: [optId] };
      return { ...a, [q.id]: cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId] };
    });

  function submit() {
    setError(null);
    start(async () => {
      const r = await submitQuizAction(props.itemId, answers);
      if (!r.ok) return setError(r.error);
      setResult(r.result);
      router.refresh(); // sidebar progress + attempts
    });
  }

  if (result?.passed) {
    return (
      <div className="space-y-5">
        <p role="status" className="rounded-xl bg-good-soft px-4 py-3 font-semibold text-good">
          Passed with {result.scorePct}%. {result.correctCount} of {result.total} correct.
        </p>
        <ol className="space-y-4">
          {props.questions.map((q, i) => {
            const rv = result.reveal?.find((r) => r.questionId === q.id);
            return (
              <li key={q.id} className="card p-4">
                <p className="font-medium">{i + 1}. {q.prompt}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {q.options.map((o) => (
                    <li key={o.id} className={rv?.correctOptionIds.includes(o.id) ? "font-semibold text-good" : "text-muted"}>
                      {rv?.correctOptionIds.includes(o.id) ? "✓ " : "· "}{o.text}
                    </li>
                  ))}
                </ul>
                {rv?.explanation && <p className="mt-2 text-sm text-muted">{rv.explanation}</p>}
              </li>
            );
          })}
        </ol>
        {props.nextHref && <Link href={props.nextHref} className="btn btn-primary">Continue →</Link>}
      </div>
    );
  }

  if (!result && props.completed) {
    return <p className="rounded-xl bg-good-soft px-4 py-3 font-medium text-good">You&apos;ve passed this quiz.</p>;
  }
  if (!result && props.attemptsLeft === 0) {
    return <p className="rounded-xl bg-bad-soft px-4 py-3 text-sm font-medium text-bad">You&apos;ve used all attempts for this quiz. Contact the creator if you need another.</p>;
  }
  const exhausted = result !== null && result.attemptsLeft === 0;
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Pass mark {props.passPct}%.{" "}
        {props.attemptsLeft === null ? "Unlimited attempts." : `${result ? result.attemptsLeft : props.attemptsLeft} attempt${(result ? result.attemptsLeft : props.attemptsLeft) === 1 ? "" : "s"} left.`}
        {props.lastScorePct !== null && !result && ` Last score ${props.lastScorePct}%.`}
      </p>

      {result && !result.passed && (
        <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm font-medium text-bad">
          You scored {result.scorePct}% ({result.correctCount} of {result.total}). You need {props.passPct}%.
          {exhausted ? " You've used all your attempts." : " Review the material and try again."}
        </p>
      )}
      {exhausted && result?.reveal && (
        <ol className="space-y-3">
          {props.questions.map((q, i) => {
            const rv = result.reveal!.find((r) => r.questionId === q.id);
            return (
              <li key={q.id} className="card p-4 text-sm">
                <p className="font-medium">{i + 1}. {q.prompt}</p>
                <p className="mt-1 text-good">Answer: {q.options.filter((o) => rv?.correctOptionIds.includes(o.id)).map((o) => o.text).join(", ")}</p>
                {rv?.explanation && <p className="mt-1 text-muted">{rv.explanation}</p>}
              </li>
            );
          })}
        </ol>
      )}

      {!exhausted && (
        <>
          <ol className="space-y-5">
            {props.questions.map((q, i) => (
              <li key={q.id}>
                <fieldset>
                  <legend className="font-medium">{i + 1}. {q.prompt}</legend>
                  <p className="mt-0.5 text-xs text-muted">{q.kind === "single" ? "Choose one" : "Choose all that apply"}</p>
                  <div className="mt-2 space-y-2">
                    {q.options.map((o) => {
                      const on = (answers[q.id] ?? []).includes(o.id);
                      return (
                        <label key={o.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${on ? "border-brand bg-brand-soft" : "border-line hover:bg-surface-2"}`}>
                          <input type={q.kind === "single" ? "radio" : "checkbox"} name={`q-${q.id}`} checked={on} onChange={() => toggle(q, o.id)} className="h-4 w-4 accent-[var(--brand)]" />
                          {o.text}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>
          {error && <p role="alert" className="err">{error}</p>}
          <button type="button" onClick={submit} disabled={pending} className="btn btn-primary">{pending ? "Checking…" : result ? "Try again" : "Submit answers"}</button>
        </>
      )}
    </div>
  );
}
