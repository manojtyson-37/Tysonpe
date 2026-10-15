import "dotenv/config";
import { defineConfig } from "prisma/config";

// DATABASE_URL picks the dialect: postgres(ql):// uses the generated Postgres schema + migrations (hosted),
// anything else (file:...) uses the SQLite schema + migrations (local dev and tests).
// Migrations need a direct connection: hosted providers (Neon, Vercel Postgres) expose it as DATABASE_URL_UNPOOLED,
// while the app itself uses the pooled DATABASE_URL at runtime.
const url = process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"];
const isPostgres = !!url && /^postgres(ql)?:\/\//.test(url);

export default defineConfig({
  schema: isPostgres ? "prisma/postgres/schema.prisma" : "prisma/schema.prisma",
  migrations: {
    path: isPostgres ? "prisma/postgres/migrations" : "prisma/migrations",
  },
  datasource: { url },
});
