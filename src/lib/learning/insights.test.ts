import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { addItem, enroll, makeCreatorWithProduct, makeUser } from "@/test/factories";
import { getCourseInsights } from "./insights";
import { markComplete } from "./service";

describe("getCourseInsights", () => {
  it("reports enrolment, completion rate and per-lesson completion", async () => {
    const { product } = await makeCreatorWithProduct({ certificateEnabled: true });
    const a = await addItem(product.id, { title: "A", position: 0 });
    const b = await addItem(product.id, { title: "B", position: 1 });
    await addItem(product.id, { title: "Optional", position: 2, requiredForCompletion: false });
    const [u1, u2, u3] = await Promise.all([makeUser(), makeUser(), makeUser()]);
    for (const u of [u1, u2, u3]) await enroll(u.id, product.id);
    await markComplete(u1.id, a.id); await markComplete(u1.id, b.id); // finished
    await markComplete(u2.id, a.id);                                   // halfway
    const r = await getCourseInsights(product.id);
    expect(r.enrolled).toBe(3);
    expect(r.completed).toBe(1);
    expect(r.completionPct).toBe(33);
    expect(r.certificates).toBe(1);
    const byTitle = Object.fromEntries(r.lessons.map((l) => [l.title, l]));
    expect(byTitle.A).toMatchObject({ completedCount: 2, pct: 67 });
    expect(byTitle.B).toMatchObject({ completedCount: 1, pct: 33 });
    expect(byTitle.Optional).toMatchObject({ completedCount: 0, pct: 0 });
  });

  it("ignores progress from learners who are no longer enrolled (refunded)", async () => {
    const { product } = await makeCreatorWithProduct();
    const a = await addItem(product.id, { position: 0 });
    const gone = await makeUser();
    const e = await enroll(gone.id, product.id);
    await markComplete(gone.id, a.id);
    await db.enrollment.delete({ where: { id: e.id } });
    const r = await getCourseInsights(product.id);
    expect(r.enrolled).toBe(0);
    expect(r.lessons[0].completedCount).toBe(0);
    expect(r.completionPct).toBe(0);
  });

  it("an empty course reports zeros without dividing by zero", async () => {
    const { product } = await makeCreatorWithProduct();
    expect(await getCourseInsights(product.id)).toMatchObject({ enrolled: 0, completed: 0, completionPct: 0, certificates: 0, lessons: [] });
  });
});
