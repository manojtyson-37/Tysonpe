import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Surface } from "./surface";

describe("Surface", () => {
  it("defaults to the card tone with medium padding on a div", () => {
    const html = renderToStaticMarkup(<Surface>body</Surface>);
    expect(html).toMatch(/^<div /);
    expect(html).toContain('class="card px-5 py-4"');
    expect(html).toContain(">body<");
  });

  it("applies named tones", () => {
    expect(renderToStaticMarkup(<Surface tone="inset">x</Surface>)).toContain(
      'class="rounded-card bg-surface-2 px-5 py-4"',
    );
    expect(renderToStaticMarkup(<Surface tone="paper">x</Surface>)).toContain(
      'class="rounded-card border border-line bg-bg px-5 py-4"',
    );
    expect(renderToStaticMarkup(<Surface tone="interactive">x</Surface>)).toContain(
      'class="card card-hover px-5 py-4"',
    );
  });

  it("applies named paddings", () => {
    expect(renderToStaticMarkup(<Surface padding="sm">x</Surface>)).toContain('class="card px-4 py-3"');
    expect(renderToStaticMarkup(<Surface padding="lg">x</Surface>)).toContain(
      'class="card px-6 py-5 sm:px-8 sm:py-6"',
    );
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
    expect(html).toContain('class="card px-5 py-4 mt-6"');
    expect(html).toContain('aria-labelledby="h"');
  });
});
