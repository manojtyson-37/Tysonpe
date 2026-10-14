import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { addItem, addQuiz, enroll, makeCreatorWithProduct, makeUser } from "@/test/factories";
import { onCurriculumChanged } from "./certificates";
import { lessonAddProblem, sectionBelongsTo } from "./guards";
import { listExhaustedLearners, resetQuizAttempts } from "./admin";
import { markComplete, submitQuiz } from "./service";

let ctx: Awaited<ReturnType<typeof setup>>;
async function setup() {
  const { creator, product } = await makeCreatorWithProduct({ certificateEnabled: true });
  const learner = await makeUser("Learner One");
  await enroll(learner.id, product.id);
  return { creator, product, learner };
}
beforeEach(async () => {
  ctx = await setup();
});

describe("lessonAddProblem (no empty quiz in a live course)", () => {
  it("blocks adding a quiz to a published product", () =>
    expect(lessonAddProblem("published", "quiz")).toMatch(/unpublish/i));
  it("allows a quiz in a draft and any other lesson in a live course", () => {
    expect(lessonAddProblem("draft", "quiz")).toBeNull();
    expect(lessonAddProblem("published", "video")).toBeNull();
  });
});

describe("sectionBelongsTo", () => {
  it("is true only for a section of the same product owned by the creator", async () => {
    const sec = await db.section.create({ data: { productId: ctx.product.id, title: "S", position: 0 } });
    expect(await sectionBelongsTo(sec.id, ctx.product.id, ctx.creator.id)).toBe(true);

    const other = await db.product.create({
      data: { creatorId: ctx.creator.id, slug: "other-product", type: "course", title: "Other", pricePaise: 100 },
    });
    // same creator, different product: must be refused (cross-product corruption)
    expect(await sectionBelongsTo(sec.id, other.id, ctx.creator.id)).toBe(false);

    const stranger = await makeCreatorWithProduct();
    expect(await sectionBelongsTo(sec.id, ctx.product.id, stranger.creator.id)).toBe(false);
    expect(await sectionBelongsTo("nope", ctx.product.id, ctx.creator.id)).toBe(false);
  });
});

describe("onCurriculumChanged (certificates after the creator edits the course)", () => {
  it("deleting the last unfinished required lesson issues the certificate", async () => {
    const a = await addItem(ctx.product.id, { position: 0 });
    const b = await addItem(ctx.product.id, { position: 1 });
    await markComplete(ctx.learner.id, a.id);
    expect(await db.certificate.count({ where: { productId: ctx.product.id } })).toBe(0);
    await db.contentItem.delete({ where: { id: b.id } });
    await onCurriculumChanged(ctx.product.id);
    expect(await db.certificate.count({ where: { productId: ctx.product.id, revokedAt: null } })).toBe(1);
  });

  it("making the last unfinished lesson optional issues it too", async () => {
    const a = await addItem(ctx.product.id, { position: 0 });
    const b = await addItem(ctx.product.id, { position: 1 });
    await markComplete(ctx.learner.id, a.id);
    await db.contentItem.update({ where: { id: b.id }, data: { requiredForCompletion: false } });
    await onCurriculumChanged(ctx.product.id);
    expect(await db.certificate.count({ where: { productId: ctx.product.id } })).toBe(1);
  });

  it("does nothing when certificates are off", async () => {
    await db.product.update({ where: { id: ctx.product.id }, data: { certificateEnabled: false } });
    const a = await addItem(ctx.product.id);
    await markComplete(ctx.learner.id, a.id);
    await onCurriculumChanged(ctx.product.id);
    expect(await db.certificate.count({ where: { productId: ctx.product.id } })).toBe(0);
  });
});

describe("resetting attempts (learner ran out)", () => {
  it("lists exhausted learners and lets the owning creator reset them", async () => {
    const { item, wrongAnswers, correctAnswers } = await addQuiz(ctx.product.id, { maxAttempts: 1 });
    await submitQuiz(ctx.learner.id, item.id, wrongAnswers);
    await expect(submitQuiz(ctx.learner.id, item.id, correctAnswers)).rejects.toMatchObject({ code: "no_attempts" });

    const stuck = await listExhaustedLearners(ctx.creator.id, item.id);
    expect(stuck.map((s) => s.userId)).toEqual([ctx.learner.id]);

    await resetQuizAttempts({ creatorId: ctx.creator.id, itemId: item.id, userId: ctx.learner.id });
    expect(await listExhaustedLearners(ctx.creator.id, item.id)).toHaveLength(0);
    expect(await submitQuiz(ctx.learner.id, item.id, correctAnswers)).toMatchObject({ passed: true });
  });

  it("refuses a creator who doesn't own the quiz", async () => {
    const { item } = await addQuiz(ctx.product.id, { maxAttempts: 1 });
    const stranger = await makeCreatorWithProduct();
    await expect(resetQuizAttempts({ creatorId: stranger.creator.id, itemId: item.id, userId: ctx.learner.id })).rejects.toMatchObject({ code: "not_found" });
    expect(await listExhaustedLearners(stranger.creator.id, item.id)).toEqual([]);
  });

  it("does not list learners who passed or still have attempts", async () => {
    const { item, correctAnswers } = await addQuiz(ctx.product.id, { maxAttempts: 1 });
    await submitQuiz(ctx.learner.id, item.id, correctAnswers);
    expect(await listExhaustedLearners(ctx.creator.id, item.id)).toEqual([]);
  });
});

describe("attempt numbers are unique per learner and quiz (DB-level cap)", () => {
  it("a duplicate attempt number is rejected by the database", async () => {
    const { quiz } = await addQuiz(ctx.product.id, { maxAttempts: 2 });
    const mk = () => db.quizAttempt.create({ data: { userId: ctx.learner.id, quizId: quiz.id, attemptNo: 1, scorePct: 0, passed: false, answers: "{}" } });
    await mk();
    await expect(mk()).rejects.toMatchObject({ code: "P2002" });
  });
});
