import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resetAttemptsAction, saveQuiz } from "@/app/actions/curriculum";
import { QuizEditor } from "@/components/QuizEditor";
import { Button, PageHeader } from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listExhaustedLearners } from "@/lib/learning/admin";

export const metadata: Metadata = { title: "Edit quiz" };

export default async function QuizPage({ params }: PageProps<"/dashboard/products/[id]/quiz/[itemId]">) {
  const { id, itemId } = await params;
  const { creator } = await requireCreator();
  const item = await db.contentItem.findFirst({
    where: { id: itemId, productId: id, kind: "quiz", product: { creatorId: creator.id } },
    include: {
      quiz: { include: { questions: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" } } } } } },
    },
  });
  if (!item?.quiz) notFound();
  const quiz = item.quiz;
  const stuck = await listExhaustedLearners(creator.id, item.id);

  return (
    <>
      <PageHeader
        title={item.title}
        sub="Quiz questions. Learners see correct answers only after they pass."
        back={{ label: "Back to product", href: `/dashboard/products/${id}` }}
      />
      <div className="max-w-3xl">
        <QuizEditor
          action={saveQuiz.bind(null, item.id)}
          defaults={{
            passPct: quiz.passPct, maxAttempts: quiz.maxAttempts, shuffle: quiz.shuffle,
            questions: quiz.questions.map((q) => ({
              prompt: q.prompt, kind: q.kind as "single" | "multi", explanation: q.explanation,
              options: q.options.map((o) => ({ text: o.text, correct: o.correct })),
            })),
          }}
        />

        {stuck.length > 0 && (
          <section aria-labelledby="out-of-attempts-h" className="mt-10 border-t border-line pt-6">
            <h2 id="out-of-attempts-h" className="font-semibold">Out of attempts</h2>
            <p className="mt-1 text-sm text-muted">These learners used every attempt without passing and can&apos;t finish the course until you reset them.</p>
            <ul className="mt-4 divide-y divide-line">
              {stuck.map((l) => (
                <li key={l.userId} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{l.name}</p>
                    <p className="truncate text-xs text-muted">{l.email} · {l.attempts} {l.attempts === 1 ? "attempt" : "attempts"} · last score {l.lastScorePct}%</p>
                  </div>
                  <form action={resetAttemptsAction.bind(null, item.id, l.userId)}>
                    <Button type="submit" variant="secondary" size="sm" className="pointer-coarse:min-h-11" aria-label={`Give new attempts to ${l.name}`}>
                      Give new attempts
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
