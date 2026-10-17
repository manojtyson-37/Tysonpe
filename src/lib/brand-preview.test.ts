import { describe, expect, it } from "vitest";
import { brandRingColor, brandTextColor, contrastRatio, readableOn } from "./color";
import { brandPreview, FALLBACK_BRAND, formatRatio, isPendingHex } from "./brand-preview";

describe("brandPreview: validity follows BrandScope's /^#[0-9a-f]{6}$/i rule", () => {
  it.each(["#5b3df5", "#F59E0B", "#000000", "#ffffff"])("%s is valid and passes through as typed", (hex) => {
    const p = brandPreview(hex);
    expect(p.valid).toBe(true);
    expect(p.color).toBe(hex);
  });

  it.each(["", "#fff", "#FFF", "5b3df5", "#12345", "#1234567", "#gggggg", "red", "#f59e0b;color:red", "#f59e0b\n", " #f59e0b"])(
    "%j is invalid and falls back to ink exactly",
    (bad) => {
      const p = brandPreview(bad);
      expect(p.valid).toBe(false);
      expect(p.color).toBe(FALLBACK_BRAND);
      expect(p.color).toBe("#16130f");
      // Every derived value is computed from the fallback, as BrandScope does.
      expect(p).toEqual({ ...brandPreview("#16130f"), valid: false });
    },
  );

  it("treats three-digit hex as invalid (the stored value must be six digits)", () => {
    expect(brandPreview("#fff").valid).toBe(false);
    expect(brandPreview("#fff").color).toBe("#16130f");
  });

  it("is case-insensitive for a valid colour and keeps its casing", () => {
    const upper = brandPreview("#F59E0B");
    const lower = brandPreview("#f59e0b");
    expect(upper.valid && lower.valid).toBe(true);
    expect(upper.color).toBe("#F59E0B");
    expect(upper.buttonText).toBe(lower.buttonText);
    expect(upper.textColor).toBe(lower.textColor);
    expect(upper.textAdjusted).toBe(lower.textAdjusted);
    expect(upper.ringColor.toLowerCase()).toBe(lower.ringColor.toLowerCase());
  });
});

describe("brandPreview: derivations are the storefront's own helpers", () => {
  it.each(["#5b3df5", "#f59e0b", "#fde68a", "#0f172a", "#808080", "#16130f", "#ffffff", "#000000"])("%s", (hex) => {
    const p = brandPreview(hex);
    expect(p.buttonText).toBe(readableOn(hex));
    expect(p.textColor).toBe(brandTextColor(hex));
    expect(p.ringColor).toBe(brandRingColor(hex));
    expect(p.buttonRatio).toBeCloseTo(contrastRatio(hex, p.buttonText), 10);
    expect(p.textRatio).toBeCloseTo(contrastRatio(p.textColor, "#ffffff"), 10);
  });

  it("a very light colour: ink button text, and the text and ring shades are darkened", () => {
    const p = brandPreview("#fde68a");
    expect(p.buttonText).toBe("#16130f");
    expect(p.buttonTextName).toBe("ink");
    expect(p.textAdjusted).toBe(true);
    expect(p.textColor).not.toBe("#fde68a");
    expect(p.textRatio).toBeGreaterThanOrEqual(4.5);
    expect(p.ringAdjusted).toBe(true);
    expect(p.ringRatio).toBeGreaterThanOrEqual(3);
  });

  it("white is the lightest case: ink button text, text darkened all the way to readable", () => {
    const p = brandPreview("#ffffff");
    expect(p.buttonTextName).toBe("ink");
    expect(p.textAdjusted).toBe(true);
    expect(p.textRatio).toBeGreaterThanOrEqual(4.5);
  });

  it("a very dark colour: white button text and the colour is used as is", () => {
    const p = brandPreview("#0f172a");
    expect(p.buttonText).toBe("#ffffff");
    expect(p.buttonTextName).toBe("white");
    expect(p.textAdjusted).toBe(false);
    expect(p.textColor).toBe("#0f172a");
    expect(p.ringAdjusted).toBe(false);
  });

  it("a mid colour sits on the crossover: white-or-ink is the best of two, so the button can still miss 4.5:1", () => {
    // #777777 is the classic case: white gives 4.48:1 and ink less, so the better choice is still under AA.
    const mid = brandPreview("#777777");
    expect(mid.buttonRatio).toBeLessThan(4.5);
    expect(mid.buttonOk).toBe(false);
    expect(formatRatio(mid.buttonRatio)).toBe("4.4:1");
    // Never worse than the crossover floor (~4.29:1), whatever the colour.
    for (const hex of ["#808080", "#767676", "#8a8a8a", "#e11d48", "#16a34a", "#2563eb"]) {
      expect(brandPreview(hex).buttonRatio, hex).toBeGreaterThan(4.2);
    }
    expect(brandPreview("#0f172a").buttonOk).toBe(true);
    expect(brandPreview("#fde68a").buttonOk).toBe(true);
  });

  it("any valid colour: text shade >= 4.5:1 and ring shade >= 3:1 on white", () => {
    for (let r = 0; r < 256; r += 51) for (let g = 0; g < 256; g += 51) for (let b = 0; b < 256; b += 51) {
      const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
      const p = brandPreview(hex);
      expect(p.textRatio, hex).toBeGreaterThanOrEqual(4.5);
      expect(p.ringRatio, hex).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("formatRatio", () => {
  it.each([
    [4.5, "4.5:1"],
    [4.49, "4.4:1"],
    [4.5099, "4.5:1"],
    [21, "21.0:1"],
    [1, "1.0:1"],
    [7.06, "7.0:1"],
  ])("%d -> %s (truncated, never rounded up)", (n, text) => expect(formatRatio(n)).toBe(text));
});

describe("isPendingHex: is the text in the colour box not a valid #rrggbb yet", () => {
  it.each(["#16130f", "#16130F", "#0f7b4d"])("%j is complete, not pending", (v) => expect(isPendingHex(v)).toBe(false));
  it.each(["", "#", "#1", "#12345", "#fff", "#1234567", "#12345g", "16130f", " #16130f", "#16130f ", "#16130f\n", "red;x"])("%j is pending", (v) => expect(isPendingHex(v)).toBe(true));
  it("agrees with brandPreview().valid for every probe (one rule)", () => {
    for (const v of ["", "#", "#12345", "#fff", "#1234567", "#12345g", "#16130f", "#ABCDEF", "#16130f\n"]) {
      expect(isPendingHex(v)).toBe(!brandPreview(v).valid);
    }
  });
});
