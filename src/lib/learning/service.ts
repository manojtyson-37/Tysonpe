import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { AppError, isUniqueViolation } from "../errors";
import { backfillCertificates, maybeIssueCertificate } from "./certificates";
import { isUnlocked, type DripState, type DripType } from "./drip";
import { computeProgress } from "./progress";
import { attemptsLeft, gradeQuiz, seededShuffle } from "./quiz";

export { backfillCertificates };
type Tx = Prisma.TransactionClient;

export type OutlineLesson = {
  id: string;
  title: string;
  kind: string;
  sectionId: string | null;
  required: boolean;
  completed: boolean;
  state: DripState;
};

/* ---------- internal: ordered course + unlock state ---------- */

async function orderedItems(tx: Tx | typeof db, productId: string) {
  const [sections, items] = await Promise.all([
    tx.section.findMany({ where: { productId }, orderBy: { position: "asc" } }),
    // No url/body here: the outline and unlock maths never need lesson content.
    tx.contentItem.findMany({
      where: { productId },
      orderBy: { position: "asc" },
      select: { id: true, sectionId: true, position: true, title: true, kind: true, dripType: true, dripDays: true, dripAt: true, requiredForCompletion: true },
    }),
  ]);
  // Tiebreak on id: equal positions (e.g. after a section is deleted) must not make the order, and so
  // the after_previous chain, depend on database tie order.
  const byPos = (a: { position: number; id: string }, b: { position: number; id: string }) => a.position - b.position || a.id.localeCompare(b.id);
  const loose = items.filter((i) => !i.sectionId || !sections.some((s) => s.id === i.sectionId)).sort(byPos);
  const groups = [
    ...(loose.length ? [{ id: null as string | null, title: null as string | null, items: loose }] : []),
    ...sections.map((s) => ({ id: s.id as string | null, title: s.title as string | null, items: items.filter((i) => i.sectionId === s.id).sort(byPos) })),
  ];
  return { groups, flat: groups.flatMap((g) => g.items) };
}

function stateFor(
  flat: Awaited<ReturnType<typeof orderedItems>>["flat"],
  enrolledAt: Date,
  completed: ReadonlySet<string>,
  now: Date,
) {
  const states = new Map<string, DripState>();
  let lastRequired: string | null = null;
  for (const it of flat) {
    states.set(
      it.id,
      isUnlocked(
        { id: it.id, dripType: it.dripType as DripType, dripDays: it.dripDays, dripAt: it.dripAt },
        { enrolledAt, now, previousItemId: lastRequired, completedIds: completed },
      ),
    );
    if (it.requiredForCompletion) lastRequired = it.id;
  }
  return states;
}

/** Enrolment + ordered course + unlock states for one lesson. Throws not_found for non-enrolled learners. */
async function accessFor(tx: Tx | typeof db, userId: string, itemId: string, now = new Date()) {
  const item = await tx.contentItem.findUnique({ where: { id: itemId }, include: { quiz: true } });
  if (!item) throw new AppError("not_found", "Lesson not found.");
  const enrollment = await tx.enrollment.findUnique({
    where: { userId_productId: { userId, productId: item.productId } },
  });
  if (!enrollment) throw new AppError("not_found", "Lesson not found.");
  const [{ flat }, done] = await Promise.all([
    orderedItems(tx, item.productId),
    tx.lessonProgress.findMany({ where: { userId, productId: item.productId }, select: { itemId: true } }),
  ]);
  const completed = new Set(done.map((d) => d.itemId));
  const states = stateFor(flat, enrollment.createdAt, completed, now);
  return { item, enrollment, completed, state: states.get(item.id)! };
}

/* ---------- course outline (no lesson content) ---------- */

export async function loadCourse(userId: string, productId: string, now = new Date()) {
  const enrollment = await db.enrollment.findUnique({ where: { userId_productId: { userId, productId } } });
  if (!enrollment) return null;
  const product = await db.product.findUniqueOrThrow({
    where: { id: productId },
    include: { creator: { select: { displayName: true, handle: true } } },
  });
  const { groups, flat } = await orderedItems(db, productId);
  const done = await db.lessonProgress.findMany({ where: { userId, productId }, select: { itemId: true } });
  const completed = new Set(done.map((d) => d.itemId));
  const states = stateFor(flat, enrollment.createdAt, completed, now);

  const view = (it: (typeof flat)[number]): OutlineLesson => ({
    id: it.id, title: it.title, kind: it.kind, sectionId: it.sectionId, required: it.requiredForCompletion,
    completed: completed.has(it.id), state: states.get(it.id)!,
  });
  const lessons = flat.map(view);
  const certificate = await db.certificate.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { publicId: true, revokedAt: true },
  });
  return {
    product: { id: product.id, title: product.title, certificateEnabled: product.certificateEnabled, creator: product.creator },
    enrolledAt: enrollment.createdAt,
    groups: groups.map((g) => ({ id: g.id, title: g.title, lessons: g.items.map(view) })),
    lessons,
    progress: computeProgress(lessons.map((l) => ({ id: l.id, required: l.required })), completed),
    certificate: certificate && !certificate.revokedAt ? { publicId: certificate.publicId } : null,
  };
}

/* ---------- one lesson's content ---------- */

export type LessonContent =
  | { locked: true; id: string; title: string; kind: string; state: DripState }
  | { locked: false; id: string; title: string; kind: "video" | "pdf" | "text" | "link"; url: string; body: string; completed: boolean }
  | {
      locked: false; id: string; title: string; kind: "quiz"; completed: boolean; passPct: number;
      maxAttempts: number | null; attemptsUsed: number; attemptsLeft: number | null; lastScorePct: number | null;
      questions: Array<{ id: string; prompt: string; kind: "single" | "multi"; options: Array<{ id: string; text: string }> }>;
    };

export async function loadLesson(userId: string, itemId: string, now = new Date()): Promise<LessonContent> {
  const { item, completed, state } = await accessFor(db, userId, itemId, now);
  if (!state.unlocked) return { locked: true, id: item.id, title: item.title, kind: item.kind, state };

  if (item.kind !== "quiz" || !item.quiz) {
    return { locked: false, id: item.id, title: item.title, kind: item.kind as "video", url: item.url, body: item.body, completed: completed.has(item.id) };
  }
  const quiz = await db.quiz.findUniqueOrThrow({
    where: { id: item.quiz.id },
    include: { questions: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" } } } } },
  });
  const attempts = await db.quizAttempt.findMany({ where: { quizId: quiz.id, userId }, orderBy: { attemptNo: "desc" } });
  return {
    locked: false, id: item.id, title: item.title, kind: "quiz", completed: completed.has(item.id),
    passPct: quiz.passPct, maxAttempts: quiz.maxAttempts, attemptsUsed: attempts.length,
    attemptsLeft: attemptsLeft(quiz.maxAttempts, attempts.length), lastScorePct: attempts[0]?.scorePct ?? null,
    questions: quiz.questions.map((q) => {
      const opts = q.options.map((o) => ({ id: o.id, text: o.text })); // never `correct`
      return {
        id: q.id, prompt: q.prompt, kind: q.kind as "single" | "multi",
        options: quiz.shuffle ? seededShuffle(opts, `${userId}:${q.id}:${attempts.length}`) : opts,
      };
    }),
  };
}

/* ---------- completion ---------- */

async function ensureProgress(tx: Tx, userId: string, productId: string, itemId: string) {
  // Upsert (INSERT … ON CONFLICT DO NOTHING-style): idempotent without a caught error that would abort a Postgres transaction.
  await tx.lessonProgress.upsert({
    where: { userId_itemId: { userId, itemId } },
    create: { userId, productId, itemId },
    update: {},
  });
}

export async function markComplete(userId: string, itemId: string) {
  return db.$transaction(async (tx) => {
    const { item, state } = await accessFor(tx, userId, itemId);
    if (item.kind === "quiz") throw new AppError("invalid_state", "Quizzes are completed by passing them.");
    if (!state.unlocked) throw new AppError("locked", "This lesson isn't available yet.");
    await ensureProgress(tx, userId, item.productId, item.id);
    await maybeIssueCertificate(tx, userId, item.productId);
    return { ok: true as const };
  });
}

/* ---------- quizzes ---------- */

export type QuizSubmission = {
  passed: boolean;
  scorePct: number;
  correctCount: number;
  total: number;
  attemptsLeft: number | null;
  /** Only present after passing or when attempts have run out. */
  reveal?: Array<{ questionId: string; correct: boolean; correctOptionIds: string[]; explanation: string }>;
};

export async function submitQuiz(userId: string, itemId: string, answers: Record<string, string[]>): Promise<QuizSubmission> {
  try {
    return await submitQuizTx(userId, itemId, answers);
  } catch (e) {
    // Two submits raced for the same attempt number: the database refused the second.
    if (isUniqueViolation(e)) throw new AppError("no_attempts", "Another submission was just processed. Reload and check your attempts.");
    throw e;
  }
}

function submitQuizTx(userId: string, itemId: string, answers: Record<string, string[]>): Promise<QuizSubmission> {
  return db.$transaction(async (tx) => {
    const { item, state } = await accessFor(tx, userId, itemId);
    if (item.kind !== "quiz" || !item.quiz) throw new AppError("invalid_state", "This lesson is not a quiz.");
    if (!state.unlocked) throw new AppError("locked", "This quiz isn't available yet.");

    const quiz = await tx.quiz.findUniqueOrThrow({
      where: { id: item.quiz.id },
      include: { questions: { orderBy: { position: "asc" }, include: { options: true } } },
    });
    const prior = await tx.quizAttempt.findMany({ where: { quizId: quiz.id, userId } });
    if (prior.some((a) => a.passed)) throw new AppError("already_passed", "You've already passed this quiz.");
    if (attemptsLeft(quiz.maxAttempts, prior.length) === 0) throw new AppError("no_attempts", "No attempts left.");

    const graded = gradeQuiz(
      quiz.questions.map((q) => ({ id: q.id, kind: q.kind as "single" | "multi", options: q.options })),
      answers,
      quiz.passPct,
    );
    await tx.quizAttempt.create({
      data: { userId, quizId: quiz.id, attemptNo: prior.length + 1, scorePct: graded.scorePct, passed: graded.passed, answers: JSON.stringify(answers) },
    });
    if (graded.passed) {
      await ensureProgress(tx, userId, item.productId, item.id);
      await maybeIssueCertificate(tx, userId, item.productId);
    }
    const left = attemptsLeft(quiz.maxAttempts, prior.length + 1);
    const reveal = graded.passed || left === 0;
    return {
      passed: graded.passed,
      scorePct: graded.scorePct,
      correctCount: graded.results.filter((r) => r.correct).length,
      total: graded.results.length,
      attemptsLeft: left,
      ...(reveal
        ? {
            reveal: quiz.questions.map((q) => ({
              questionId: q.id,
              correct: graded.results.find((r) => r.questionId === q.id)!.correct,
              correctOptionIds: q.options.filter((o) => o.correct).map((o) => o.id),
              explanation: q.explanation,
            })),
          }
        : {}),
    };
  });
}
