import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const isPostgres = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "");

// postgres(ql):// (hosted) -> Postgres adapter; file: (local dev, tests) -> SQLite adapter.
function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const adapter = isPostgres
    ? new PrismaPg({ connectionString: url, max: 5 }) // small pool: one per serverless instance
    : new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? create();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * Serialize concurrent transactions that touch the same logical key (check-then-insert races).
 * Postgres: transaction-scoped advisory lock, released at commit/rollback. SQLite: writers are already serialized
 * by the single connection, so this is a no-op there.
 */
export async function lockKey(tx: Tx, key: string) {
  if (isPostgres) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}
