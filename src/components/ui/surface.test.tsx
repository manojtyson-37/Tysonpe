import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Surface } from "./surface";

describe("Surface", () => {
  it("defaults to the card tone with medium padding on a div", () => {
    const html = renderToStaticMarkup(<Surface>body</Surface>);
    expect(html).toMatch(/^<div /);
    expect(html).toContain("card");
    expect(html).toContain("px-5 py-4");
    expect(html).toContain(">body<");
  });

  it("applies named tones", () => {
    expect(renderToStaticMarkup(<Surface tone="inset">x</Surface>)).toContain("bg-surface-2");
    expect(renderToStaticMarkup(<Surface tone="paper">x</Surface>)).toContain("bg-bg");
    const interactive = renderToStaticMarkup(<Surface tone="interactive">x</Surface>);
    expect(interactive).toContain("card-hover");
    expect(interactive).toContain("card");
  });

  it("applies named paddings", () => {
    expect(renderToStaticMarkup(<Surface padding="sm">x</Surface>)).toContain("px-4 py-3");
    expect(renderToStaticMarkup(<Surface padding="lg">x</Surface>)).toContain("px-6 py-5");
  });

  it("never carries a resting shadow, gradient or ad-hoc radius", () => {
    for (const tone of ["default", "inset", "paper", "interactive"] as const) {
      const html = renderToStaticMarkup(<Surface tone={tone}>x</Surface>);
      expect(html).not.toMatch(/shadow|gradient|rounded-\[/);
    }
  });

  it("renders the requested element and passes through attributes", () => {
    const html = renderToStaticMarkup(
      <Surface as="section" className="mt-6" aria-labelledby="h">x</Surface>,
    );
    expect(html).toMatch(/^<section /);
    expect(html).toContain("mt-6");
    expect(html).toContain('aria-labelledby="h"');
  });
});
