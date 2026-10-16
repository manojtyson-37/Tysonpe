import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Callout } from "./callout";

describe("Callout", () => {
  it("uses role=alert only for the bad tone", () => {
    expect(renderToStaticMarkup(<Callout tone="bad">Payment failed.</Callout>)).toContain('role="alert"');
    for (const tone of ["info", "good", "warn"] as const) {
      expect(renderToStaticMarkup(<Callout tone={tone}>Note</Callout>)).not.toContain("role=");
    }
  });

  it("defaults to info", () => {
    const html = renderToStaticMarkup(<Callout>Heads up</Callout>);
    expect(html).toContain("bg-surface-2");
    expect(html).toContain("Heads up");
  });

  it("maps each tone to its soft token fill", () => {
    expect(renderToStaticMarkup(<Callout tone="good">x</Callout>)).toContain("bg-good-soft");
    expect(renderToStaticMarkup(<Callout tone="warn">x</Callout>)).toContain("bg-warn-soft");
    expect(renderToStaticMarkup(<Callout tone="bad">x</Callout>)).toContain("bg-bad-soft");
  });

  it("uses the card radius with a decorative icon and no gradient, shadow or emoji", () => {
    const html = renderToStaticMarkup(<Callout tone="warn">x</Callout>);
    expect(html).toContain("rounded-card");
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toMatch(/gradient|shadow/);
  });

  it("renders the optional action after the message", () => {
    const html = renderToStaticMarkup(
      <Callout tone="bad" action={<a href="/retry">Retry</a>}>
        Payment failed.
      </Callout>,
    );
    expect(html.indexOf("Payment failed.")).toBeLessThan(html.indexOf("Retry"));
  });

  it("passes className through", () => {
    expect(renderToStaticMarkup(<Callout className="mb-4">x</Callout>)).toContain("mb-4");
  });
});
