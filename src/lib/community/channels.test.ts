import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { enroll, makeChannel, makeCreatorWithProduct, makeUser } from "@/test/factories";
import {
  createChannel, deleteChannel, ensureDefaultChannel, getChannelFor, listChannelsAdmin, listChannelsFor,
  moveChannel, setChannelProducts, updateChannel,
} from "./channels";
import { loadViewer, resolveCommunity } from "./viewer";

let ctx: Awaited<ReturnType<typeof setup>>;
async function setup() {
  const { user: creatorUser, creator, product } = await makeCreatorWithProduct();
  const learner = await makeUser("Meera Learner");
  return { creatorUser, creator, product, learner };
}
beforeEach(async () => {
  ctx = await setup();
});

describe("loadViewer / resolveCommunity", () => {
  it("anonymous and unenrolled viewers have no enrolments", async () => {
    expect(await loadViewer(ctx.creator.id, null)).toEqual({ isCreator: false, banned: false, enrolledProductIds: [] });
    expect((await loadViewer(ctx.creator.id, ctx.learner.id)).enrolledProductIds).toEqual([]);
  });
  it("lists only this creator's enrolled products, and flags the creator and bans", async () => {
    await enroll(ctx.learner.id, ctx.product.id);
    const other = await makeCreatorWithProduct();
    await enroll(ctx.learner.id, other.product.id);
    expect((await loadViewer(ctx.creator.id, ctx.learner.id)).enrolledProductIds).toEqual([ctx.product.id]);
    expect((await loadViewer(ctx.creator.id, ctx.creatorUser.id)).isCreator).toBe(true);
    await db.communityBan.create({ data: { creatorId: ctx.creator.id, userId: ctx.learner.id } });
    expect((await loadViewer(ctx.creator.id, ctx.learner.id)).banned).toBe(true);
  });
  it("resolveCommunity finds a creator by handle (case-insensitive) or returns null", async () => {
    const r = await resolveCommunity(ctx.creator.handle.toUpperCase(), ctx.learner.id);
    expect(r?.creator.id).toBe(ctx.creator.id);
    expect(await resolveCommunity("nope-nope", ctx.learner.id)).toBeNull();
  });
});

describe("createChannel / validation", () => {
  it("creates with a slug derived from the name and suffixes duplicates", async () => {
    const a = await createChannel(ctx.creator.id, { name: "Masterclass Q&A", kind: "discussion", access: "open" });
    const b = await createChannel(ctx.creator.id, { name: "Masterclass Q&A", kind: "discussion", access: "open" });
    expect(a.slug).toBe("masterclass-q-a");
    expect(b.slug).toBe("masterclass-q-a-2");
  });
  it("never produces a slug that collides with a fixed route", async () => {
    const c = await createChannel(ctx.creator.id, { name: "Leaderboard", kind: "discussion", access: "open" });
    expect(c.slug).toBe("leaderboard-2");
  });
  it("rejects invalid input with a validation error", async () => {
    await expect(createChannel(ctx.creator.id, { name: "", kind: "discussion", access: "open" })).rejects.toMatchObject({ code: "invalid" });
    await expect(createChannel(ctx.creator.id, { name: "x", kind: "chat", access: "open" })).rejects.toMatchObject({ code: "invalid" });
  });
  it("appends new channels after existing ones", async () => {
    const a = await createChannel(ctx.creator.id, { name: "One", kind: "discussion", access: "open" });
    const b = await createChannel(ctx.creator.id, { name: "Two", kind: "discussion", access: "open" });
    expect(b.id).not.toBe(a.id);
    expect((await listChannelsAdmin(ctx.creator.id)).map((c) => c.slug)).toEqual(["one", "two"]);
  });
});

describe("ensureDefaultChannel", () => {
  it("creates #general once and never again", async () => {
    await ensureDefaultChannel(ctx.creator.id);
    await ensureDefaultChannel(ctx.creator.id);
    const all = await listChannelsAdmin(ctx.creator.id);
    expect(all.map((c) => [c.slug, c.access, c.kind])).toEqual([["general", "open", "discussion"]]);
  });
  it("does not recreate #general after the creator deleted it and made other channels", async () => {
    await ensureDefaultChannel(ctx.creator.id);
    await createChannel(ctx.creator.id, { name: "Other", kind: "discussion", access: "open" });
    const g = (await listChannelsAdmin(ctx.creator.id)).find((c) => c.slug === "general")!;
    await deleteChannel(ctx.creator.id, g.id);
    await ensureDefaultChannel(ctx.creator.id);
    expect((await listChannelsAdmin(ctx.creator.id)).map((c) => c.slug)).toEqual(["other"]);
  });
});

describe("gating and listing", () => {
  it("members see open channels; gated channels need a linked product", async () => {
    await enroll(ctx.learner.id, ctx.product.id);
    const open = await makeChannel(ctx.creator.id, { slug: "open-one", position: 0 });
    const gated = await makeChannel(ctx.creator.id, { slug: "vip", access: "product_gated", position: 1 });
    const v = await loadViewer(ctx.creator.id, ctx.learner.id);
    expect((await listChannelsFor(ctx.creator.id, v)).map((c) => c.slug)).toEqual(["open-one"]);
    await setChannelProducts(ctx.creator.id, gated.id, [ctx.product.id]);
    expect((await listChannelsFor(ctx.creator.id, v)).map((c) => c.slug)).toEqual(["open-one", "vip"]);
    expect((await getChannelFor(ctx.creator.id, "vip", v))?.productIds).toEqual([ctx.product.id]);
    expect(open.id).toBeTruthy();
  });
  it("non-members and strangers get null for any channel, gated or open", async () => {
    await makeChannel(ctx.creator.id, { slug: "open-one" });
    const v = await loadViewer(ctx.creator.id, ctx.learner.id);
    expect(await getChannelFor(ctx.creator.id, "open-one", v)).toBeNull();
    expect(await listChannelsFor(ctx.creator.id, v)).toEqual([]);
  });
  it("a refund (enrolment deleted) ends access immediately", async () => {
    const e = await enroll(ctx.learner.id, ctx.product.id);
    await makeChannel(ctx.creator.id, { slug: "open-one" });
    expect(await listChannelsFor(ctx.creator.id, await loadViewer(ctx.creator.id, ctx.learner.id))).toHaveLength(1);
    await db.enrollment.delete({ where: { id: e.id } });
    expect(await listChannelsFor(ctx.creator.id, await loadViewer(ctx.creator.id, ctx.learner.id))).toHaveLength(0);
  });
  it("a banned member sees nothing; the creator sees everything", async () => {
    await enroll(ctx.learner.id, ctx.product.id);
    await makeChannel(ctx.creator.id, { slug: "open-one" });
    await makeChannel(ctx.creator.id, { slug: "vip", access: "product_gated" });
    await db.communityBan.create({ data: { creatorId: ctx.creator.id, userId: ctx.learner.id } });
    expect(await listChannelsFor(ctx.creator.id, await loadViewer(ctx.creator.id, ctx.learner.id))).toEqual([]);
    expect(await listChannelsFor(ctx.creator.id, await loadViewer(ctx.creator.id, ctx.creatorUser.id))).toHaveLength(2);
  });
});

describe("creator-scoped mutations", () => {
  it("a creator cannot link another creator's product, nor touch another creator's channel", async () => {
    const other = await makeCreatorWithProduct();
    const mine = await makeChannel(ctx.creator.id, { access: "product_gated" });
    await expect(setChannelProducts(ctx.creator.id, mine.id, [other.product.id])).rejects.toMatchObject({ code: "not_found" });
    const theirs = await makeChannel(other.creator.id);
    await expect(updateChannel(ctx.creator.id, theirs.id, { name: "Hijack", kind: "discussion", access: "open" })).rejects.toMatchObject({ code: "not_found" });
    await expect(deleteChannel(ctx.creator.id, theirs.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(setChannelProducts(ctx.creator.id, theirs.id, [])).rejects.toMatchObject({ code: "not_found" });
  });
  it("setChannelProducts replaces the link set", async () => {
    const second = await db.product.create({ data: { creatorId: ctx.creator.id, slug: "second", type: "course", title: "Second", pricePaise: 0, status: "published" } });
    const ch = await makeChannel(ctx.creator.id, { access: "product_gated" });
    await setChannelProducts(ctx.creator.id, ch.id, [ctx.product.id, second.id]);
    await setChannelProducts(ctx.creator.id, ch.id, [second.id]);
    expect((await listChannelsAdmin(ctx.creator.id))[0].productIds).toEqual([second.id]);
  });
  it("updateChannel changes fields but keeps the slug stable", async () => {
    const ch = await createChannel(ctx.creator.id, { name: "Old name", kind: "discussion", access: "open" });
    const up = await updateChannel(ctx.creator.id, ch.id, { name: "New name", description: "Hi", kind: "announcement", access: "open" });
    expect(up).toMatchObject({ name: "New name", slug: "old-name", kind: "announcement", description: "Hi" });
  });
  it("moveChannel swaps order and ignores moves past the ends", async () => {
    const a = await createChannel(ctx.creator.id, { name: "A", kind: "discussion", access: "open" });
    const b = await createChannel(ctx.creator.id, { name: "B", kind: "discussion", access: "open" });
    await moveChannel(ctx.creator.id, b.id, "up");
    expect((await listChannelsAdmin(ctx.creator.id)).map((c) => c.slug)).toEqual(["b", "a"]);
    await moveChannel(ctx.creator.id, b.id, "up");
    expect((await listChannelsAdmin(ctx.creator.id)).map((c) => c.slug)).toEqual(["b", "a"]);
    expect(a.id).toBeTruthy();
  });
  it("deleteChannel removes its posts", async () => {
    const ch = await makeChannel(ctx.creator.id);
    await db.post.create({ data: { channelId: ch.id, authorId: ctx.learner.id, body: "x" } });
    await deleteChannel(ctx.creator.id, ch.id);
    expect(await db.post.count({ where: { channelId: ch.id } })).toBe(0);
  });
  it("deleteChannel also removes the points its posts and comments earned", async () => {
    const ch = await makeChannel(ctx.creator.id);
    const post = await db.post.create({ data: { channelId: ch.id, authorId: ctx.learner.id, body: "x" } });
    const comment = await db.comment.create({ data: { postId: post.id, authorId: ctx.learner.id, body: "y" } });
    for (const [kind, id] of [["post_created", post.id], ["comment_created", comment.id]] as const) {
      await db.pointEvent.create({ data: { userId: ctx.learner.id, creatorId: ctx.creator.id, kind, points: 1, refId: id, sourceId: id } });
    }
    await deleteChannel(ctx.creator.id, ch.id);
    expect(await db.pointEvent.count({ where: { userId: ctx.learner.id } })).toBe(0);
  });
  it("createChannel with someone else's product creates nothing", async () => {
    const other = await makeCreatorWithProduct();
    await expect(
      createChannel(ctx.creator.id, { name: "Gated", kind: "discussion", access: "product_gated" }, [other.product.id]),
    ).rejects.toMatchObject({ code: "not_found" });
    expect(await listChannelsAdmin(ctx.creator.id)).toEqual([]);
  });
  it("createChannel links products; updateChannel replaces them, changes nothing on failure, and clears them when the channel opens", async () => {
    const ch = await createChannel(ctx.creator.id, { name: "Gated", kind: "discussion", access: "product_gated" }, [ctx.product.id]);
    expect(ch.productIds).toEqual([ctx.product.id]);
    await expect(
      updateChannel(ctx.creator.id, ch.id, { name: "Renamed", kind: "discussion", access: "product_gated" }, ["nope"]),
    ).rejects.toMatchObject({ code: "not_found" });
    const unchanged = (await listChannelsAdmin(ctx.creator.id))[0];
    expect([unchanged.name, unchanged.productIds]).toEqual(["Gated", [ctx.product.id]]);
    const open = await updateChannel(ctx.creator.id, ch.id, { name: "Gated", kind: "discussion", access: "open" }, [ctx.product.id]);
    expect(open.productIds).toEqual([]);
  });
  it("ensureDefaultChannel is safe to call concurrently", async () => {
    await Promise.all([ensureDefaultChannel(ctx.creator.id), ensureDefaultChannel(ctx.creator.id), ensureDefaultChannel(ctx.creator.id)]);
    expect(await listChannelsAdmin(ctx.creator.id)).toHaveLength(1);
  });
});
