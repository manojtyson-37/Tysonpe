import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { completeLesson } from "@/app/actions/learning";
import { IconArrowLeft, IconArrowRight, IconCheck, IconChevronDown, IconExternal, IconLock } from "@/components/icons";
import { QuizPlayer } from "@/components/QuizPlayer";
import { Button, ButtonLink, Callout, Progress } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import type { DripState } from "@/lib/learning/drip";
import { loadCourse, loadLesson, type OutlineLesson } from "@/lib/learning/service";
import { toEmbedUrl } from "@/lib/validation";

export const metadata: Metadata = { title: "Learn" };

// Focus ring and touch floor shared by the small text links on this screen.
const LINK = "inline-flex items-center gap-1.5 text-sm font-medium pointer-coarse:min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function lockText(s: DripState): string {
  if (s.unlocked) return "";
  if (s.reason === "date") return `Opens ${formatDateTime(s.unlockAt, { year: true })}`;
  if (s.reason === "after_previous") return "Finish the previous lesson to unlock";
  return "Not available";
}

type LoadedCourse = NonNullable<Awaited<ReturnType<typeof loadCourse>>>;

/**
 * The course outline, rendered once inside a collapsed disclosure (below lg) and once as the sticky rail (from lg).
 * The CSS on each wrapper hides the other copy with display:none, so exactly one nav is ever in the accessibility tree.
 */
function CourseOutline({ course, productId, currentId }: { course: LoadedCourse; productId: string; currentId: string | undefined }) {
  return (
    <nav aria-label="Course content">
      {course.lessons.length === 0 ? (
        <p className="rounded-card border border-line bg-surface p-5 text-sm text-muted">The creator hasn&apos;t added any content yet. It will show up here as soon as they do.</p>
      ) : (
        <div className="space-y-5">
          {course.groups.map((g) => (
            <div key={g.id ?? "loose"}>
              {g.title && <h2 className="t-label mb-1.5 px-1">{g.title}</h2>}
              <ul className="divide-y divide-line border-y border-line">
                {g.lessons.map((l) => {
                  const active = l.id === currentId;
                  const locked = !l.state.unlocked;
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/library/${productId}?lesson=${l.id}`}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-start gap-3 border-l-2 py-3 pl-3 pr-3.5 text-sm pointer-coarse:min-h-11 transition-colors duration-(--dur-fast) ease-(--ease-standard) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink ${active ? "border-ink bg-surface-2" : "border-transparent hover:bg-surface-2"}`}
                      >
                        <span aria-hidden className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${l.completed ? "bg-ink text-bg" : locked ? "text-muted" : "border border-line-strong"}`}>
                          {l.completed ? <IconCheck size={12} /> : locked ? <IconLock size={16} /> : null}
                        </span>
                        <span className="min-w-0">
                          <span className={`block truncate ${active ? "font-semibold" : "font-medium"} ${locked ? "text-muted" : ""}`}>
                            {l.completed && <span className="sr-only">Completed: </span>}
                            {l.title}
                          </span>
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
  );
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
  // Own keys only: a bare lookup would let ?notice=constructor (or toString, __proto__) resolve to an Object.prototype member.
  const notice = typeof sp.notice === "string" && Object.hasOwn(NOTICES, sp.notice) ? NOTICES[sp.notice] : null;
  const safe = (u: string) => (/^https?:\/\//i.test(u) ? u : "#"); // render-time guard in addition to write-time validation
  const { progress } = course;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/library" className={`${LINK} text-muted transition-colors duration-(--dur-fast) ease-(--ease-standard) hover:text-ink`}>
        <IconArrowLeft size={16} />
        My library
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">{course.product.title}</h1>
          <p className="mt-1 text-sm text-muted">by {course.product.creator.displayName}</p>
        </div>
        <div className="flex items-center gap-5">
          <Link className={`${LINK} underline-offset-4 hover:underline`} href={`/c/${course.product.creator.handle}/community`}>Community</Link>
          {order && <Link className={`${LINK} underline-offset-4 hover:underline`} href={`/orders/${order.orderId}/invoice`}>Invoice</Link>}
        </div>
      </div>

      {progress.total > 0 && (
        <div className="mt-5 flex items-center gap-3">
          <Progress
            className="flex-1"
            value={progress.done}
            max={progress.total}
            label="Course progress"
            valueText={`${progress.done} of ${progress.total} lessons complete`}
            tone={progress.complete ? "good" : "ink"}
          />
          <span className="text-sm font-medium tabular-nums">{progress.pct}%</span>
        </div>
      )}

      {progress.complete && (
        <Callout
          tone="good"
          className="mt-5"
          action={
            course.certificate ? (
              <ButtonLink href={`/certificates/${course.certificate.publicId}`} size="sm" className="pointer-coarse:min-h-11">View your certificate</ButtonLink>
            ) : undefined
          }
        >
          <p>You finished this course.</p>
          {!course.certificate && <p className="mt-0.5 font-normal">Keep revisiting any lesson whenever you like.</p>}
        </Callout>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Below lg the outline is a closed disclosure so the lesson is on screen at load; it sits before the article in
            the DOM (no CSS order, which would split tab order from reading order). The key resets it to closed when a
            lesson is picked: the open attribute is DOM state React would otherwise keep across a soft navigation. */}
        <details key={current?.id} className="group lg:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-card border border-line bg-surface px-3.5 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1 truncate">
              <span className="font-semibold">Course content</span>
              <span className="text-muted">
                {progress.total > 0 && ` · ${progress.done} of ${progress.total} complete`}
                {current && ` · Now: ${current.title}`}
              </span>
            </span>
            <IconChevronDown size={16} className="shrink-0 transition-transform duration-(--dur-fast) ease-(--ease-standard) group-open:rotate-180" />
          </summary>
          <div className="mt-3">
            <CourseOutline course={course} productId={productId} currentId={current?.id} />
          </div>
        </details>
        <div className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
          <CourseOutline course={course} productId={productId} currentId={current?.id} />
        </div>

        <article className="min-w-0">
          {notice && <Callout tone="bad" className="mb-4">{notice}</Callout>}
          {!lesson ? null : lesson.locked ? (
            <div className="card flex items-start gap-3 p-6">
              <IconLock size={20} className="mt-1 shrink-0 text-muted" />
              <div className="min-w-0">
                <h2 className="text-xl font-bold">{lesson.title}</h2>
                <p className="mt-1 text-sm text-muted">{lockText(lesson.state)}</p>
              </div>
            </div>
          ) : (
            <div className="card p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="flex-1 text-xl font-bold sm:text-2xl">{lesson.title}</h2>
                {lesson.completed && (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-good">
                    <IconCheck size={16} />
                    Completed
                  </span>
                )}
              </div>

              <div className="mt-5">
                {lesson.kind === "video" ? (
                  (() => {
                    const embed = toEmbedUrl(lesson.url);
                    return embed ? (
                      <div className="relative aspect-video overflow-hidden rounded-card bg-ink">
                        <iframe src={embed} title={lesson.title} className="h-full w-full" allow="fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
                        {/* Deterrent watermark: leaked recordings trace back to the account. */}
                        <span aria-hidden className="pointer-events-none absolute left-3 top-3 select-none text-xs font-semibold text-white/35 [text-shadow:0_0_2px_var(--ink)]">{user.email}</span>
                        <span aria-hidden className="pointer-events-none absolute bottom-12 right-3 select-none text-xs font-semibold text-white/35 [text-shadow:0_0_2px_var(--ink)]">{user.email}</span>
                      </div>
                    ) : (
                      <a href={safe(lesson.url)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                        Watch video
                        <IconExternal size={16} />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
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
                    {lesson.kind === "pdf" ? "Open PDF" : "Open link"}
                    <IconExternal size={16} />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
              </div>

              {lesson.kind !== "quiz" && (
                <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                  {lesson.completed ? (
                    nextHref && (
                      <ButtonLink href={nextHref}>
                        Next lesson
                        <IconArrowRight size={16} />
                      </ButtonLink>
                    )
                  ) : (
                    <form action={completeLesson.bind(null, lesson.id)}>
                      <Button type="submit">{idx < all.length - 1 ? "Mark complete & continue" : "Mark complete"}</Button>
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
