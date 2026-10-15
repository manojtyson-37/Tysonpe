import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { makeChannel, makeCreatorWithProduct, makePost, makeUser } from "@/test/factories";

describe("community schema", () => {
  it("creator defaults to gamification on", async () => {
    const { creator } = await makeCreatorWithProduct();
    expect(creator.gamificationEnabled).toBe(true);
  });

  it("channel slug is unique per creator but reusable across creators", async () => {
    const a = await makeCreatorWithProduct();
    const b = await makeCreatorWithProduct();
    await makeChannel(a.creator.id, { slug: "general" });
    await expect(makeChannel(a.creator.id, { slug: "general" })).rejects.toMatchObject({ code: "P2002" });
    await expect(makeChannel(b.creator.id, { slug: "general" })).resolves.toBeTruthy();
  });

  it("one like per user per post, enforced by the database", async () => {
    const { creator } = await makeCreatorWithProduct();
    const ch = await makeChannel(creator.id);
    const author = await makeUser();
    const liker = await makeUser();
    const post = await makePost(ch.id, author.id);
    await db.like.create({ data: { userId: liker.id, postId: post.id } });
    await expect(db.like.create({ data: { userId: liker.id, postId: post.id } })).rejects.toMatchObject({ code: "P2002" });
  });

  it("point events are unique per user, creator, kind and ref", async () => {
    const { creator } = await makeCreatorWithProduct();
    const u = await makeUser();
    const data = { userId: u.id, creatorId: creator.id, kind: "lesson_complete", points: 10, refId: "item1" };
    await db.pointEvent.create({ data });
    await expect(db.pointEvent.create({ data })).rejects.toMatchObject({ code: "P2002" });
  });

  it("deleting a channel cascades to posts, comments and likes", async () => {
    const { creator } = await makeCreatorWithProduct();
    const ch = await makeChannel(creator.id);
    const u = await makeUser();
    const post = await makePost(ch.id, u.id);
    const c = await db.comment.create({ data: { postId: post.id, authorId: u.id, body: "hi" } });
    await db.like.create({ data: { userId: u.id, commentId: c.id } });
    await db.channel.delete({ where: { id: ch.id } });
    expect(await db.post.count({ where: { id: post.id } })).toBe(0);
    expect(await db.comment.count({ where: { id: c.id } })).toBe(0);
    expect(await db.like.count({ where: { commentId: c.id } })).toBe(0);
  });
});
