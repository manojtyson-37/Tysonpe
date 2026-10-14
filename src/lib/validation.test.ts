import { describe, expect, it } from "vitest";
import { httpUrl, rupeesToPaise, toEmbedUrl } from "./validation";

describe("rupeesToPaise", () => {
  it.each([["499", 49900], ["499.5", 49950], ["0", 0], ["0.10", 10]])("%s", (i, o) =>
    expect(rupeesToPaise.parse(i)).toBe(o));
  it.each(["", "-5", "abc", "1.234", "1e5", "99999999"])("rejects %j", (i) =>
    expect(rupeesToPaise.safeParse(i).success).toBe(false));
});

describe("httpUrl", () => {
  it.each(["", "https://a.com/x", "http://a.com"])("accepts %j", (i) =>
    expect(httpUrl.safeParse(i).success).toBe(true));
  it.each(["javascript:alert(1)", "data:text/html,x", "file:///etc/passwd", "ftp://x", "not a url"])(
    "rejects %j", (i) => expect(httpUrl.safeParse(i).success).toBe(false));
});

describe("toEmbedUrl", () => {
  it("youtube watch", () =>
    expect(toEmbedUrl("https://www.youtube.com/watch?v=abc123")).toBe("https://www.youtube-nocookie.com/embed/abc123"));
  it("youtu.be", () =>
    expect(toEmbedUrl("https://youtu.be/abc123")).toBe("https://www.youtube-nocookie.com/embed/abc123"));
  it("vimeo", () => expect(toEmbedUrl("https://vimeo.com/12345")).toBe("https://player.vimeo.com/video/12345"));
  it("rejects odd ids", () => expect(toEmbedUrl("https://youtu.be/a\"onload=1")).toBeNull());
  it("other hosts are not embedded", () => expect(toEmbedUrl("https://evil.com/watch?v=1")).toBeNull());
});
