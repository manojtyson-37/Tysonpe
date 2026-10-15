import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { Client } from "pg";
import { TEST_DB_FILE, TEST_DB_IS_POSTGRES, TEST_DB_URL } from "./db-path";

const files = () => [TEST_DB_FILE, `${TEST_DB_FILE}-journal`, `${TEST_DB_FILE}-wal`, `${TEST_DB_FILE}-shm`];

// Fresh migrated database for the integration tests, private to this run.
export default async function setup() {
  // DATABASE_URL_UNPOOLED is blanked: prisma.config prefers it, and a stray hosted value must never be migrated by tests.
  const env = { ...process.env, DATABASE_URL: TEST_DB_URL, DATABASE_URL_UNPOOLED: "" };
  if (TEST_DB_IS_POSTGRES) {
    // Opt-in only (TEST_DATABASE_URL): wipe the public schema of a throwaway database, then migrate.
    // Refuse anything that is not local unless explicitly confirmed, so a pasted production URL can never be wiped.
    const u = new URL(TEST_DB_URL);
    const host = u.hostname;
    // pg lets a ?host= query parameter override the URL host, so that is treated as non-local too.
    const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host) && !u.searchParams.has("host");
    if (!local && process.env.TEST_DB_WIPE_OK !== "1")
      throw new Error(`Refusing to wipe ${host}: TEST_DATABASE_URL must be local (or set TEST_DB_WIPE_OK=1 for a throwaway DB).`);
    const client = new Client({ connectionString: TEST_DB_URL });
    await client.connect();
    try {
      await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
    } finally {
      await client.end();
    }
    execSync("npx prisma migrate deploy", { stdio: "pipe", env });
    return;
  }
  for (const f of files()) rmSync(f, { force: true });
  execSync("npx prisma migrate deploy", { stdio: "pipe", env });
  return () => {
    for (const f of files()) rmSync(f, { force: true });
  };
}
