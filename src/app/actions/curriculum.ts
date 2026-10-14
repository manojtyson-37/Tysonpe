"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { onCurriculumChanged, backfillCertificates } from "@/lib/learning/certificates";
import { resetQuizAttempts } from "@/lib/learning/admin";
import { lessonAddProblem, sectionBelongsTo } from "@/lib/learning/guards";
import { AppError } from "@/lib/errors";
import { validateQuizDefinition } from "@/lib/learning/quiz";
import { DRIP_TYPES, LESSON_KINDS, httpUrl } from "@/lib/validation";
import type { FormState } from "./auth";

const fail = (e: z.ZodError): FormState => ({
  fields: Object.fromEntries(e.issues.map((i) => [String(i.path[0]), i.message])),
});
const refresh = (productId: string) => revalidatePath(`/dashboard/products/${productId}`);

async function ownedProduct(productId: string, creatorId: string) {
  return db.product.findFirst({ where: { id: productId, creatorId }, select: { id: true } });
}
async function ownedSection(sectionId: string, creatorId: string) {
  return db.section.findFirst({ where: { id: sectionId, product: { creatorId } } });
}
async function ownedItem(itemId: string, creatorId: string) {
  return db.contentItem.findFirst({ where: { id: itemId, product: { creatorId } }, include: { quiz: true } });
}

/* ---------- sections ---------- */

const sectionTitle = z.string().trim().min(1, "Give the section a title").max(120);

export async function addSection(productId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { creator } = await requireCreator();
  if (!(await ownedProduct(productId, creator.id))) return { error: "Product not found." };
  const t = sectionTitle.safeParse(fd.get("title"));
  if (!t.success) return { fields: { title: t.error.issues[0].message } };
  const last = await db.section.findFirst({ where: { productId }, orderBy: { position: "desc" } });
  await db.section.create({ data: { productId, title: t.data, position: (last?.position ?? -1) + 1 } });
  refresh(productId);
  return undefined;
}

export async function renameSection(sectionId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { creator } = await requireCreator();
  const s = await ownedSection(sectionId, creator.id);
  if (!s) return { error: "Section not found." };
  const t = sectionTitle.safeParse(fd.get("title"));
  if (!t.success) return { fields: { title: t.error.issues[0].message } };
  await db.section.update({ where: { id: s.id }, data: { title: t.data } });
  refresh(s.productId);
  return { fields: { saved: "1" } };
}

export async function deleteSection(sectionId: string) {
  const { creator } = await requireCreator();
  const s = await ownedSection(sectionId, creator.id);
  if (!s) return;
  // Lessons survive: the relation is SetNull, so they fall back to the loose "Lessons" group.
  await db.section.delete({ where: { id: s.id } });
  refresh(s.productId);
}

export async function moveSection(sectionId: string, dir: "up" | "down") {
  const { creator } = await requireCreator();
  const d = z.enum(["up", "down"]).parse(dir);
  const s = await ownedSection(sectionId, creator.id);
  if (!s) return;
  const all = await db.section.findMany({ where: { productId: s.productId }, orderBy: { position: "asc" } });
  const i = all.findIndex((x) => x.id === s.id);
  const j = d === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  await db.$transaction(all.map((x, pos) => db.section.update({ where: { id: x.id }, data: { position: pos } })));
  refresh(s.productId);
}

/* ---------- lessons ---------- */

const lessonSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(160),
    kind: z.enum(LESSON_KINDS),
    url: httpUrl.default(""),
    body: z.string().max(20000).default(""),
    required: z.enum(["yes", "no"]).default("yes"),
    dripType: z.enum(DRIP_TYPES).default("none"),
    dripDays: z.string().optional(),
    dripDate: z.string().optional(),
    sectionId: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind !== "text" && v.kind !== "quiz" && v.url === "") ctx.addIssue({ code: "custom", path: ["url"], message: "A link is required" });
    if (v.kind === "text" && v.body.trim() === "") ctx.addIssue({ code: "custom", path: ["body"], message: "Write some text" });
    if (v.dripType === "days_after_enroll") {
      const n = Number(v.dripDays);
      if (v.dripDays === undefined || v.dripDays === "" || !Number.isInteger(n) || n < 0 || n > 365)
        ctx.addIssue({ code: "custom", path: ["dripDays"], message: "Whole number of days, 0–365" });
    }
    if (v.dripType === "on_date" && (!v.dripDate || Number.isNaN(new Date(`${v.dripDate}T00:00:00+05:30`).getTime())))
      ctx.addIssue({ code: "custom", path: ["dripDate"], message: "Pick a release date" });
  })
  .transform((v) => ({
    title: v.title,
    kind: v.kind,
    url: v.kind === "quiz" || v.kind === "text" ? "" : v.url,
    body: v.kind === "text" ? v.body : "",
    requiredForCompletion: v.required === "yes",
    dripType: v.dripType,
    dripDays: v.dripType === "days_after_enroll" ? Number(v.dripDays) : null,
    dripAt: v.dripType === "on_date" ? new Date(`${v.dripDate}T00:00:00+05:30`) : null, // midnight IST
    sectionId: v.sectionId || null,
  }));

export async function addLesson(productId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { creator } = await requireCreator();
  const owned = await db.product.findFirst({ where: { id: productId, creatorId: creator.id }, select: { id: true, status: true } });
  if (!owned) return { error: "Product not found." };
  const p = lessonSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return fail(p.error);
  const { sectionId, ...data } = p.data;
  const blocked = lessonAddProblem(owned.status, data.kind);
  if (blocked) return { fields: { kind: blocked } };
  // The section must belong to THIS product, not merely to the same creator.
  if (sectionId && !(await sectionBelongsTo(sectionId, productId, creator.id))) return { error: "Section not found." };
  const last = await db.contentItem.findFirst({ where: { productId, sectionId }, orderBy: { position: "desc" } });
  await db.contentItem.create({
    data: {
      ...data, productId, sectionId, position: (last?.position ?? -1) + 1,
      ...(data.kind === "quiz" ? { quiz: { create: { maxAttempts: 3 } } } : {}), // finite by default: unlimited retakes let learners probe the answer key
    },
  });
  refresh(productId);
  return undefined;
}

export async function updateLesson(itemId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { creator } = await requireCreator();
  const existing = await ownedItem(itemId, creator.id);
  if (!existing) return { error: "Lesson not found." };
  const p = lessonSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return fail(p.error);
  // A lesson can't change into or out of a quiz: that would orphan or fabricate questions.
  if ((p.data.kind === "quiz") !== (existing.kind === "quiz")) return { fields: { kind: "A lesson can't be turned into a quiz or back. Add a new one." } };
  const { sectionId: _ignored, ...data } = p.data;
  void _ignored; // section changes go through moveLessonToSection so positions stay consistent
  await db.contentItem.update({ where: { id: existing.id }, data });
  // Only a change to "required" can complete someone's course; skip the per-learner sweep for title/drip edits.
  if (existing.requiredForCompletion !== data.requiredForCompletion) await onCurriculumChanged(existing.productId);
  refresh(existing.productId);
  return { fields: { saved: "1" } };
}

export async function deleteLesson(itemId: string) {
  const { creator } = await requireCreator();
  const item = await ownedItem(itemId, creator.id);
  if (!item) return;
  await db.contentItem.delete({ where: { id: item.id } });
  await onCurriculumChanged(item.productId); // learners who are now done would otherwise never get their certificate
  refresh(item.productId);
}

export async function moveLesson(itemId: string, dir: "up" | "down") {
  const { creator } = await requireCreator();
  const d = z.enum(["up", "down"]).parse(dir);
  const item = await ownedItem(itemId, creator.id);
  if (!item) return;
  const siblings = await db.contentItem.findMany({
    where: { productId: item.productId, sectionId: item.sectionId },
    orderBy: { position: "asc" },
  });
  const i = siblings.findIndex((s) => s.id === item.id);
  const j = d === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= siblings.length) return;
  [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
  await db.$transaction(siblings.map((s, pos) => db.contentItem.update({ where: { id: s.id }, data: { position: pos } })));
  refresh(item.productId);
}

export async function moveLessonToSection(itemId: string, fd: FormData) {
  const { creator } = await requireCreator();
  const item = await ownedItem(itemId, creator.id);
  if (!item) return;
  const target = z.string().optional().parse(fd.get("sectionId") ?? undefined) || null;
  if (target && !(await sectionBelongsTo(target, item.productId, creator.id))) return;
  if (target === item.sectionId) return;
  const last = await db.contentItem.findFirst({ where: { productId: item.productId, sectionId: target }, orderBy: { position: "desc" } });
  await db.contentItem.update({ where: { id: item.id }, data: { sectionId: target, position: (last?.position ?? -1) + 1 } });
  refresh(item.productId);
}

/* ---------- quizzes ---------- */

const quizSchema = z.object({
  passPct: z.coerce.number().int().min(1, "1–100").max(100, "1–100"),
  maxAttempts: z.string().optional(),
  shuffle: z.enum(["yes", "no"]).default("no"),
  questions: z.string().transform((s, ctx) => {
    try {
      return z
        .array(
          z.object({
            prompt: z.string().max(500),
            kind: z.enum(["single", "multi"]),
            explanation: z.string().max(1000).default(""),
            options: z.array(z.object({ text: z.string().max(300), correct: z.boolean() })).max(6),
          }),
        )
        .max(100)
        .parse(JSON.parse(s));
    } catch {
      ctx.addIssue({ code: "custom", message: "The quiz data was malformed. Reload and try again." });
      return z.NEVER;
    }
  }),
});

export async function saveQuiz(itemId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { creator } = await requireCreator();
  const item = await ownedItem(itemId, creator.id);
  if (!item || item.kind !== "quiz" || !item.quiz) return { error: "Quiz not found." };
  const p = quizSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message, fields: Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message])) };

  let maxAttempts: number | null = null;
  if (p.data.maxAttempts) {
    const n = Number(p.data.maxAttempts);
    if (!Number.isInteger(n) || n < 1 || n > 50) return { fields: { maxAttempts: "Whole number 1–50, or leave empty" } };
    maxAttempts = n;
  }
  const problem = validateQuizDefinition(p.data.questions);
  if (problem) return { error: problem };

  const quizId = item.quiz.id;
  await db.$transaction(async (tx) => {
    await tx.quiz.update({ where: { id: quizId }, data: { passPct: p.data.passPct, maxAttempts, shuffle: p.data.shuffle === "yes" } });
    await tx.quizQuestion.deleteMany({ where: { quizId } }); // options cascade
    for (const [qi, q] of p.data.questions.entries()) {
      await tx.quizQuestion.create({
        data: {
          quizId, position: qi, prompt: q.prompt.trim(), kind: q.kind, explanation: q.explanation.trim(),
          options: { create: q.options.map((o, oi) => ({ position: oi, text: o.text.trim(), correct: o.correct })) },
        },
      });
    }
  });
  refresh(item.productId);
  return { fields: { saved: "1" } };
}

/* ---------- product-level ---------- */

export async function setCertificates(productId: string, enabled: boolean) {
  const { creator } = await requireCreator();
  const on = z.boolean().parse(enabled);
  const res = await db.product.updateMany({ where: { id: productId, creatorId: creator.id }, data: { certificateEnabled: on } });
  if (res.count === 1 && on) await backfillCertificates(productId);
  refresh(productId);
}

/** Publish gate: every quiz must be answerable, otherwise learners could never complete the course. */
export async function publishProduct(productId: string) {
  const { creator } = await requireCreator();
  const product = await db.product.findFirst({
    where: { id: productId, creatorId: creator.id },
    include: { items: { where: { kind: "quiz" }, include: { quiz: { include: { questions: { include: { options: true } } } } } } },
  });
  if (!product) return;
  for (const it of product.items) {
    const qs = it.quiz?.questions ?? [];
    const problem = validateQuizDefinition(
      qs.map((q) => ({ prompt: q.prompt, kind: q.kind as "single" | "multi", options: q.options.map((o) => ({ text: o.text, correct: o.correct })) })),
    );
    if (problem) redirect(`/dashboard/products/${productId}?error=${encodeURIComponent(`Quiz “${it.title}”: ${problem}`)}`);
  }
  await db.product.update({ where: { id: productId }, data: { status: "published" } });
  refresh(productId);
  revalidatePath("/dashboard/products");
}

/** Creator gives a learner who ran out of attempts a fresh set. */
export async function resetAttemptsAction(itemId: string, userId: string) {
  const { creator } = await requireCreator();
  try {
    const item = await ownedItem(itemId, creator.id);
    if (!item) return;
    await resetQuizAttempts({ creatorId: creator.id, itemId, userId: z.string().max(64).parse(userId) });
    revalidatePath(`/dashboard/products/${item.productId}/quiz/${itemId}`);
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
  }
}
