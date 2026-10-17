import type { Metadata } from "next";
import Link from "next/link";
import { Empty, PageHeader, Progress, TYPE_LABEL, dateFmt } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { computeProgress } from "@/lib/learning/progress";

export const metadata: Metadata = { title: "My library" };

// Every row is one link: tone shift on hover (never a lift), an ink focus ring inside the row, and a 44px floor on touch.
const ROW =
  "flex flex-col gap-3 px-3 py-4 transition-colors duration-(--dur-fast) ease-(--ease-standard) hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6 pointer-coarse:min-h-11 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink";

export default async function LibraryPage() {
  const user = await requireUser("/library");
  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { product: { include: { creator: true, _count: { select: { items: true } } } } },
  });

  // Progress for the whole page in two queries, however many courses there are (never one loadCourse per row).
  // Only required lessons are fetched, so optional ones are left out of the totals exactly as the player leaves them out.
  const productIds = enrollments.map((e) => e.productId);
  const [required, completed] = productIds.length
    ? await Promise.all([
        db.contentItem.findMany({ where: { productId: { in: productIds }, requiredForCompletion: true }, select: { id: true, productId: true } }),
        db.lessonProgress.findMany({ where: { userId: user.id, productId: { in: productIds } }, select: { itemId: true, productId: true } }),
      ])
    : [[], []];
  const progressOf = (productId: string) =>
    computeProgress(
      required.filter((i) => i.productId === productId).map((i) => ({ id: i.id, required: true })),
      new Set(completed.filter((c) => c.productId === productId).map((c) => c.itemId)),
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader title="My library" sub="Everything you've bought, in one place." />
      {enrollments.length === 0 ? (
        <Empty title="Your library is empty" body="When you buy a course, membership or download, it shows up here instantly." />
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {enrollments.map(({ product: p, createdAt }) => {
            const progress = progressOf(p.id);
            const lessons = p._count.items;
            return (
              <li key={p.id}>
                <Link href={`/library/${p.id}`} className={ROW}>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold">{p.title}</h2>
                    <p className="mt-0.5 text-sm text-muted">
                      {TYPE_LABEL[p.type] ?? p.type} · by {p.creator.displayName}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      {lessons} {lessons === 1 ? "lesson" : "lessons"} · Joined {dateFmt(createdAt)}
                    </p>
                  </div>
                  {progress.total > 0 && (
                    <Progress
                      className="sm:w-64 sm:shrink-0"
                      value={progress.done}
                      max={progress.total}
                      label="Course progress"
                      valueText={`${progress.done} of ${progress.total} ${progress.total < lessons ? "required " : ""}${progress.total === 1 ? "lesson" : "lessons"}`}
                      tone={progress.complete ? "good" : "ink"}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
