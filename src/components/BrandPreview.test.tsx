import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { brandPreview, formatRatio } from "@/lib/brand-preview";
import { legacyStyleFindings } from "@/test/style-scan";
import { BrandPreview } from "./BrandPreview";

const render = (color: string, storeName = "Asha Rao Academy") => renderToStaticMarkup(<BrandPreview color={color} storeName={storeName} />);
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&#x27;/g, "'");
const findings = (html: string) => [...html.matchAll(/<li\b[^>]*>(.*?)<\/li>/g)].map((m) => text(m[1]).trim());
const style = (html: string) => /<div style="([^"]*)">/.exec(html)![1];

describe("BrandPreview: the miniature uses the storefront's BrandScope", () => {
  it("scopes all five brand variables from the colour, as the storefront does", () => {
    const s = style(render("#f59e0b"));
    for (const v of ["--brand:#f59e0b", "--brand-ink:", "--brand-soft:#f59e0b1f", "--brand-text:", "--brand-ring:"]) expect(s).toContain(v);
    const info = brandPreview("#f59e0b");
    expect(s).toContain(`--brand-ink:${info.buttonText}`);
    expect(s).toContain(`--brand-text:${info.textColor}`);
    expect(s).toContain(`--brand-ring:${info.ringColor}`);
  });

  it("is decorative: hidden from assistive tech, nothing focusable or clickable inside", () => {
    const html = render("#5b3df5");
    expect(html).toMatch(/<div aria-hidden="true" class="mt-3 overflow-hidden rounded-card/);
    for (const tag of ["<button", "<a ", "<input", "tabindex"]) expect(html).not.toContain(tag);
    expect(html).toContain("pointer-events-none");
  });

  it("shows the store name, with a fallback when the name is empty", () => {
    expect(text(render("#5b3df5"))).toContain("Asha Rao Academy");
    expect(text(render("#5b3df5", ""))).toContain("Your store");
  });

  it("is a named group with no .card, rounded-xl or legacy classes", () => {
    const html = render("#5b3df5");
    expect(html).toContain('role="group" aria-label="Storefront colour preview"');
    const tokens = [...html.matchAll(/\sclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
    expect(tokens).not.toContain("card");
    expect(html).not.toContain("rounded-xl");
  });
});

describe("BrandPreview: findings in words (colour is never the only signal)", () => {
  it("a dark colour: white button text, colour used as is for text and rings", () => {
    const f = findings(render("#0f172a"));
    expect(f).toHaveLength(3);
    expect(f[0]).toMatch(/^Button text will be white \(\d+\.\d:1 on your colour\)\.$/);
    expect(f[1]).toMatch(/^Text in your colour uses it as is \(\d+\.\d:1 on white\)\.$/);
    expect(f[2]).toMatch(/^Focus rings and progress bars use it as is/);
  });

  it("a very light colour: ink button text, and a darker shade for text and rings, named with its ratio", () => {
    const info = brandPreview("#fde68a");
    const f = findings(render("#fde68a"));
    expect(f[0]).toMatch(/^Button text will be ink/);
    expect(f[1]).toBe(`Text in your colour uses a darker shade, ${info.textColor} (${formatRatio(info.textRatio)} on white), so it stays readable.`);
    expect(f[2]).toContain(info.ringColor);
    expect(f[2]).toContain("so they stay visible");
  });

  it("states the ratio truncated, never rounded up past what the colour reaches", () => {
    const info = brandPreview("#777777");
    expect(findings(render("#777777"))[0]).toContain(`(${formatRatio(info.buttonRatio)} on your colour)`);
  });

  it("a mid-tone colour whose best button text is still under 4.5:1 says so, with a warning icon, not just a number", () => {
    const html = render("#777777");
    const f = findings(html);
    expect(f[0]).toContain("under the 4.5:1 guideline");
    expect(f[0]).toContain("a lighter or darker shade reads better");
    // A colour that passes gets no such sentence.
    expect(findings(render("#0f172a")).join(" ")).not.toContain("guideline");
    expect(html.split("<li")[1]).toContain("text-bad");
  });

  it("an invalid colour falls back to ink and says why, first in the list", () => {
    for (const bad of ["", "#fff", "nope", "#12345g"]) {
      const f = findings(render(bad));
      expect(f).toHaveLength(4);
      expect(f[0]).toBe("That is not a six-digit hex colour like #5b3df5, so the storefront falls back to ink (#16130f).");
      expect(style(render(bad))).toContain("--brand:#16130f");
    }
  });

  it("a valid colour shows no fallback sentence", () => {
    expect(text(render("#5b3df5"))).not.toContain("falls back");
  });
});

describe("BrandPreview: source", () => {
  it("is not a client module (no hooks) and passes the style scan", () => {
    const src = readFileSync(new URL("./BrandPreview.tsx", import.meta.url), "utf8");
    expect(src).not.toMatch(/^\s*["']use client["']/);
    expect(src).not.toMatch(/\buse(State|Effect|Ref|Memo)\b/);
    expect(legacyStyleFindings(src)).toEqual([]);
  });
});
