import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SiteFooter } from "./SiteFooter";

const html = renderToStaticMarkup(<SiteFooter storefrontHandle="demo" />);

describe("SiteFooter", () => {
  it("is a contentinfo footer with the test-mode line and the current year", () => {
    expect(html).toMatch(/^<footer /);
    expect(html).toContain("Payments run in test mode; no real money moves.");
    expect(html).toContain(`© ${new Date().getFullYear()} Tysonpe.`);
  });

  it("is hidden in print, so a printed invoice or certificate carries no site footer", () => {
    expect(html).toMatch(/^<footer [^>]*class="[^"]*\bprint:hidden\b[^"]*"/);
  });

  it("has named link groups whose targets are real routes (no # placeholders)", () => {
    expect(html).toContain('aria-label="Product"');
    expect(html).toContain('aria-label="Account"');
    const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(expect.arrayContaining(["/", "/demo", "/login", "/signup?role=creator", "/library", "/#pricing", "/c/demo"]));
    for (const href of hrefs) expect(href).not.toBe("#");
  });

  it("closes with a decorative full-width wordmark that assistive tech skips", () => {
    const svg = html.match(/<svg [^>]*class="[^"]*\bw-full\b[^"]*"[^>]*>/)?.[0] ?? "";
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toMatch(/viewBox="0 0 1000 \d+"/);
    expect(html).toContain('textLength="1000"');
    expect(html).toMatch(/<svg [^>]*class="[^"]*\bw-full\b/);
  });

  it("gives the wordmark's descenders room: the viewBox is taller than baseline + 0.3 em (svg clips overflow)", () => {
    const viewBoxHeight = Number(html.match(/<svg [^>]*viewBox="0 0 1000 (\d+)"/)?.[1]);
    const text = html.match(/<text [^>]*>/)?.[0] ?? "";
    const baseline = Number(text.match(/\by="(\d+)"/)?.[1]);
    const fontSize = Number(text.match(/font-?[sS]ize="(\d+)"/)?.[1]);
    expect(viewBoxHeight).toBeGreaterThan(0);
    expect(baseline).toBeGreaterThan(0);
    expect(fontSize).toBeGreaterThan(0);
    expect(viewBoxHeight).toBeGreaterThanOrEqual(baseline + 0.3 * fontSize);
  });

  it("keeps footer links at the 44px touch floor on coarse pointers, and the blurb at the 15px marketing floor", () => {
    const links = [...html.matchAll(/<a ([^>]*)>/g)].map((m) => m[1]).filter((a) => !a.includes("aria-label="));
    expect(links.length).toBeGreaterThan(0);
    for (const attrs of links) expect(attrs).toContain("pointer-coarse:min-h-11");
    expect(html).toMatch(/<p class="[^"]*text-\[15px\][^"]*">Storefront, UPI checkout/);
  });

  it("the wordmark link is a 44px target under a coarse pointer (it was 17px tall)", () => {
    const tag = /<a [^>]*aria-label="Tysonpe home"[^>]*>/.exec(html)![0];
    expect(tag).toContain("inline-flex items-center pointer-coarse:min-h-11");
  });

  it("clips the oversized wordmark so the page never scrolls sideways", () => {
    expect(html).toMatch(/^<footer [^>]*class="[^"]*overflow-hidden/);
  });

  it("uses no gradients, glows or blur", () => {
    expect(html).not.toMatch(/gradient|blur|shadow/);
  });
});
