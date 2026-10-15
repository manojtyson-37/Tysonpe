import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { markComplete, submitQuiz } from "@/lib/learning/service";
import { addItem, addQuiz, enroll, makeCreatorWithProduct, makeUser } from "@/test/factories";

let failAward = false;
vi.mock("./service", async (orig) => {
  const mod = await orig<typeof import("./service")>();
  return {
    ...mod,
    awardPoints: (...a: Parameters<typeof mod.awardPoints>) => {
      if (failAward) throw new Error("boom");
      return mod.awardPoints(...a);
    },
  };
});

let ctx: Awaited<ReturnType<typeof setup>>;
async function setup() {
  const { creator, product } = await makeCreatorWithProduct();
  const learner = await makeUser("Meera Learner");
  await enroll(learner.id, product.id);
  return { creator, product, learner };
}
beforeEach(async () => {
  failAward = false;
  ctx = await setup();
});
const points = () => db.pointEvent.aggregate({ where: { userId: ctx.learner.id }, _sum: { points: true } }).then((r) => r._sum.points ?? 0);

describe("learning hooks", () => {
  it("completing a lesson awards 10 points once, even if marked complete twice", async () => {
    const a = await addItem(ctx.product.id, { position: 0 });
    await addItem(ctx.product.id, { position: 1 });
    await markComplete(ctx.learner.id, a.id);
    await markComplete(ctx.learner.id, a.id);
    expect(await points()).toBe(10);
    expect(await db.userBadge.findFirst({ where: { userId: ctx.learner.id, badgeKey: "first_lesson" } })).toBeTruthy();
  });

  it("finishing the last required lesson also awards course_complete (+100) and its badge", async () => {
    const a = await addItem(ctx.product.id, { position: 0 });
    await markComplete(ctx.learner.id, a.id);
    expect(await points()).toBe(110);
    expect(await db.userBadge.findFirst({ where: { userId: ctx.learner.id, badgeKey: "course_complete" } })).toBeTruthy();
  });

  it("optional lessons still give lesson points but never block course_complete", async () => {
    const req = await addItem(ctx.product.id, { position: 0 });
    const opt = await addItem(ctx.product.id, { position: 1, requiredForCompletion: false });
    await markComplete(ctx.learner.id, opt.id);
    expect(await points()).toBe(10);
    await markComplete(ctx.learner.id, req.id);
    expect(await points()).toBe(120);
  });

  it("a failed quiz attempt awards nothing; passing awards quiz_pass once", async () => {
    const { item, correctAnswers, wrongAnswers } = await addQuiz(ctx.product.id);
    await addItem(ctx.product.id, { position: 5 }); // keep the course incomplete
    await submitQuiz(ctx.learner.id, item.id, wrongAnswers);
    expect(await points()).toBe(0);
    await submitQuiz(ctx.learner.id, item.id, correctAnswers);
    expect(await points()).toBe(25);
  });

  it("learning still succeeds when awarding throws", async () => {
    const a = await addItem(ctx.product.id, { position: 0 });
    failAward = true;
    await expect(markComplete(ctx.learner.id, a.id)).resolves.toEqual({ ok: true });
    expect(await db.lessonProgress.count({ where: { userId: ctx.learner.id, itemId: a.id } })).toBe(1);
    expect(await points()).toBe(0);
  });

  it("no points when the creator has gamification off", async () => {
    await db.creator.update({ where: { id: ctx.creator.id }, data: { gamificationEnabled: false } });
    const a = await addItem(ctx.product.id, { position: 0 });
    await markComplete(ctx.learner.id, a.id);
    expect(await points()).toBe(0);
  });
});
