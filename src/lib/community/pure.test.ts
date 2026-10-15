import { describe, expect, it } from "vitest";
import { canAccessChannel, canComment, canModerate, canPost, type ChannelAccessInfo, type Viewer } from "./access";
import { checkRate } from "./limits";
import { LIMITS, channelSchema, channelSlug, cleanText, commentSchema, postSchema } from "./validation";

const open: ChannelAccessInfo = { access: "open", kind: "discussion", productIds: [] };
const gated: ChannelAccessInfo = { access: "product_gated", kind: "discussion", productIds: ["p1", "p2"] };
const announce: ChannelAccessInfo = { access: "open", kind: "announcement", productIds: [] };
const viewer = (o: Partial<Viewer> = {}): Viewer => ({ isCreator: false, banned: false, enrolledProductIds: [], ...o });

describe("canAccessChannel", () => {
  it("open: needs at least one enrolment with this creator", () => {
    expect(canAccessChannel(open, viewer())).toBe(false);
    expect(canAccessChannel(open, viewer({ enrolledProductIds: ["zzz"] }))).toBe(true);
  });
  it("gated: needs an enrolment in a linked product", () => {
    expect(canAccessChannel(gated, viewer({ enrolledProductIds: ["other"] }))).toBe(false);
    expect(canAccessChannel(gated, viewer({ enrolledProductIds: ["p2"] }))).toBe(true);
  });
  it("gated with no linked products is creator-only", () => {
    const empty: ChannelAccessInfo = { access: "product_gated", kind: "discussion", productIds: [] };
    expect(canAccessChannel(empty, viewer({ enrolledProductIds: ["p1"] }))).toBe(false);
    expect(canAccessChannel(empty, viewer({ isCreator: true }))).toBe(true);
  });
  it("the creator always has access, even if (somehow) flagged banned", () => {
    expect(canAccessChannel(gated, viewer({ isCreator: true, banned: true }))).toBe(true);
  });
  it("banned members have no access even when enrolled", () => {
    expect(canAccessChannel(open, viewer({ banned: true, enrolledProductIds: ["p1"] }))).toBe(false);
    expect(canAccessChannel(gated, viewer({ banned: true, enrolledProductIds: ["p1"] }))).toBe(false);
  });
});

describe("canPost / canComment / canModerate", () => {
  const member = viewer({ enrolledProductIds: ["p1"] });
  it("members post in discussion channels only", () => {
    expect(canPost(open, member)).toBe(true);
    expect(canPost(announce, member)).toBe(false);
  });
  it("the creator posts in announcement channels", () => {
    expect(canPost(announce, viewer({ isCreator: true }))).toBe(true);
  });
  it("members can still comment in announcement channels", () => {
    expect(canComment(announce, member)).toBe(true);
  });
  it("no access means no posting or commenting", () => {
    expect(canPost(open, viewer())).toBe(false);
    expect(canComment(open, viewer())).toBe(false);
  });
  it("only the creator moderates", () => {
    expect(canModerate(viewer({ isCreator: true }))).toBe(true);
    expect(canModerate(member)).toBe(false);
  });
});

describe("cleanText", () => {
  it("normalises newlines, strips control chars, collapses blank runs, trims", () => {
    expect(cleanText("  a\r\nb\u0000\u0007c\n\n\n\n d  ")).toBe("a\nbc\n\n d");
  });
  it("turns tabs into spaces instead of gluing words together", () => {
    expect(cleanText("a\tb")).toBe("a b");
  });
  it("strips zero-width and bidi-control characters", () => {
    expect(cleanText("a\u200Bb\u200E\u200Fc\u202A\u202B\u202C\u202D\u202Ed\u2060\u2061\u2062\u2063\u2064e\u2066\u2067\u2068\u2069f\uFEFFg")).toBe("abcdefg");
  });
  it("keeps ZWNJ and ZWJ (needed by Indic scripts and emoji sequences)", () => {
    expect(cleanText("a\u200Cb\u200Dc")).toBe("a\u200Cb\u200Dc");
    expect(cleanText("\u0D95\u0DCA\u200D\u0DBB")).toBe("\u0D95\u0DCA\u200D\u0DBB");
  });
  it("a body of only invisibles becomes empty and fails min(1)", () => {
    expect(cleanText("\u200B\u200E \uFEFF\u2060")).toBe("");
    expect(commentSchema.safeParse({ body: "\u200B\u202E\uFEFF" }).success).toBe(false);
    expect(postSchema.safeParse({ title: "", body: "\u200B\u2066\u2069" }).success).toBe(false);
  });
  it("leaves HTML as inert text (React escapes it on render)", () => {
    expect(cleanText("<script>alert(1)</script>")).toBe("<script>alert(1)</script>");
  });
});

describe("schemas", () => {
  it("postSchema enforces body length and trims the title", () => {
    expect(postSchema.safeParse({ title: "", body: "" }).success).toBe(false);
    expect(postSchema.safeParse({ title: "", body: "x".repeat(LIMITS.postBody + 1) }).success).toBe(false);
    expect(postSchema.safeParse({ title: "x".repeat(LIMITS.postTitle + 1), body: "ok" }).success).toBe(false);
    expect(postSchema.parse({ title: "  Hi  ", body: "ok" })).toEqual({ title: "Hi", body: "ok" });
    expect(postSchema.parse({ body: "ok" })).toEqual({ title: "", body: "ok" });
  });
  it("commentSchema enforces 1–1000", () => {
    expect(commentSchema.safeParse({ body: "   " }).success).toBe(false);
    expect(commentSchema.safeParse({ body: "x".repeat(1001) }).success).toBe(false);
    expect(commentSchema.parse({ body: "nice" })).toEqual({ body: "nice" });
  });
  it("channelSchema validates kind and access enums", () => {
    expect(channelSchema.safeParse({ name: "Q&A", description: "", kind: "chat", access: "open" }).success).toBe(false);
    expect(channelSchema.safeParse({ name: "Q&A", description: "", kind: "discussion", access: "everyone" }).success).toBe(false);
    expect(channelSchema.parse({ name: " Q&A ", kind: "discussion", access: "open" })).toEqual({ name: "Q&A", description: "", kind: "discussion", access: "open" });
  });
  it("channelSlug slugifies and never returns an empty or reserved-by-itself value", () => {
    expect(channelSlug("Masterclass Q&A!")).toBe("masterclass-q-a");
    expect(channelSlug("!!!")).toBe("channel");
    expect(channelSlug("x".repeat(100)).length).toBeLessThanOrEqual(40);
  });
});

describe("checkRate", () => {
  it("allows 5 posts per minute per user, then blocks", () => {
    const u = `rate-user-${Math.random()}`;
    for (let i = 0; i < 5; i++) expect(checkRate("post", u)).toBe(true);
    expect(checkRate("post", u)).toBe(false);
    expect(checkRate("post", `${u}-other`)).toBe(true);
  });

  it("allows 3 backfills per 10 minutes per creator, then blocks", () => {
    const u = `backfill-creator-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(checkRate("backfill", u)).toBe(true);
    expect(checkRate("backfill", u)).toBe(false);
    expect(checkRate("backfill", `${u}-other`)).toBe(true);
  });
});
