import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BrandScope } from "@/components/Brand";
import { contrastRatio } from "@/lib/color";

const INK = "#16130f";
const HEX6 = /^#[0-9a-f]{6}$/i;

/** The five CSS variables BrandScope writes, parsed back out of the rendered style attribute. */
function vars(color: string): Record<string, string> {
  const html = renderToStaticMarkup(<BrandScope color={color}>x</BrandScope>);
  const style = /^<div style="([^"]*)">x<\/div>$/.exec(html)?.[1] ?? "";
  return Object.fromEntries(style.split(";").filter(Boolean).map((d) => [d.slice(0, d.indexOf(":")), d.slice(d.indexOf(":") + 1)] as [string, string]));
}

describe("BrandScope: a valid colour passes straight through", () => {
  it("derives all five variables from the colour it was given", () => {
    const v = vars("#f59e0b");
    expect(Object.keys(v).sort()).toEqual(["--brand", "--brand-ink", "--brand-ring", "--brand-soft", "--brand-text"]);
    expect(v["--brand"]).toBe("#f59e0b");
    expect(v["--brand-soft"]).toBe("#f59e0b1f");
  });

  it("accepts upper-case hex", () => {
    expect(vars("#F59E0B")["--brand"]).toBe("#F59E0B");
  });
});

describe("BrandScope: a malformed colour never reaches the CSS", () => {
  it.each(["#fff", "red;background:url(x)", "", "#12345", "#1234567", "#gggggg", "#f59e0b;color:red", "#f59e0b\n"])("%j falls back to ink in every variable", (bad) => {
    const v = vars(bad);
    expect(v["--brand"]).toBe(INK);
    expect(v["--brand-soft"]).toBe(`${INK}1f`);
    for (const [name, value] of Object.entries(v)) {
      const base = name === "--brand-soft" ? value.slice(0, 7) : value;
      expect(base, name).toMatch(HEX6);
    }
    expect(v["--brand-soft"]).toMatch(/^#[0-9a-f]{6}1f$/i);
  });

  it.each(["red;background:url(x)", "#f59e0b;color:red", "#fff"])("%j leaves no injected declaration in the markup", (bad) => {
    const html = renderToStaticMarkup(<BrandScope color={bad}>x</BrandScope>);
    expect(html).not.toContain("url(");
    expect(html).not.toContain("red");
    expect(html).not.toContain("background");
    // exactly the five declarations, nothing smuggled in after a `;`
    expect(/style="([^"]*)"/.exec(html)![1].split(";").filter(Boolean)).toHaveLength(5);
  });

  it.each(["#fff", "red;background:url(x)", "", "#12345"])("%j: the avatar letter still clears 4.5:1 on the fallback fill", (bad) => {
    const v = vars(bad);
    // the letter is drawn in --brand-ink on --brand; before the fix this was white-on-ink-or-invalid
    expect(contrastRatio(v["--brand-ink"], v["--brand"])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(v["--brand-text"], "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(v["--brand-ring"], "#fbfaf7")).toBeGreaterThanOrEqual(3);
  });
});
