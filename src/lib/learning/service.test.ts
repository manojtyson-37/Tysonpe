import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { markOrderPaid, refundOrder } from "@/lib/orders";
import { addItem, addQuiz, enroll, makeCreatorWithProduct, makeUser } from "@/test/factories";
import {
  backfillCertificates, loadCourse, loadLesson, markComplete, submitQuiz,
} from "./service";

const DAY = 86_400_000;
let ctx: Awaited<ReturnType<typeof setup>>;
async function setup(productOver: Record<string, unknown> = {}) {
  const { user: creatorUser, creator, product } = await makeCreatorWithProduct(productOver);
  const learner = await makeUser("Meera Learner");
  const enrollment = await enroll(learner.id, product.id);
  return { creatorUser, creator, product, learner, enrollment };
}
beforeEach(async () => {
  ctx = await setup();
});

describe("loadCourse", () => {
  it("returns null for someone who is not enrolled", async () => {
    const stranger = await makeUser();
    expect(await loadCourse(stranger.id, ctx.product.id)).toBeNull();
  });

  it("orders unsectioned lessons first, then sections, and reports progress", async () => {
    const s1 = await db.section.create({ data: { productId: ctx.product.id, title: "Basics", position: 0 } });
    const s2 = await db.section.create({ data: { productId: ctx.product.id, title: "Advanced", position: 1 } });
    const a = await addItem(ctx.product.id, { title: "Loose", position: 0 });
    const c = await addItem(ctx.product.id, { title: "Adv 1", sectionId: s2.id, position: 0 });
    const b = await addItem(ctx.product.id, { title: "Basic 1", sectionId: s1.id, position: 0 });
    const course = (await loadCourse(ctx.learner.id, ctx.product.id))!;
    expect(course.lessons.map((l) => l.id)).toEqual([a.id, b.id, c.id]);
    expect(course.progress).toMatchObject({ done: 0, total: 3, pct: 0, complete: false });
    expect(course.groups.map((g) => g.title)).toEqual([null, "Basics", "Advanced"]);
  });

  it("never includes lesson bodies or urls in the outline", async () => {
    await addItem(ctx.product.id, { kind: "video", url: "https://secret.example/v", body: "secret body text" });
    const course = (await loadCourse(ctx.learner.id, ctx.product.id))!;
    expect(JSON.stringify(course)).not.toContain("secret");
  });

  it("after_previous skips optional lessons when finding the previous one", async () => {
    const first = await addItem(ctx.product.id, { position: 0 });
    await addItem(ctx.product.id, { position: 1, requiredForCompletion: false });
    const third = await addItem(ctx.product.id, { position: 2, dripType: "after_previous" });
    let course = (await loadCourse(ctx.learner.id, ctx.product.id))!;
    expect(course.lessons.find((l) => l.id === third.id)!.state.unlocked).toBe(false);
    await markComplete(ctx.learner.id, first.id);
    course = (await loadCourse(ctx.learner.id, ctx.product.id))!;
    expect(course.lessons.find((l) => l.id === third.id)!.state.unlocked).toBe(true);
  });

  it("days_after_enroll counts from this learner's enrolment date", async () => {
    await db.enrollment.update({ where: { id: ctx.enrollment.id }, data: { createdAt: new Date(Date.now() - 2 * DAY) } });
    const soon = await addItem(ctx.product.id, { position: 0, dripType: "days_after_enroll", dripDays: 1 });
    const later = await addItem(ctx.product.id, { position: 1, dripType: "days_after_enroll", dripDays: 5 });
    const course = (await loadCourse(ctx.learner.id, ctx.product.id))!;
    expect(course.lessons.find((l) => l.id === soon.id)!.state.unlocked).toBe(true);
    expect(course.lessons.find((l) => l.id === later.id)!.state).toMatchObject({ unlocked: false, reason: "date" });
  });
});

describe("loadLesson", () => {
  it("returns content for an unlocked lesson", async () => {
    const it = await addItem(ctx.product.id, { kind: "video", url: "https://v.example/x", body: "" });
    const r = await loadLesson(ctx.learner.id, it.id);
    expect(r).toMatchObject({ locked: false, kind: "video", url: "https://v.example/x" });
  });

  it("withholds all content from a locked lesson", async () => {
    const it = await addItem(ctx.product.id, { url: "https://v.example/hidden-url", body: "secret body text", dripType: "on_date", dripAt: new Date(Date.now() + DAY) });
    const r = await loadLesson(ctx.learner.id, it.id);
    expect(r.locked).toBe(true);
    expect(JSON.stringify(r)).not.toContain("secret");
    expect(JSON.stringify(r)).not.toContain("hidden-url");
  });

  it("refuses a learner who is not enrolled", async () => {
    const it = await addItem(ctx.product.id);
    const stranger = await makeUser();
    await expect(loadLesson(stranger.id, it.id)).rejects.toMatchObject({ code: "not_found" });
  });

  it("serves quiz questions without the answer key", async () => {
    const { item } = await addQuiz(ctx.product.id);
    const r = await loadLesson(ctx.learner.id, item.id);
    if (r.locked || r.kind !== "quiz") throw new Error("expected an open quiz");
    expect(r.questions).toHaveLength(2);
    const dump = JSON.stringify(r);
    expect(dump).not.toContain('"correct"');
    expect(dump).not.toContain("Paris is the capital"); // explanations are withheld too
  });
});

describe("markComplete", () => {
  it("completes a lesson and is idempotent", async () => {
    const it = await addItem(ctx.product.id);
    await markComplete(ctx.learner.id, it.id);
    await markComplete(ctx.learner.id, it.id);
    expect(await db.lessonProgress.count({ where: { userId: ctx.learner.id, itemId: it.id } })).toBe(1);
  });

  it("is safe under concurrent calls", async () => {
    const it = await addItem(ctx.product.id);
    await Promise.allSettled([1, 2, 3].map(() => markComplete(ctx.learner.id, it.id)));
    expect(await db.lessonProgress.count({ where: { userId: ctx.learner.id, itemId: it.id } })).toBe(1);
  });

  it("rejects a locked lesson", async () => {
    const it = await addItem(ctx.product.id, { dripType: "on_date", dripAt: new Date(Date.now() + DAY) });
    await expect(markComplete(ctx.learner.id, it.id)).rejects.toMatchObject({ code: "locked" });
    expect(await db.lessonProgress.count({ where: { itemId: it.id } })).toBe(0);
  });

  it("rejects quizzes (they complete by passing)", async () => {
    const { item } = await addQuiz(ctx.product.id);
    await expect(markComplete(ctx.learner.id, item.id)).rejects.toMatchObject({ code: "invalid_state" });
  });

  it("rejects a learner who is not enrolled", async () => {
    const it = await addItem(ctx.product.id);
    const stranger = await makeUser();
    await expect(markComplete(stranger.id, it.id)).rejects.toMatchObject({ code: "not_found" });
  });

  it("rejects a lesson from a refunded (no longer enrolled) course", async () => {
    const it = await addItem(ctx.product.id);
    await db.enrollment.deleteMany({ where: { userId: ctx.learner.id } });
    await expect(markComplete(ctx.learner.id, it.id)).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("certificates", () => {
  beforeEach(async () => {
    ctx = await setup({ certificateEnabled: true });
  });

  it("issues exactly once when the last required lesson is completed", async () => {
    const a = await addItem(ctx.product.id, { position: 0 });
    const b = await addItem(ctx.product.id, { position: 1 });
    await addItem(ctx.product.id, { position: 2, requiredForCompletion: false });
    await markComplete(ctx.learner.id, a.id);
    expect(await db.certificate.count({ where: { productId: ctx.product.id } })).toBe(0);
    await markComplete(ctx.learner.id, b.id);
    await markComplete(ctx.learner.id, b.id);
    const certs = await db.certificate.findMany({ where: { userId: ctx.learner.id } });
    expect(certs).toHaveLength(1);
    expect(certs[0]).toMatchObject({ learnerName: "Meera Learner", courseTitle: "Course", creatorName: "Creator Co", revokedAt: null });
    expect(certs[0].publicId).toMatch(/^[A-HJ-NP-Z2-9]{12}$/);
  });

  it("is not issued when the product has certificates turned off", async () => {
    await db.product.update({ where: { id: ctx.product.id }, data: { certificateEnabled: false } });
    const a = await addItem(ctx.product.id);
    await markComplete(ctx.learner.id, a.id);
    expect(await db.certificate.count({ where: { productId: ctx.product.id } })).toBe(0);
  });

  it("backfill issues certificates to learners who already finished", async () => {
    await db.product.update({ where: { id: ctx.product.id }, data: { certificateEnabled: false } });
    const a = await addItem(ctx.product.id);
    await markComplete(ctx.learner.id, a.id);
    await db.product.update({ where: { id: ctx.product.id }, data: { certificateEnabled: true } });
    expect(await backfillCertificates(ctx.product.id)).toBe(1);
    expect(await backfillCertificates(ctx.product.id)).toBe(0);
    expect(await db.certificate.count({ where: { productId: ctx.product.id } })).toBe(1);
  });

  it("refund revokes it, a repurchase restores it", async () => {
    const a = await addItem(ctx.product.id);
    // use a real order so refund/pay flows run
    await db.enrollment.deleteMany({ where: { userId: ctx.learner.id } });
    await db.order.deleteMany({ where: { userId: ctx.learner.id } });
    const order = await db.order.create({
      data: { userId: ctx.learner.id, productId: ctx.product.id, creatorId: ctx.creator.id, subtotalPaise: 100000, totalPaise: 100000,
        gstPaise: 15254, gstRatePct: 18, provider: "mock", providerOrderId: "order_mock_cert1" },
    });
    await markOrderPaid({ providerOrderId: order.providerOrderId, paymentId: "p" });
    await markComplete(ctx.learner.id, a.id);
    expect(await db.certificate.count({ where: { productId: ctx.product.id, revokedAt: null } })).toBe(1);

    await refundOrder({ creatorId: ctx.creator.id, orderId: order.id });
    expect(await db.certificate.count({ where: { productId: ctx.product.id, revokedAt: null } })).toBe(0);
    expect(await db.certificate.count({ where: { productId: ctx.product.id } })).toBe(1); // kept for the record, just revoked

    const again = await db.order.create({
      data: { userId: ctx.learner.id, productId: ctx.product.id, creatorId: ctx.creator.id, subtotalPaise: 100000, totalPaise: 100000,
        gstPaise: 15254, gstRatePct: 18, provider: "mock", providerOrderId: "order_mock_cert2" },
    });
    await markOrderPaid({ providerOrderId: again.providerOrderId, paymentId: "p2" });
    expect(await db.certificate.count({ where: { productId: ctx.product.id, revokedAt: null } })).toBe(1);
  });

  it("refunding one of two paid orders keeps the certificate (buyer still has access)", async () => {
    const a = await addItem(ctx.product.id);
    await db.enrollment.deleteMany({ where: { userId: ctx.learner.id } });
    await db.order.deleteMany({ where: { userId: ctx.learner.id } });
    const mk = (id: string) => db.order.create({
      data: { userId: ctx.learner.id, productId: ctx.product.id, creatorId: ctx.creator.id, subtotalPaise: 100000, totalPaise: 100000,
        gstPaise: 15254, gstRatePct: 18, provider: "mock", providerOrderId: id },
    });
    const o1 = await mk("order_mock_dupA");
    const o2 = await mk("order_mock_dupB");
    await markOrderPaid({ providerOrderId: o1.providerOrderId, paymentId: "p1" });
    await markOrderPaid({ providerOrderId: o2.providerOrderId, paymentId: "p2" });
    await markComplete(ctx.learner.id, a.id);
    await refundOrder({ creatorId: ctx.creator.id, orderId: o1.id });
    expect(await db.certificate.count({ where: { productId: ctx.product.id, revokedAt: null } })).toBe(1);
  });

  it("a relinked enrolment keeps the original enrolment date (drip does not reset)", async () => {
    await db.enrollment.deleteMany({ where: { userId: ctx.learner.id } });
    await db.order.deleteMany({ where: { userId: ctx.learner.id } });
    const mk = (id: string) => db.order.create({
      data: { userId: ctx.learner.id, productId: ctx.product.id, creatorId: ctx.creator.id, subtotalPaise: 100000, totalPaise: 100000,
        gstPaise: 15254, gstRatePct: 18, provider: "mock", providerOrderId: id },
    });
    const o1 = await mk("order_mock_keepA");
    const o2 = await mk("order_mock_keepB");
    await markOrderPaid({ providerOrderId: o1.providerOrderId, paymentId: "p1" });
    const first = await db.enrollment.findFirstOrThrow({ where: { userId: ctx.learner.id } });
    await db.enrollment.update({ where: { id: first.id }, data: { createdAt: new Date("2026-01-01T00:00:00Z") } });
    await markOrderPaid({ providerOrderId: o2.providerOrderId, paymentId: "p2" });
    await refundOrder({ creatorId: ctx.creator.id, orderId: o1.id });
    const kept = await db.enrollment.findFirstOrThrow({ where: { userId: ctx.learner.id } });
    expect(kept.orderId).toBe(o2.id);
    expect(kept.createdAt.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("submitQuiz", () => {
  it("a passing attempt completes the lesson and reveals the answers", async () => {
    const { item, correctAnswers } = await addQuiz(ctx.product.id);
    const r = await submitQuiz(ctx.learner.id, item.id, correctAnswers);
    expect(r).toMatchObject({ passed: true, scorePct: 100 });
    expect(r.reveal).toBeDefined();
    expect(await db.lessonProgress.count({ where: { userId: ctx.learner.id, itemId: item.id } })).toBe(1);
    expect(await db.quizAttempt.count({ where: { userId: ctx.learner.id } })).toBe(1);
  });

  it("a failing attempt records progress nowhere and keeps the answer key secret", async () => {
    const { item, wrongAnswers } = await addQuiz(ctx.product.id, { maxAttempts: 3 });
    const r = await submitQuiz(ctx.learner.id, item.id, wrongAnswers);
    expect(r).toMatchObject({ passed: false, scorePct: 0, attemptsLeft: 2 });
    expect(r.reveal).toBeUndefined();
    expect(JSON.stringify(r)).not.toContain("Paris is the capital");
    expect(await db.lessonProgress.count({ where: { itemId: item.id } })).toBe(0);
  });

  it("enforces the attempt limit and reveals answers once attempts run out", async () => {
    const { item, wrongAnswers } = await addQuiz(ctx.product.id, { maxAttempts: 2 });
    await submitQuiz(ctx.learner.id, item.id, wrongAnswers);
    const last = await submitQuiz(ctx.learner.id, item.id, wrongAnswers);
    expect(last).toMatchObject({ passed: false, attemptsLeft: 0 });
    expect(last.reveal).toBeDefined();
    await expect(submitQuiz(ctx.learner.id, item.id, wrongAnswers)).rejects.toMatchObject({ code: "no_attempts" });
    expect(await db.quizAttempt.count({ where: { userId: ctx.learner.id } })).toBe(2);
  });

  it("concurrent submits cannot exceed the attempt limit", async () => {
    const { item, wrongAnswers } = await addQuiz(ctx.product.id, { maxAttempts: 1 });
    await Promise.allSettled([1, 2, 3].map(() => submitQuiz(ctx.learner.id, item.id, wrongAnswers)));
    expect(await db.quizAttempt.count({ where: { userId: ctx.learner.id } })).toBe(1);
  });

  it("does not allow another attempt after passing", async () => {
    const { item, correctAnswers } = await addQuiz(ctx.product.id);
    await submitQuiz(ctx.learner.id, item.id, correctAnswers);
    await expect(submitQuiz(ctx.learner.id, item.id, correctAnswers)).rejects.toMatchObject({ code: "already_passed" });
  });

  it("rejects a locked quiz and a non-enrolled learner", async () => {
    const { item, correctAnswers } = await addQuiz(ctx.product.id);
    await db.contentItem.update({ where: { id: item.id }, data: { dripType: "on_date", dripAt: new Date(Date.now() + DAY) } });
    await expect(submitQuiz(ctx.learner.id, item.id, correctAnswers)).rejects.toMatchObject({ code: "locked" });
    const stranger = await makeUser();
    await expect(submitQuiz(stranger.id, item.id, correctAnswers)).rejects.toMatchObject({ code: "not_found" });
  });

  it("ignores option ids that belong to other questions", async () => {
    const { item, quiz, correctAnswers } = await addQuiz(ctx.product.id);
    const [q1, q2] = quiz.questions;
    const stolen = { [q1.id]: correctAnswers[q2.id], [q2.id]: correctAnswers[q1.id] }; // right ids, wrong questions
    const r = await submitQuiz(ctx.learner.id, item.id, stolen);
    expect(r.scorePct).toBe(0);
  });

  it("passing the final quiz issues the certificate", async () => {
    await db.product.update({ where: { id: ctx.product.id }, data: { certificateEnabled: true } });
    const lesson = await addItem(ctx.product.id, { position: 0 });
    const { item, correctAnswers } = await addQuiz(ctx.product.id, { position: 1 });
    await markComplete(ctx.learner.id, lesson.id);
    expect(await db.certificate.count({ where: { productId: ctx.product.id } })).toBe(0);
    await submitQuiz(ctx.learner.id, item.id, correctAnswers);
    expect(await db.certificate.count({ where: { productId: ctx.product.id, userId: ctx.learner.id } })).toBe(1);
  });
});

describe("lock enforcement beyond on_date (direct calls must not bypass drip)", () => {
  it("markComplete rejects an after_previous lesson whose predecessor is incomplete", async () => {
    await addItem(ctx.product.id, { position: 0 });
    const second = await addItem(ctx.product.id, { position: 1, dripType: "after_previous" });
    await expect(markComplete(ctx.learner.id, second.id)).rejects.toMatchObject({ code: "locked" });
    expect(await db.lessonProgress.count({ where: { itemId: second.id } })).toBe(0);
  });

  it("submitQuiz rejects an after_previous quiz and records no attempt", async () => {
    await addItem(ctx.product.id, { position: 0 });
    const { item, correctAnswers } = await addQuiz(ctx.product.id, { position: 1 });
    await db.contentItem.update({ where: { id: item.id }, data: { dripType: "after_previous" } });
    await expect(submitQuiz(ctx.learner.id, item.id, correctAnswers)).rejects.toMatchObject({ code: "locked" });
    expect(await db.quizAttempt.count({ where: { userId: ctx.learner.id } })).toBe(0);
  });

  it("days_after_enroll blocks completion until the day arrives", async () => {
    const it = await addItem(ctx.product.id, { dripType: "days_after_enroll", dripDays: 3 });
    await expect(markComplete(ctx.learner.id, it.id)).rejects.toMatchObject({ code: "locked" });
  });

  it("a locked quiz is served with no questions at all", async () => {
    const { item } = await addQuiz(ctx.product.id);
    await db.contentItem.update({ where: { id: item.id }, data: { dripType: "on_date", dripAt: new Date(Date.now() + DAY) } });
    const r = await loadLesson(ctx.learner.id, item.id);
    expect(r.locked).toBe(true);
    expect(JSON.stringify(r)).not.toContain("Capital of France");
  });

  it("when the previous required lesson is a quiz, the next lesson opens only after passing it", async () => {
    const { item, correctAnswers, wrongAnswers } = await addQuiz(ctx.product.id, { position: 0 });
    const after = await addItem(ctx.product.id, { position: 1, dripType: "after_previous" });
    await submitQuiz(ctx.learner.id, item.id, wrongAnswers);
    await expect(markComplete(ctx.learner.id, after.id)).rejects.toMatchObject({ code: "locked" });
    await submitQuiz(ctx.learner.id, item.id, correctAnswers);
    await expect(markComplete(ctx.learner.id, after.id)).resolves.toBeDefined();
  });
});

describe("quiz service details", () => {
  it("reveals the real answer ids and explanations on a pass", async () => {
    const { item, quiz, correctAnswers } = await addQuiz(ctx.product.id);
    const r = await submitQuiz(ctx.learner.id, item.id, correctAnswers);
    for (const rv of r.reveal!) {
      expect([...rv.correctOptionIds].sort()).toEqual([...correctAnswers[rv.questionId]].sort());
      expect(rv.explanation).toBe(quiz.questions.find((x) => x.id === rv.questionId)!.explanation);
    }
  });

  it("unlimited attempts keep failing without ever running out", async () => {
    const { item, wrongAnswers } = await addQuiz(ctx.product.id, { maxAttempts: null });
    for (let i = 0; i < 4; i++) expect(await submitQuiz(ctx.learner.id, item.id, wrongAnswers)).toMatchObject({ passed: false, attemptsLeft: null });
    expect(await db.quizAttempt.count({ where: { userId: ctx.learner.id } })).toBe(4);
  });

  it("loadLesson reports attempts used/left and the last score", async () => {
    const { item, wrongAnswers } = await addQuiz(ctx.product.id, { maxAttempts: 3 });
    await submitQuiz(ctx.learner.id, item.id, wrongAnswers);
    const r = await loadLesson(ctx.learner.id, item.id);
    if (r.locked || r.kind !== "quiz") throw new Error("expected quiz");
    expect(r).toMatchObject({ attemptsUsed: 1, attemptsLeft: 2, lastScorePct: 0, completed: false });
  });

  it("shuffle gives a stable order per attempt that changes after an attempt", async () => {
    const { item, quiz, wrongAnswers } = await addQuiz(ctx.product.id);
    await db.quiz.update({ where: { id: quiz.id }, data: { shuffle: true } });
    // make the 3-option question wide enough that two seeds differ
    const order = async () => {
      const r = await loadLesson(ctx.learner.id, item.id);
      if (r.locked || r.kind !== "quiz") throw new Error("expected quiz");
      return r.questions.map((x) => x.options.map((o) => o.id).join(",")).join("|");
    };
    const a1 = await order();
    expect(await order()).toBe(a1); // stable between loads
    const seen = new Set([a1]);
    for (let i = 0; i < 6; i++) { await submitQuiz(ctx.learner.id, item.id, wrongAnswers); seen.add(await order()); }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("a quiz with no questions can't be passed", async () => {
    const empty = await addItem(ctx.product.id, { kind: "quiz", body: "" });
    await db.quiz.create({ data: { itemId: empty.id } });
    const r = await submitQuiz(ctx.learner.id, empty.id, {});
    expect(r).toMatchObject({ passed: false, total: 0 });
    expect(await db.lessonProgress.count({ where: { itemId: empty.id } })).toBe(0);
  });
});

describe("certificate restore rules", () => {
  async function paidOrder(providerOrderId: string) {
    const o = await db.order.create({
      data: { userId: ctx.learner.id, productId: ctx.product.id, creatorId: ctx.creator.id, subtotalPaise: 100000, totalPaise: 100000,
        gstPaise: 15254, gstRatePct: 18, provider: "mock", providerOrderId },
    });
    await markOrderPaid({ providerOrderId, paymentId: "p" });
    return o;
  }
  async function earnThenRefund() {
    await db.product.update({ where: { id: ctx.product.id }, data: { certificateEnabled: true } });
    await db.enrollment.deleteMany({ where: { userId: ctx.learner.id } });
    await db.order.deleteMany({ where: { userId: ctx.learner.id } });
    const a = await addItem(ctx.product.id);
    const o = await paidOrder(`order_mock_${Math.random().toString(36).slice(2)}`);
    await markComplete(ctx.learner.id, a.id);
    const before = await db.certificate.findFirstOrThrow({ where: { productId: ctx.product.id, userId: ctx.learner.id } });
    await refundOrder({ creatorId: ctx.creator.id, orderId: o.id });
    return before;
  }

  it("a repurchase brings back the SAME certificate, not a new one", async () => {
    const before = await earnThenRefund();
    await paidOrder(`order_mock_${Math.random().toString(36).slice(2)}`);
    const after = await db.certificate.findMany({ where: { productId: ctx.product.id, userId: ctx.learner.id } });
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({ publicId: before.publicId, revokedAt: null });
  });

  it("is not restored if the creator turned certificates off in the meantime", async () => {
    await earnThenRefund();
    await db.product.update({ where: { id: ctx.product.id }, data: { certificateEnabled: false } });
    await paidOrder(`order_mock_${Math.random().toString(36).slice(2)}`);
    expect(await db.certificate.count({ where: { productId: ctx.product.id, revokedAt: null } })).toBe(0);
  });

  it("is not restored while new required lessons are unfinished, then returns on completion", async () => {
    const before = await earnThenRefund();
    const extra = await addItem(ctx.product.id, { position: 5 });
    await paidOrder(`order_mock_${Math.random().toString(36).slice(2)}`);
    expect(await db.certificate.count({ where: { productId: ctx.product.id, revokedAt: null } })).toBe(0);
    await markComplete(ctx.learner.id, extra.id);
    const back = await db.certificate.findFirstOrThrow({ where: { productId: ctx.product.id, userId: ctx.learner.id } });
    expect(back).toMatchObject({ publicId: before.publicId, revokedAt: null });
  });

  it("backfill does not count a restore as a newly issued certificate", async () => {
    await earnThenRefund();
    await paidOrder(`order_mock_${Math.random().toString(36).slice(2)}`);
    expect(await backfillCertificates(ctx.product.id)).toBe(0);
  });
});

describe("refunding a duplicate paid order that holds no enrolment", () => {
  it("succeeds (no relink needed) and leaves the buyer's access intact", async () => {
    const mk = (id: string) => db.order.create({
      data: { userId: ctx.learner.id, productId: ctx.product.id, creatorId: ctx.creator.id, subtotalPaise: 100000, totalPaise: 100000,
        gstPaise: 15254, gstRatePct: 18, provider: "mock", providerOrderId: id },
    });
    await db.enrollment.deleteMany({ where: { userId: ctx.learner.id } });
    await db.order.deleteMany({ where: { userId: ctx.learner.id } });
    const a = await mk("order_mock_dupX1");
    const b = await mk("order_mock_dupX2");
    await markOrderPaid({ providerOrderId: a.providerOrderId, paymentId: "p1" }); // holds the enrolment
    await markOrderPaid({ providerOrderId: b.providerOrderId, paymentId: "p2" }); // duplicate, no enrolment
    await expect(refundOrder({ creatorId: ctx.creator.id, orderId: b.id })).resolves.toMatchObject({ status: "refunded" });
    const left = await db.enrollment.findMany({ where: { userId: ctx.learner.id, productId: ctx.product.id } });
    expect(left).toHaveLength(1);
    expect(left[0].orderId).toBe(a.id);
  });
});

describe("loose lesson ordering is deterministic", () => {
  it("lessons with identical positions are ordered by id so after_previous chains are stable", async () => {
    const x = await addItem(ctx.product.id, { position: 0, title: "X" });
    const y = await addItem(ctx.product.id, { position: 0, title: "Y" });
    const ids = [x.id, y.id].sort();
    for (let i = 0; i < 3; i++) {
      const course = (await loadCourse(ctx.learner.id, ctx.product.id))!;
      expect(course.lessons.map((l) => l.id)).toEqual(ids);
    }
  });
});
