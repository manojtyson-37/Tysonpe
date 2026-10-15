import { db } from "@/lib/db";

let seq = 0;
const uid = () => `${Date.now().toString(36)}${(++seq).toString(36)}`;

export async function makeUser(name = "Learner") {
  return db.user.create({ data: { email: `u${uid()}@t.test`, name, passwordHash: "x" } });
}

export async function makeCreatorWithProduct(over: Record<string, unknown> = {}) {
  const user = await makeUser("Creator Person");
  const creator = await db.creator.create({
    data: { userId: user.id, handle: `c${uid()}`, displayName: "Creator Co" },
  });
  const product = await db.product.create({
    data: { creatorId: creator.id, slug: `p${uid()}`, type: "course", title: "Course", pricePaise: 100000, status: "published", ...over },
  });
  return { user, creator, product };
}

export async function enroll(userId: string, productId: string, createdAt = new Date()) {
  const creator = await db.product.findUniqueOrThrow({ where: { id: productId }, select: { creatorId: true } });
  const order = await db.order.create({
    data: {
      userId, productId, creatorId: creator.creatorId, status: "paid", subtotalPaise: 100000, totalPaise: 100000,
      gstPaise: 15254, gstRatePct: 18, provider: "mock", providerOrderId: `order_${uid()}`, paidAt: new Date(),
    },
  });
  return db.enrollment.create({ data: { userId, productId, orderId: order.id, createdAt } });
}

export async function addItem(productId: string, over: Record<string, unknown> = {}) {
  return db.contentItem.create({
    data: { productId, title: `Lesson ${uid()}`, kind: "text", body: "secret body text", position: 0, ...over },
  });
}

/** Quiz lesson with questions; option "ok*" are correct. */
export async function addQuiz(productId: string, opts: { passPct?: number; maxAttempts?: number | null; position?: number; sectionId?: string } = {}) {
  const item = await addItem(productId, { kind: "quiz", body: "", position: opts.position ?? 0, sectionId: opts.sectionId });
  const quiz = await db.quiz.create({
    data: {
      itemId: item.id, passPct: opts.passPct ?? 70, maxAttempts: opts.maxAttempts ?? null,
      questions: {
        create: [
          { position: 0, prompt: "Capital of France?", kind: "single", explanation: "Paris is the capital.",
            options: { create: [{ position: 0, text: "Paris", correct: true }, { position: 1, text: "Rome", correct: false }] } },
          { position: 1, prompt: "Pick primes", kind: "multi", explanation: "2 and 3.",
            options: { create: [{ position: 0, text: "2", correct: true }, { position: 1, text: "3", correct: true }, { position: 2, text: "4", correct: false }] } },
        ],
      },
    },
    include: { questions: { include: { options: true } } },
  });
  const answers = (right: boolean) =>
    Object.fromEntries(
      quiz.questions.map((qq) => [qq.id, qq.options.filter((o) => o.correct === right).map((o) => o.id)]),
    );
  return { item, quiz, correctAnswers: answers(true), wrongAnswers: answers(false) };
}

export async function makeChannel(creatorId: string, over: Record<string, unknown> = {}) {
  const n = uid();
  return db.channel.create({
    data: { creatorId, name: `Channel ${n}`, slug: `ch-${n}`, kind: "discussion", access: "open", ...over },
  });
}

export async function makePost(channelId: string, authorId: string, over: Record<string, unknown> = {}) {
  return db.post.create({ data: { channelId, authorId, body: "Hello community", ...over } });
}
