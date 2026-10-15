import "dotenv/config";
import { defineConfig } from "prisma/config";

// DATABASE_URL picks the dialect: postgres(ql):// uses the generated Postgres schema + migrations (hosted),
// anything else (file:...) uses the SQLite schema + migrations (local dev and tests).
const url = process.env["DATABASE_URL"];
const isPostgres = !!url && /^postgres(ql)?:\/\//.test(url);

export default defineConfig({
  schema: isPostgres ? "prisma/postgres/schema.prisma" : "prisma/schema.prisma",
  migrations: {
    path: isPostgres ? "prisma/postgres/migrations" : "prisma/migrations",
  },
  datasource: { url },
});
