import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";

// Demo data for local development only.
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "tysonpe-demo-1";

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed in production.");
  const target = process.env.DATABASE_URL ?? "";
  if (/^postgres(ql)?:\/\//.test(target)) {
    // Hosted database: the seed plants publicly known demo accounts, so only the demo project may be seeded.
    if (process.env.DEMO_DEPLOYMENT !== "1") throw new Error("Refusing to seed a hosted database without DEMO_DEPLOYMENT=1.");
    console.log(`Seeding hosted database at ${new URL(target).host}`);
  }
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const asha = await db.user.upsert({
    where: { email: "asha@demo.tysonpe.test" },
    update: { passwordHash },
    create: { email: "asha@demo.tysonpe.test", name: "Asha Rao", passwordHash },
  });
  const creator = await db.creator.upsert({
    where: { userId: asha.id },
    update: {},
    create: {
      userId: asha.id, handle: "asha-rao", displayName: "Asha Rao",
      bio: "Chartered accountant turned money coach. I help salaried professionals invest with confidence.",
      brandColor: "#0f766e",
    },
  });

  const products = [
    {
      slug: "personal-finance-masterclass", type: "course", title: "Personal Finance Masterclass",
      tagline: "Budget, invest and build wealth in 6 weeks.", pricePaise: 299900,
      description: "A practical, jargon-free course for working professionals.\n\nYou will learn how to:\n• Build a budget that sticks\n• Pick index funds and SIPs\n• Plan taxes the legal way",
      items: [
        { title: "Welcome & how this course works", kind: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
        { title: "Your money map (worksheet)", kind: "pdf", url: "https://example.com/money-map.pdf" },
        { title: "Week 1 reading: the 50-30-20 rule", kind: "text", body: "Split your take-home pay: 50% needs, 30% wants, 20% savings and investing.\n\nStart by tracking one full month of spending before changing anything." },
      ],
    },
    {
      slug: "wealth-circle", type: "membership", title: "Wealth Circle Membership",
      tagline: "Monthly Q&A and a private community of investors.", pricePaise: 49900, billing: "monthly",
      description: "Join a supportive circle of people working on their money goals.",
      items: [{ title: "Community invite link", kind: "link", url: "https://example.com/community" }],
    },
    {
      slug: "tax-saving-checklist", type: "download", title: "Tax-Saving Checklist 2026",
      tagline: "Every deduction, in one printable page.", pricePaise: 0, gstRatePct: 0,
      description: "A free checklist to make sure you don't leave deductions on the table.",
      items: [{ title: "Download the checklist", kind: "pdf", url: "https://example.com/tax-checklist.pdf" }],
    },
  ] as const;

  for (const p of products) {
    const { items, ...data } = p;
    const row = await db.product.upsert({
      where: { creatorId_slug: { creatorId: creator.id, slug: p.slug } },
      update: {},
      create: { ...data, creatorId: creator.id, status: "published" },
    });
    if ((await db.contentItem.count({ where: { productId: row.id } })) === 0) {
      await db.contentItem.createMany({
        data: items.map((it, position) => ({ url: "", body: "", ...it, productId: row.id, position })),
      });
    }
  }

  // Demo curriculum for the flagship course: sections, a drip lesson, a quiz, certificates on.
  const course = await db.product.findUniqueOrThrow({ where: { creatorId_slug: { creatorId: creator.id, slug: "personal-finance-masterclass" } } });
  if ((await db.section.count({ where: { productId: course.id } })) === 0) {
    await db.product.update({ where: { id: course.id }, data: { certificateEnabled: true } });
    const [s1, s2] = await Promise.all(
      ["Foundations", "Putting it into practice"].map((title, position) => db.section.create({ data: { productId: course.id, title, position } })),
    );
    const items = await db.contentItem.findMany({ where: { productId: course.id }, orderBy: { position: "asc" } });
    for (const [i, it] of items.entries()) await db.contentItem.update({ where: { id: it.id }, data: { sectionId: i < 2 ? s1.id : s2.id, position: i < 2 ? i : 0 } });
    await db.contentItem.create({
      data: {
        productId: course.id, sectionId: s2.id, title: "Week 2 reading: automating your savings", kind: "text", position: 1,
        body: "Set up a standing instruction on salary day so saving happens before spending.", dripType: "days_after_enroll", dripDays: 7,
      },
    });
    const quizItem = await db.contentItem.create({
      data: {
        productId: course.id, sectionId: s2.id, title: "Check your understanding", kind: "quiz", position: 2, dripType: "after_previous",
        quiz: {
          create: {
            passPct: 70, maxAttempts: 3, shuffle: true,
            questions: {
              create: [
                { position: 0, prompt: "In the 50-30-20 rule, what share goes to savings and investing?", kind: "single", explanation: "20% is reserved for savings and investing.",
                  options: { create: [{ position: 0, text: "10%", correct: false }, { position: 1, text: "20%", correct: true }, { position: 2, text: "50%", correct: false }] } },
                { position: 1, prompt: "Which are good habits? (pick all)", kind: "multi", explanation: "Track spending and automate savings.",
                  options: { create: [{ position: 0, text: "Track spending", correct: true }, { position: 1, text: "Automate savings", correct: true }, { position: 2, text: "Skip budgeting", correct: false }] } },
              ],
            },
          },
        },
      },
    });
    void quizItem;
  }

  await db.coupon.upsert({
    where: { creatorId_code: { creatorId: creator.id, code: "WELCOME20" } },
    update: {},
    create: { creatorId: creator.id, code: "WELCOME20", percentOff: 20 },
  });

  const learner = await db.user.upsert({
    where: { email: "learner@demo.tysonpe.test" },
    update: { passwordHash },
    create: { email: "learner@demo.tysonpe.test", name: "Ravi Kumar", passwordHash },
  });

  const demoOrder = await db.order.upsert({
    where: { providerOrderId: "order_mock_seed_ravi_course" },
    update: {},
    create: {
      userId: learner.id,
      productId: course.id,
      creatorId: creator.id,
      status: "paid",
      subtotalPaise: 299900,
      totalPaise: 353882,
      gstPaise: 53982,
      gstRatePct: 18,
      provider: "razorpay",
      providerOrderId: "order_mock_seed_ravi_course",
      providerPaymentId: "pay_mock_seed_ravi",
      paidAt: new Date(),
    },
  });

  await db.enrollment.upsert({
    where: { userId_productId: { userId: learner.id, productId: course.id } },
    update: {},
    create: {
      userId: learner.id,
      productId: course.id,
      orderId: demoOrder.id,
    },
  });

  // Demo community: open #general, a creator-only announcements channel, and a channel gated to the flagship course.
  if ((await db.channel.count({ where: { creatorId: creator.id } })) === 0) {
    const general = await db.channel.create({
      data: { creatorId: creator.id, name: "General", slug: "general", description: "Say hello and ask anything.", position: 0 },
    });
    const news = await db.channel.create({
      data: { creatorId: creator.id, name: "Announcements", slug: "announcements", description: "Updates from Asha.", kind: "announcement", position: 1 },
    });
    const qa = await db.channel.create({
      data: {
        creatorId: creator.id, name: "Masterclass Q&A", slug: "masterclass-q-a", description: "Questions about the Personal Finance Masterclass.",
        access: "product_gated", position: 2, products: { create: [{ productId: course.id }] },
      },
    });
    await db.post.createMany({
      data: [
        { channelId: news.id, authorId: asha.id, title: "Welcome to the community", body: "This is where we talk money and answer questions. Be kind, stay curious.", pinned: true },
        { channelId: general.id, authorId: learner.id, body: "Finished week 1. The 50-30-20 worksheet made my budget click." },
        { channelId: qa.id, authorId: learner.id, title: "SIP date vs salary date?", body: "Should my SIP date match my salary date, or a few days later?" },
      ],
    });
  }

  console.log("Seeded. Demo logins:asha@demo.tysonpe.test (creator), learner@demo.tysonpe.test (learner).");
  console.log("Demo password is in prisma/seed.ts. Storefront: /c/asha-rao");
}

main().finally(() => db.$disconnect());
