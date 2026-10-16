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

  it("has named link groups whose targets are real routes (no # placeholders)", () => {
    expect(html).toContain('aria-label="Product"');
    expect(html).toContain('aria-label="Account"');
    const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(expect.arrayContaining(["/", "/demo", "/login", "/signup?role=creator", "/library", "/#pricing", "/c/demo"]));
    for (const href of hrefs) expect(href).not.toBe("#");
  });

  it("closes with a decorative full-width wordmark that assistive tech skips", () => {
    const svg = html.match(/<svg [^>]*aria-hidden="true"[^>]*viewBox="0 0 1000 230"|<svg [^>]*viewBox="0 0 1000 230"[^>]*aria-hidden="true"/);
    expect(svg).not.toBeNull();
    expect(html).toContain('textLength="1000"');
    expect(html).toMatch(/<svg [^>]*class="[^"]*\bw-full\b/);
  });

  it("clips the oversized wordmark so the page never scrolls sideways", () => {
    expect(html).toMatch(/^<footer [^>]*class="[^"]*overflow-hidden/);
  });

  it("uses no gradients, glows or blur", () => {
    expect(html).not.toMatch(/gradient|blur|shadow/);
  });
});
