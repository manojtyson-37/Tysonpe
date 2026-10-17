import { readFileSync } from "node:fs";
import { isValidElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// useFormStatus is only non-idle inside a form action, which SSR cannot start. Drive it directly.
const status = vi.hoisted(() => ({ pending: false }));
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  useFormStatus: () => ({ pending: status.pending, data: null, method: null, action: null }),
}));

import { legacyStyleFindings } from "@/test/style-scan";
import { LikeSubmit } from "./LikeSubmit";

const render = (count = 3, liked = false) => renderToStaticMarkup(<LikeSubmit count={count} liked={liked} />);
const button = (html: string) => /<button\b[^>]*>/.exec(html)![0];
const classes = (html: string) => (/class="([^"]*)"/.exec(button(html))?.[1] ?? "").split(/\s+/);
const svg = (html: string) => /<svg\b[^>]*>/.exec(html)![0];

beforeEach(() => {
  status.pending = false;
});

describe("LikeSubmit: the accessible contract", () => {
  it("has a constant name 'Like, N', and aria-pressed carries the state (the name does not flip)", () => {
    for (const liked of [false, true]) {
      const b = button(render(3, liked));
      expect(b).toContain('aria-label="Like, 3"');
      expect(b).toContain(`aria-pressed="${liked}"`);
      expect(b).toContain('type="submit"');
    }
    expect(button(render(0, false))).toContain('aria-label="Like, 0"');
    expect(button(render(1204, true))).toContain('aria-label="Like, 1204"');
  });

  it("shows the count as text hidden from assistive tech (the name already says it)", () => {
    expect(render(7)).toContain('<span class="tabular-nums" aria-hidden="true">7</span>');
  });

  it("is aria-disabled (still focusable, never `disabled`) while the request is in flight, and not otherwise", () => {
    expect(button(render())).not.toContain("aria-disabled");
    status.pending = true;
    const b = button(render());
    expect(b).toContain('aria-disabled="true"');
    expect(b).not.toMatch(/\sdisabled(=|\s|>)/);
    // The name does not change while pending, and the button is not shown as busy-with-a-spinner (no layout jump).
    expect(b).toContain('aria-label="Like, 3"');
    expect(render()).not.toContain("animate-spin");
  });

  it("ignores a click while pending (double-tap guard) and lets one through otherwise", () => {
    const click = () => {
      const el = LikeSubmit({ count: 3, liked: false }) as { props: { onClick: (e: { preventDefault: () => void }) => void } };
      expect(isValidElement(el)).toBe(true);
      const e = { preventDefault: vi.fn() };
      el.props.onClick(e);
      return e.preventDefault;
    };
    expect(click()).not.toHaveBeenCalled();
    status.pending = true;
    expect(click()).toHaveBeenCalledTimes(1);
  });
});

describe("LikeSubmit: look", () => {
  it("is always a small SECONDARY button, never the brand-filled primary (liked or not)", () => {
    for (const liked of [false, true]) {
      const c = classes(render(3, liked));
      expect(c).toEqual(expect.arrayContaining(["btn", "btn-secondary", "btn-sm"]));
      expect(c).not.toContain("btn-primary");
    }
  });

  it("liked is a FILLED heart in the brand text colour; not liked is an outline in the button's own colour", () => {
    const on = render(3, true);
    expect(svg(on)).toContain('fill="currentColor"');
    expect(on).toContain("text-[color:var(--brand-text)]");
    const off = render(3, false);
    expect(svg(off)).toContain('fill="none"');
    expect(off).not.toContain("--brand-text");
  });

  it("uses the shared icon (24 grid, 1.75 stroke), not an inline path of its own", () => {
    const s = svg(render());
    expect(s).toContain('viewBox="0 0 24 24"');
    expect(s).toContain('stroke-width="1.75"');
    expect(s).toContain('aria-hidden="true"');
    expect(s).toContain('width="16"');
    expect(readFileSync(new URL("./LikeSubmit.tsx", import.meta.url), "utf8")).not.toContain("<svg");
  });

  it("press feedback comes from the Button primitive, with the brand focus ring and the 44px coarse floor", () => {
    const c = classes(render());
    expect(c).toContain("pointer-coarse:min-h-11");
    expect(c.some((x) => x.includes("--brand-ring"))).toBe(true);
    expect(render()).not.toMatch(/active:scale/);
  });

  it("passes the style scan", () => {
    expect(legacyStyleFindings(readFileSync(new URL("./LikeSubmit.tsx", import.meta.url), "utf8"))).toEqual([]);
  });
});
