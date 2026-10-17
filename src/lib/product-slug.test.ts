import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { db, isPostgres } from "@/lib/db";
import { makeCreatorWithProduct } from "@/test/factories";
import { RESERVED_PRODUCT_SLUGS, slugify } from "./handles";
import { pickProductSlug } from "./product-slug";

const none = async () => false;

describe("pickProductSlug", () => {
  it("returns the base slug when it is free", async () => {
    expect(await pickProductSlug("my-course", none)).toBe("my-course");
  });
  it("suffixes -2, -3 when the slug is taken", async () => {
    const taken = new Set(["my-course", "my-course-2"]);
    expect(await pickProductSlug("my-course", async (s) => taken.has(s))).toBe("my-course-3");
  });
  it("a product titled \"Community\" never gets the reserved slug", async () => {
    expect(RESERVED_PRODUCT_SLUGS.has("community")).toBe(true);
    expect(await pickProductSlug(slugify("Community"), none)).toBe("community-2");
  });
  it("skips a reserved slug even when asked for it directly, and still avoids taken ones", async () => {
    expect(await pickProductSlug("community", async (s) => s === "community-2")).toBe("community-3");
  });
});

describe("reserve_community_slug migration", () => {
  it("renames an existing product slugged 'community' and leaves others alone", async () => {
    const { creator, product: other } = await makeCreatorWithProduct();
    const clash = await db.product.create({ data: { creatorId: creator.id, slug: "community", type: "course", title: "Community", pricePaise: 0, status: "published" } });
    const dir = isPostgres ? join("prisma", "postgres", "migrations") : join("prisma", "migrations");
    const sql = readFileSync(join(process.cwd(), dir, "20261015140100_reserve_community_slug", "migration.sql"), "utf8");
    // Scoped to this creator's rows so concurrent test files are untouched.
    const scoped = sql.replace(/WHERE "slug" = 'community'/, `WHERE "slug" = 'community' AND "creatorId" = '${creator.id}'`);
    expect(scoped).not.toBe(sql);
    await db.$executeRawUnsafe(scoped);
    const after = await db.product.findUniqueOrThrow({ where: { id: clash.id } });
    expect(after.slug).toBe(`community-${clash.id.slice(-6)}`);
    expect(after.slug).not.toBe("community");
    expect((await db.product.findUniqueOrThrow({ where: { id: other.id } })).slug).toBe(other.slug);
  });
});
