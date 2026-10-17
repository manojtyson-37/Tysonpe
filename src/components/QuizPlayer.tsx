"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
export function QuizPassed({ questions, result, nextHref }: { questions: QuizQuestion[]; result: QuizSubmission; nextHref: string | null }) {
  return (
    <div className="space-y-5">
      <Callout tone="good">Passed with {result.scorePct}%. {result.correctCount} of {result.total} correct.</Callout>
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
export function QuizFailed({ questions, result, passPct }: { questions: QuizQuestion[]; result: QuizSubmission; passPct: number }) {
  const exhausted = result.attemptsLeft === 0;
  return (
    <div className="space-y-5">
      <Callout tone="bad">
        You scored {result.scorePct}% ({result.correctCount} of {result.total}). You need {passPct}%.
        {exhausted ? " You've used all your attempts." : " Review the material and try again."}
      </Callout>
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
  onToggle: (q: QuizQuestion, optionId: string) => void; onSubmit: () => void;
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

      {result && !result.passed && <QuizFailed questions={props.questions} result={result} passPct={props.passPct} />}

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
 * One stable instance owns every quiz state (new, failed, passed, out of attempts). The page refreshes
 * server data after each submit; if state lived in different components the result screen would vanish.
 */
export function QuizPlayer(props: {
  itemId: string; questions: QuizQuestion[]; passPct: number; attemptsLeft: number | null;
  lastScorePct: number | null; nextHref: string | null; completed: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [result, setResult] = useState<QuizSubmission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const r = await submitQuizAction(props.itemId, answers);
      if (!r.ok) return setError(r.error);
      setResult(r.result);
      router.refresh(); // sidebar progress + attempts
    });
  }

  if (result?.passed) return <QuizPassed questions={props.questions} result={result} nextHref={props.nextHref} />;

  if (!result && props.completed) return <Callout tone="good">You&apos;ve passed this quiz.</Callout>;
  if (!result && props.attemptsLeft === 0) {
    return <Callout tone="bad">You&apos;ve used all attempts for this quiz. Contact the creator if you need another.</Callout>;
  }
  return (
    <QuizForm
      questions={props.questions}
      passPct={props.passPct}
      attemptsLeft={props.attemptsLeft}
      lastScorePct={props.lastScorePct}
      result={result}
      answers={answers}
      error={error}
      pending={pending}
      onToggle={(q, optId) => setAnswers((a) => toggleAnswer(a, q, optId))}
      onSubmit={submit}
    />
  );
}
