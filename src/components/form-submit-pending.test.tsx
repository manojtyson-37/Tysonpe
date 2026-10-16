import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// useFormStatus is only non-idle inside a form action, which SSR cannot start. Drive it directly.
let mockPending = false;
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  useFormStatus: () => ({ pending: mockPending, data: null, method: null, action: null }),
}));

import { SubmitButton } from "./form";

const render = renderToStaticMarkup;

/** The sr-only status region and its text content. */
function liveRegion(html: string): { tag: string; text: string } | null {
  const m = html.match(/<span\b([^>]*\brole="status"[^>]*)>([^<]*)<\/span>/);
  return m ? { tag: m[1], text: m[2] } : null;
}

describe("SubmitButton pending announcement", () => {
  beforeEach(() => {
    mockPending = false;
  });

  it("idle: label shown, polite sr-only region present and empty, not busy", () => {
    const html = render(<SubmitButton pendingText="Creating order…">Pay now</SubmitButton>);
    expect(html).toContain("Pay now");
    expect(html).not.toContain("aria-busy");
    const region = liveRegion(html);
    expect(region).not.toBeNull();
    expect(region?.tag).toContain('aria-live="polite"');
    expect(region?.tag).toContain("sr-only");
    expect(region?.text).toBe("");
  });

  it("pending: the same label is still rendered and the pending text is announced from the sr-only region", () => {
    mockPending = true;
    const html = render(<SubmitButton pendingText="Creating order…">Pay now</SubmitButton>);
    expect(html).toContain("Pay now");
    expect(html).toContain('aria-busy="true"');
    const region = liveRegion(html);
    expect(region?.tag).toContain('aria-live="polite"');
    expect(region?.tag).toContain("sr-only");
    expect(region?.text).toBe("Creating order…");
    // The pending text is announced only; it never replaces the visible label.
    expect(html.match(/Creating order…/g)).toHaveLength(1);
  });

  it("the label text is identical in both states, so the button keeps its width", () => {
    const labelOf = (html: string) => html.replace(/<span\b[^>]*role="status"[^>]*>[^<]*<\/span>/, "").match(/Pay now/g);
    const idle = render(<SubmitButton>Pay now</SubmitButton>);
    mockPending = true;
    const busy = render(<SubmitButton>Pay now</SubmitButton>);
    expect(labelOf(idle)).toEqual(["Pay now"]);
    expect(labelOf(busy)).toEqual(["Pay now"]);
  });

  it("falls back to the default pending text", () => {
    mockPending = true;
    expect(liveRegion(render(<SubmitButton>Save</SubmitButton>))?.text).toBe("Working…");
  });
});
