import { describe, expect, it } from "vitest";
import { brandRingColor, brandTextColor, contrastRatio, readableOn } from "./color";

describe("readableOn", () => {
  it("white text on dark brand", () => expect(readableOn("#5b3df5")).toBe("#ffffff"));
  it("dark text on light brand", () => expect(readableOn("#ffe08a")).toBe("#16130f"));
  it("falls back safely on bad input", () => expect(readableOn("nonsense")).toBe("#ffffff"));
});

/** The 12% brand tint (`${hex}1f`) composited on white: the surface behind `badge-brand` / active chips. */
function tintOnWhite(hex: string): string {
  const a = 0x1f / 255;
  const ch = [1, 3, 5].map((i) => Math.round(255 * (1 - a) + parseInt(hex.slice(i, i + 2), 16) * a));
  return `#${ch.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const BRANDS = ["#ffe08a", "#f59e0b", "#38bdf8", "#4f46e5", "#ffffff", "#000000", "#10b981"];

describe("contrastRatio", () => {
  it("is 21:1 for black on white and symmetric", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 1);
  });
  it("is 1:1 for identical colours", () => expect(contrastRatio("#4f46e5", "#4f46e5")).toBeCloseTo(1, 5));
});

describe("brandTextColor", () => {
  it.each(BRANDS)("%s: >= 4.5:1 on white and on its own 12%% tint", (hex) => {
    const t = brandTextColor(hex);
    expect(t).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrastRatio(t, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t, tintOnWhite(hex))).toBeGreaterThanOrEqual(4.5);
  });
  it("leaves an already-readable brand untouched (default indigo)", () => expect(brandTextColor("#4f46e5")).toBe("#4f46e5"));
  it("darkens a light brand but keeps its hue family (amber stays warm)", () => {
    const t = brandTextColor("#f59e0b");
    expect(t).not.toBe("#f59e0b");
    expect(parseInt(t.slice(1, 3), 16)).toBeGreaterThan(parseInt(t.slice(5, 7), 16)); // r > b
  });
  it("falls back to ink on bad input", () => expect(brandTextColor("nonsense")).toBe("#0f172a"));
});

describe("brandRingColor", () => {
  it.each(BRANDS)("%s: >= 3:1 on white and on the surface-2 track", (hex) => {
    const r = brandRingColor(hex);
    expect(contrastRatio(r, "#ffffff")).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(r, "#f8fafc")).toBeGreaterThanOrEqual(3);
  });
  it("is never darker than the text colour (ring is the lighter step)", () => {
    for (const hex of BRANDS) expect(contrastRatio(brandRingColor(hex), "#ffffff")).toBeLessThanOrEqual(contrastRatio(brandTextColor(hex), "#ffffff") + 0.001);
  });
  it("falls back to a safe colour on bad input", () => expect(contrastRatio(brandRingColor("nonsense"), "#ffffff")).toBeGreaterThanOrEqual(3));
});
