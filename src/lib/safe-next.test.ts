import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it.each(["/library", "/checkout/abc?coupon=X", "/c/asha-rao/slug"])("allows %s", (p) =>
    expect(safeNext(p, "/x")).toBe(p));
  it.each(["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)", "evil.com", "", "/a\nb", "/\t/evil.com"])(
    "blocks %j", (p) => expect(safeNext(p, "/x")).toBe("/x"));
  it("blocks non-strings", () => {
    expect(safeNext(undefined, "/x")).toBe("/x");
    expect(safeNext(["/a"], "/x")).toBe("/x");
  });
});
