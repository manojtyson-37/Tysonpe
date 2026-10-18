import { readFileSync } from "node:fs";
import { isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "@/components/ui/button";
import { legacyStyleFindings } from "@/test/style-scan";
import CommunityConsoleError from "./error";

const SOURCE = readFileSync(new URL("./error.tsx", import.meta.url), "utf8");

function find(node: ReactNode, type: unknown, out: Array<{ props: Record<string, unknown> }> = []) {
  if (Array.isArray(node)) node.forEach((n) => find(n, type, out));
  else if (isValidElement(node)) {
    if (node.type === type) out.push(node as never);
    find((node.props as { children?: ReactNode }).children, type, out);
  }
  return out;
}

describe("community console error boundary", () => {
  it("is one alert with one Button wired to reset", () => {
    const reset = vi.fn();
    const tree = CommunityConsoleError({ reset });
    const buttons = find(tree, Button);
    expect(buttons).toHaveLength(1);
    expect(buttons[0].props.onClick).toBe(reset);
    const html = renderToStaticMarkup(tree);
    expect(html.match(/role="alert"/g)).toHaveLength(1);
    expect(html).toMatch(/<button [^>]*type="button"[^>]*>Try again<\/button>/);
  });

  it("renders the button with exactly the primitive's classes and nothing inline (no style, no disabled)", () => {
    expect(renderToStaticMarkup(CommunityConsoleError({ reset: () => {} }))).toContain(
      '<button type="button" class="btn btn-primary mt-5">Try again</button>',
    );
  });

  it("says what failed and that nothing was lost", () => {
    const html = renderToStaticMarkup(CommunityConsoleError({ reset: () => {} }));
    expect(html).toContain("Couldn&#x27;t load community settings");
    expect(html).toMatch(/Something went wrong on our side\. Your channels and posts are unchanged\./);
  });

  it("leaves the button height to the Button primitive: a fixed min-h-10 would beat its 44px touch floor", () => {
    expect(SOURCE).not.toMatch(/min-h-10|\bmin-h-\d/);
    expect(renderToStaticMarkup(CommunityConsoleError({ reset: () => {} }))).toContain('class="btn btn-primary mt-5"');
  });

  it("uses no legacy .card / .btn class strings", () => {
    expect(legacyStyleFindings(SOURCE)).toEqual([]);
  });
});
