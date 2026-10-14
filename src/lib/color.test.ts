import { describe, expect, it } from "vitest";
import { readableOn } from "./color";

describe("readableOn", () => {
  it("white text on dark brand", () => expect(readableOn("#5b3df5")).toBe("#ffffff"));
  it("dark text on light brand", () => expect(readableOn("#ffe08a")).toBe("#16130f"));
  it("falls back safely on bad input", () => expect(readableOn("nonsense")).toBe("#ffffff"));
});
