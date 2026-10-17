"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode, type Ref } from "react";
import { submitQuizAction } from "@/app/actions/learning";
import { CheckboxCard, RadioCard } from "@/components/form";
import { IconArrowRight, IconCheck } from "@/components/icons";
import { Button, ButtonLink, Callout } from "@/components/ui";
import type { QuizSubmission } from "@/lib/learning/service";

export type QuizQuestion = { id: string; prompt: string; kind: "single" | "multi"; options: Array<{ id: string; text: string }> };
export type QuizAnswers = Record<string, string[]>;

/**
 * The answer state after one click. Pure so it can be tested without a DOM: a single-choice question always holds
 * exactly the clicked option (clicking the chosen one again keeps it, as a radio does); a multi-choice question
 * toggles the option in or out. The input object is never mutated.
 */
export function toggleAnswer(answers: QuizAnswers, question: Pick<QuizQuestion, "id" | "kind">, optionId: string): QuizAnswers {
  const current = answers[question.id] ?? [];
  if (question.kind === "single") return { ...answers, [question.id]: [optionId] };
  return { ...answers, [question.id]: current.includes(optionId) ? current.filter((x) => x !== optionId) : [...current, optionId] };
}

const passedLine = (r: QuizSubmission) => `Passed with ${r.scorePct}%. ${r.correctCount} of ${r.total} correct.`;
const failedLine = (r: QuizSubmission, passPct: number) =>
  `You scored ${r.scorePct}% (${r.correctCount} of ${r.total}). You need ${passPct}%.${r.attemptsLeft === 0 ? " You've used all your attempts." : " Review the material and try again."}`;

/**
 * What the live region says after a submit. Only a pass: its Callout has no role, so without this it is silent. A fail is
 * already spoken (the bad Callout is role="alert" and focus lands on its wrapper), and repeating it here made a screen
 * reader read it up to three times.
 */
export const announcement = (r: QuizSubmission) => (r.passed ? passedLine(r) : "");

/**
 * The result, in a wrapper the player can focus. tabIndex -1 makes it focusable by script only (not a tab stop) and
 * scroll-mt-24 keeps it clear of the sticky header when focus() scrolls it into view.
 */
function ResultFocus({ resultRef, children }: { resultRef?: Ref<HTMLDivElement>; children: ReactNode }) {
  return (
    <div ref={resultRef} tabIndex={-1} className="outline-none scroll-mt-24">
      {children}
    </div>
  );
}

const attemptsText = (left: number) => `${left} attempt${left === 1 ? "" : "s"} left`;

/** Every option of every question with the right ones marked in words and an icon, never by colour alone. */
export function QuizReview({ questions, reveal }: { questions: QuizQuestion[]; reveal: QuizSubmission["reveal"] }) {
  return (
    <ol className="divide-y divide-line border-y border-line">
      {questions.map((q, i) => {
        const rv = reveal?.find((r) => r.questionId === q.id);
        return (
          <li key={q.id} className="py-4">
            <p className="text-base font-medium">{i + 1}. {q.prompt}</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {q.options.map((o) => {
                const correct = rv?.correctOptionIds.includes(o.id) ?? false;
                return correct ? (
                  <li key={o.id} className="flex items-start gap-2 font-semibold text-good">
                    <IconCheck size={16} className="mt-0.5 shrink-0" />
                    <span>
                      {o.text} <span className="font-medium">(Correct answer)</span>
                    </span>
                  </li>
                ) : (
                  <li key={o.id} className="pl-6 text-muted">{o.text}</li>
                );
              })}
            </ul>
            {rv?.explanation && <p className="mt-2 text-sm text-muted">{rv.explanation}</p>}
          </li>
        );
      })}
    </ol>
  );
}

/** The result of a passing attempt: the score, the answers revealed, and the way on. */
export function QuizPassed({ questions, result, nextHref, resultRef }: {
  questions: QuizQuestion[]; result: QuizSubmission; nextHref: string | null; resultRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div className="space-y-5">
      <ResultFocus resultRef={resultRef}>
        <Callout tone="good">{passedLine(result)}</Callout>
      </ResultFocus>
      <QuizReview questions={questions} reveal={result.reveal} />
      {nextHref && (
        <ButtonLink href={nextHref} variant="primary">
          Continue
          <IconArrowRight size={16} />
        </ButtonLink>
      )}
    </div>
  );
}

/** A failed attempt: what was scored and what to do next, plus the answers once the attempts are spent. */
export function QuizFailed({ questions, result, passPct, resultRef }: {
  questions: QuizQuestion[]; result: QuizSubmission; passPct: number; resultRef?: Ref<HTMLDivElement>;
}) {
  const exhausted = result.attemptsLeft === 0;
  return (
    <div className="space-y-5">
      <ResultFocus resultRef={resultRef}>
        <Callout tone="bad">{failedLine(result, passPct)}</Callout>
      </ResultFocus>
      {exhausted && result.reveal && <QuizReview questions={questions} reveal={result.reveal} />}
    </div>
  );
}

/**
 * The question form and the notices around it, driven entirely by props so every state can be rendered without a
 * DOM. `error` is the server's own message and is shown verbatim: quiz.ts words and pins those messages.
 */
export function QuizForm(props: {
  questions: QuizQuestion[]; passPct: number; attemptsLeft: number | null; lastScorePct: number | null;
  result: QuizSubmission | null; answers: QuizAnswers; error: string | null; pending: boolean;
  onToggle: (q: QuizQuestion, optionId: string) => void; onSubmit: () => void; resultRef?: Ref<HTMLDivElement>;
}) {
  const { result, answers, error, pending } = props;
  const left = result ? result.attemptsLeft : props.attemptsLeft;
  const exhausted = result !== null && result.attemptsLeft === 0;
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Pass mark {props.passPct}%.{" "}
        {left === null ? "Unlimited attempts." : `${attemptsText(left)}.`}
        {props.lastScorePct !== null && !result && ` Last score ${props.lastScorePct}%.`}
      </p>

      {result && !result.passed && <QuizFailed questions={props.questions} result={result} passPct={props.passPct} resultRef={props.resultRef} />}

      {!exhausted && (
        <>
          <ol className="space-y-6">
            {props.questions.map((q, i) => {
              const Card = q.kind === "single" ? RadioCard : CheckboxCard;
              return (
                <li key={q.id}>
                  <fieldset>
                    <legend className="text-base font-medium">{i + 1}. {q.prompt}</legend>
                    <p className="mt-0.5 text-sm text-muted">{q.kind === "single" ? "Choose one" : "Choose all that apply"}</p>
                    <div className="mt-3 space-y-2">
                      {q.options.map((o) => (
                        <Card
                          key={o.id}
                          name={`q-${q.id}`}
                          value={o.id}
                          title={o.text}
                          checked={(answers[q.id] ?? []).includes(o.id)}
                          disabled={pending}
                          onChange={() => props.onToggle(q, o.id)}
                        />
                      ))}
                    </div>
                  </fieldset>
                </li>
              );
            })}
          </ol>
          {error && <Callout tone="bad">{error}</Callout>}
          <Button type="button" onClick={props.onSubmit} loading={pending}>{result ? "Try again" : "Submit answers"}</Button>
        </>
      )}
    </div>
  );
}

/**
 * Every quiz state (new, failed, passed, already passed, out of attempts) as a pure function of its props, so each can
 * be rendered without a DOM. The polite live region comes first and is the same element in every branch: it must be in
 * the document BEFORE its text changes for a screen reader to announce the change, and a Callout inserted together with
 * its text is the case that is not reliably announced. `resultRef` marks the result wrapper that gets focus.
 */
export function QuizView(props: {
  questions: QuizQuestion[]; passPct: number; attemptsLeft: number | null; lastScorePct: number | null;
  nextHref: string | null; completed: boolean; result: QuizSubmission | null; answers: QuizAnswers; error: string | null;
  pending: boolean; announce: string; resultRef?: Ref<HTMLDivElement>;
  onToggle: (q: QuizQuestion, optionId: string) => void; onSubmit: () => void;
}) {
  const { result } = props;
  let body;
  if (result?.passed) body = <QuizPassed questions={props.questions} result={result} nextHref={props.nextHref} resultRef={props.resultRef} />;
  else if (!result && props.completed) body = <Callout tone="good">You&apos;ve passed this quiz.</Callout>;
  else if (!result && props.attemptsLeft === 0) {
    body = <Callout tone="bad">You&apos;ve used all attempts for this quiz. Contact the creator if you need another.</Callout>;
  } else body = <QuizForm {...props} />;
  return (
    <>
      <p role="status" className="sr-only">{props.announce}</p>
      {body}
    </>
  );
}

/**
 * One stable instance owns every quiz state. The page refreshes server data after each submit; if state lived in
 * different components the result screen would vanish.
 */
export function QuizPlayer(props: {
  itemId: string; questions: QuizQuestion[]; passPct: number; attemptsLeft: number | null;
  lastScorePct: number | null; nextHref: string | null; completed: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [result, setResult] = useState<QuizSubmission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [pending, start] = useTransition();
  const resultRef = useRef<HTMLDivElement>(null);

  // A pass unmounts the Submit button that has focus, and a failed attempt puts the result above the fold, so focus
  // goes to the result. `result` is a new object per submit, so repeat failures fire again. This is an effect BODY on
  // purpose: focus moved in a cleanup is undone, because React DOM restores the pre-commit element after mutation.
  useEffect(() => {
    if (result) resultRef.current?.focus();
  }, [result]);

  function submit() {
    setError(null);
    start(async () => {
      const r = await submitQuizAction(props.itemId, answers);
      if (!r.ok) return setError(r.error);
      setResult(r.result);
      setAnnounce(announcement(r.result));
      router.refresh(); // sidebar progress + attempts
    });
  }

  return (
    <QuizView
      {...props}
      result={result}
      answers={answers}
      error={error}
      pending={pending}
      announce={announce}
      resultRef={resultRef}
      onToggle={(q, optId) => setAnswers((a) => toggleAnswer(a, q, optId))}
      onSubmit={submit}
    />
  );
}
