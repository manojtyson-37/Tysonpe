import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { completeLesson } from "@/app/actions/learning";
import { QuizPlayer } from "@/components/QuizPlayer";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { DripState } from "@/lib/learning/drip";
import { loadCourse, loadLesson, type OutlineLesson } from "@/lib/learning/service";
import { toEmbedUrl } from "@/lib/validation";

export const metadata: Metadata = { title: "Learn" };

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(d);

function lockText(s: DripState): string {
  if (s.unlocked) return "";
  if (s.reason === "date") return `Opens ${fmt(s.unlockAt)}`;
  if (s.reason === "after_previous") return "Finish the previous lesson to unlock";
  return "Not available";
}

export default async function LearnPage({ params, searchParams }: PageProps<"/library/[productId]">) {
  const { productId } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/library/${productId}`);

  const course = await loadCourse(user.id, productId);
  if (!course) {
    // Not enrolled: send to the public page if it exists, else 404.
    const p = await db.product.findFirst({ where: { id: productId, status: "published" }, include: { creator: true } });
    if (!p) notFound();
    redirect(`/c/${p.creator.handle}/${p.slug}`);
  }

  const order = await db.enrollment.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
    select: { orderId: true },
  });

  const all = course.lessons;
  const requested = typeof sp.lesson === "string" ? all.find((l) => l.id === sp.lesson) : undefined;
  const firstOpen = all.find((l) => !l.completed && l.state.unlocked) ?? all[0];
  const current: OutlineLesson | undefined = requested ?? firstOpen;
  const lesson = current ? await loadLesson(user.id, current.id) : null;

  // Next lesson to offer after this one: the next unlocked, not-yet-completed lesson in course order.
  const idx = current ? all.findIndex((l) => l.id === current.id) : -1;
  const next = idx >= 0 ? all.slice(idx + 1).find((l) => l.state.unlocked && !l.completed) ?? null : null;
  const nextHref = next ? `/library/${productId}?lesson=${next.id}` : null;
  // Fixed messages keyed by a code: the URL can't be used to put arbitrary text in an alert box.
  const NOTICES: Record<string, string> = { locked: "That lesson isn't available yet.", unavailable: "That lesson isn't available." };
  const notice = typeof sp.notice === "string" ? (NOTICES[sp.notice] ?? null) : null;
  const safe = (u: string) => (/^https?:\/\//i.test(u) ? u : "#"); // render-time guard in addition to write-time validation
  const { progress } = course;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/library" className="text-sm font-medium text-muted hover:text-ink">← My library</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{course.product.title}</h1>
          <p className="text-sm text-muted">by {course.product.creator.displayName}</p>
        </div>
        {order && <Link className="text-sm font-semibold text-brand hover:underline" href={`/orders/${order.orderId}/invoice`}>Invoice</Link>}
      </div>

      {progress.total > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{progress.done} of {progress.total} lessons complete</span>
            <span className="tabular-nums text-muted">{progress.pct}%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={progress.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Course progress">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress.pct}%` }} />
          </div>
        </div>
      )}

      {progress.complete && (
        <div className="mt-5 rounded-2xl border border-good/30 bg-good-soft px-5 py-4">
          <p className="font-bold text-good">🎉 You finished this course!</p>
          {course.certificate ? (
            <Link href={`/certificates/${course.certificate.publicId}`} className="btn btn-primary btn-sm mt-3">View your certificate</Link>
          ) : (
            <p className="mt-1 text-sm text-muted">Nice work. Keep revisiting any lesson whenever you like.</p>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <nav aria-label="Course content" className="lg:sticky lg:top-24 lg:self-start">
          {course.lessons.length === 0 ? (
            <p className="card p-5 text-sm text-muted">The creator hasn&apos;t added any content yet. It will show up here as soon as they do.</p>
          ) : (
            <div className="space-y-4">
              {course.groups.map((g) => (
                <div key={g.id ?? "loose"}>
                  {g.title && <h2 className="mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-muted">{g.title}</h2>}
                  <ul className="card divide-y divide-line overflow-hidden">
                    {g.lessons.map((l) => {
                      const active = l.id === current?.id;
                      const locked = !l.state.unlocked;
                      return (
                        <li key={l.id}>
                          <Link
                            href={`/library/${productId}?lesson=${l.id}`}
                            aria-current={active ? "page" : undefined}
                            className={`flex items-start gap-3 px-3.5 py-3 text-sm transition ${active ? "bg-brand-soft" : "hover:bg-surface-2"}`}
                          >
                            <span aria-hidden className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${l.completed ? "bg-good text-bg" : locked ? "bg-surface-2 text-muted" : "border border-line"}`}>
                              {l.completed ? "✓" : locked ? "🔒" : ""}
                            </span>
                            <span className="min-w-0">
                              <span className={`block truncate ${active ? "font-semibold" : "font-medium"} ${locked ? "text-muted" : ""}`}>{l.title}</span>
                              <span className="block text-xs text-muted">
                                {l.kind === "quiz" ? "Quiz" : l.kind}{!l.required && " · optional"}{locked && ` · ${lockText(l.state)}`}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </nav>

        <article className="min-w-0">
          {notice && <p role="alert" className="mb-4 rounded-xl bg-bad-soft px-4 py-3 text-sm font-medium text-bad">{notice}</p>}
          {!lesson ? null : lesson.locked ? (
            <div className="card p-8 text-center">
              <p aria-hidden className="text-3xl">🔒</p>
              <h2 className="mt-3 text-xl font-bold">{lesson.title}</h2>
              <p className="mt-1 text-muted">{lockText(lesson.state)}</p>
            </div>
          ) : (
            <div className="card p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="flex-1 text-xl font-bold sm:text-2xl">{lesson.title}</h2>
                {lesson.completed && <span className="badge badge-good">Completed</span>}
              </div>

              <div className="mt-5">
                {lesson.kind === "video" ? (
                  (() => {
                    const embed = toEmbedUrl(lesson.url);
                    return embed ? (
                      <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                        <iframe src={embed} title={lesson.title} className="h-full w-full" allow="fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
                        {/* Deterrent watermark: leaked recordings trace back to the account. */}
                        <span aria-hidden className="pointer-events-none absolute left-3 top-3 select-none text-xs font-semibold text-white/35 [text-shadow:0_0_2px_#000]">{user.email}</span>
                        <span aria-hidden className="pointer-events-none absolute bottom-12 right-3 select-none text-xs font-semibold text-white/35 [text-shadow:0_0_2px_#000]">{user.email}</span>
                      </div>
                    ) : (
                      <a href={safe(lesson.url)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Watch video ↗</a>
                    );
                  })()
                ) : lesson.kind === "text" ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{lesson.body}</p>
                ) : lesson.kind === "quiz" ? (
                  lesson.questions.length === 0 ? (
                    <p className="text-sm text-muted">This quiz has no questions yet.</p>
                  ) : (
                    <QuizPlayer key={lesson.id} itemId={lesson.id} questions={lesson.questions} passPct={lesson.passPct}
                      attemptsLeft={lesson.attemptsLeft} lastScorePct={lesson.lastScorePct} nextHref={nextHref} completed={lesson.completed} />
                  )
                ) : (
                  <a href={safe(lesson.url)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                    {lesson.kind === "pdf" ? "Open PDF" : "Open link"} ↗
                  </a>
                )}
              </div>

              {lesson.kind !== "quiz" && (
                <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                  {lesson.completed ? (
                    nextHref && <Link href={nextHref} className="btn btn-primary">Next lesson →</Link>
                  ) : (
                    <form action={completeLesson.bind(null, lesson.id)}>
                      <button className="btn btn-primary" type="submit">{idx < all.length - 1 ? "Mark complete & continue" : "Mark complete"}</button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
