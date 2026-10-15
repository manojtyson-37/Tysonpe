import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { TEST_DB_FILE, TEST_DB_URL } from "./db-path";

const files = () => [TEST_DB_FILE, `${TEST_DB_FILE}-journal`, `${TEST_DB_FILE}-wal`, `${TEST_DB_FILE}-shm`];

// Fresh migrated SQLite DB for the integration tests, private to this run.
export default function setup() {
  for (const f of files()) rmSync(f, { force: true });
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
  });
  return () => {
    for (const f of files()) rmSync(f, { force: true });
  };
}
