import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

// Fresh migrated SQLite DB for the integration tests.
export default function setup() {
  for (const f of ["prisma/test.db", "prisma/test.db-journal"]) rmSync(f, { force: true });
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: "file:./prisma/test.db" },
  });
}
