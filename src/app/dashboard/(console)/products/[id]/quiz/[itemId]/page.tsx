import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resetAttemptsAction, saveQuiz } from "@/app/actions/curriculum";
import { QuizEditor } from "@/components/QuizEditor";
import { PageHeader } from "@/components/ui";
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
      <Link href={`/dashboard/products/${id}`} className="text-sm font-medium text-muted hover:text-ink">← Back to product</Link>
      <div className="mt-3"><PageHeader title={item.title} sub="Quiz questions. Learners see correct answers only after they pass." /></div>
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
          <section className="card mt-8 p-5" aria-label="Learners out of attempts">
            <h2 className="font-semibold">Out of attempts</h2>
            <p className="mt-1 text-sm text-muted">These learners used every attempt without passing and can&apos;t finish the course until you reset them.</p>
            <ul className="mt-4 divide-y divide-line">
              {stuck.map((l) => (
                <li key={l.userId} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{l.name}</p>
                    <p className="truncate text-xs text-muted">{l.email} · {l.attempts} attempts · last score {l.lastScorePct}%</p>
                  </div>
                  <form action={resetAttemptsAction.bind(null, item.id, l.userId)}>
                    <button className="btn btn-secondary btn-sm" type="submit">Give new attempts</button>
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
