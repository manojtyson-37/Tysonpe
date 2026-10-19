import "dotenv/config";
import bcrypt from "bcryptjs";
import { Client } from "pg";
import { db } from "../src/lib/db";
import { readFileSync, existsSync } from "node:fs";

export const FRESH_CUSTOMERS = [
  { email: "priya@demo.tysonpe.test", name: "Priya Sharma", phone: "9876500001" },
  { email: "rohan@demo.tysonpe.test", name: "Rohan Mehta", phone: "9876500002" },
  { email: "ananya@demo.tysonpe.test", name: "Ananya Iyer", phone: "9876500003" },
  { email: "vikram@demo.tysonpe.test", name: "Vikram Patel", phone: "9876500004" },
  { email: "neha@demo.tysonpe.test", name: "Neha Verma", phone: "9876500005" },
  { email: "kabir@demo.tysonpe.test", name: "Kabir Das", phone: "9876500006" },
];

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "tysonpe-demo-1";

async function seedLocalSqlite(passwordHash: string) {
  console.log("--> Seeding local SQLite database...");
  for (const c of FRESH_CUSTOMERS) {
    const user = await db.user.upsert({
      where: { email: c.email },
      update: { name: c.name, passwordHash },
      create: {
        email: c.email,
        name: c.name,
        passwordHash,
        preferredGateway: "razorpay",
      },
    });
    console.log(`  [SQLite] Upserted: ${user.name} (${user.email}) [ID: ${user.id}]`);
  }
}

async function seedNeonPostgres(passwordHash: string) {
  let pgUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!pgUrl || !pgUrl.startsWith("postgres")) {
    if (existsSync(".env.vercel")) {
      const vercelEnv = readFileSync(".env.vercel", "utf8");
      const match = vercelEnv.match(/DATABASE_URL="([^"]+)"/);
      if (match) pgUrl = match[1];
    }
  }

  if (!pgUrl || !pgUrl.startsWith("postgres")) {
    console.log("No Postgres connection string found. Skipping Neon Postgres seeding.");
    return;
  }

  console.log("--> Seeding Neon Postgres production database...");
  const client = new Client({ connectionString: pgUrl });
  await client.connect();

  try {
    for (const c of FRESH_CUSTOMERS) {
      // Generate a cuid-like ID if row doesn't exist
      const generatedId = `cmv${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`;
      const res = await client.query(
        `INSERT INTO "User" ("id", "email", "name", "passwordHash", "preferredGateway", "createdAt")
         VALUES ($1, $2, $3, $4, 'razorpay', NOW())
         ON CONFLICT ("email") DO UPDATE
         SET "name" = EXCLUDED."name", "passwordHash" = EXCLUDED."passwordHash"
         RETURNING "id", "email", "name";`,
        [generatedId, c.email, c.name, passwordHash]
      );
      const row = res.rows[0];
      console.log(`  [Neon] Upserted: ${row.name} (${row.email}) [ID: ${row.id}]`);

      // Verify that this user has NO enrollments
      const enrollCheck = await client.query(
        `SELECT count(*)::int as count FROM "Enrollment" WHERE "userId" = $1;`,
        [row.id]
      );
      const enrollCount = enrollCheck.rows[0]?.count ?? 0;
      if (enrollCount > 0) {
        console.warn(`  ⚠️ Warning: User ${row.email} has ${enrollCount} existing enrollments!`);
      } else {
        console.log(`  ✓ Verified 0 enrollments for ${row.name} (Clean checkout test ready)`);
      }
    }
  } finally {
    await client.end();
  }
}

async function main() {
  console.log(`Generating password hash for "${DEMO_PASSWORD}"...`);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await seedLocalSqlite(passwordHash);
  await seedNeonPostgres(passwordHash);

  console.log("\n✅ All 6 fresh customer accounts ready for testing!");
}

main()
  .catch((err) => {
    console.error("Error seeding fresh customers:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
