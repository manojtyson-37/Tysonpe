import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";

// Demo data for local development only.
const DEMO_PASSWORD = "tysonpe-demo-1";

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed in production.");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const asha = await db.user.upsert({
    where: { email: "asha@demo.tysonpe.test" },
    update: {},
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

  await db.coupon.upsert({
    where: { creatorId_code: { creatorId: creator.id, code: "WELCOME20" } },
    update: {},
    create: { creatorId: creator.id, code: "WELCOME20", percentOff: 20 },
  });

  await db.user.upsert({
    where: { email: "learner@demo.tysonpe.test" },
    update: {},
    create: { email: "learner@demo.tysonpe.test", name: "Ravi Kumar", passwordHash },
  });

  console.log("Seeded. Demo logins: asha@demo.tysonpe.test (creator), learner@demo.tysonpe.test (learner).");
  console.log("Demo password is in prisma/seed.ts. Storefront: /c/asha-rao");
}

main().finally(() => db.$disconnect());
