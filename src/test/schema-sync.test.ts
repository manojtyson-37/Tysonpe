import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("postgres schema", () => {
  it("is generated from prisma/schema.prisma and not stale (run npm run db:sync-pg)", () => {
    const out = execFileSync("node", ["scripts/sync-postgres-schema.mjs", "--check"], { encoding: "utf8" });
    expect(out).toContain("in sync");
  });
});
