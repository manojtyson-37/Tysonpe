// Dialog must hand `bare` on to DialogView. The portal needs document.body and a mounted flag (both browser-only), so they
// are stubbed: the portal returns its children, useSyncExternalStore reports "mounted".
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const useSyncExternalStore = () => true;
  return { ...actual, default: { ...actual, useSyncExternalStore }, useSyncExternalStore };
});
vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();
  return { ...actual, createPortal: (children: unknown) => children };
});
vi.stubGlobal("document", { body: {}, activeElement: null });

import { Dialog } from "./dialog";

describe("Dialog forwards bare to DialogView", () => {
  it("bare: hidden title, no padded wrapper, children edge to edge, no aria-describedby", () => {
    const html = renderToStaticMarkup(
      <Dialog open bare onClose={() => {}} title="Gateway">
        <section>own</section>
      </Dialog>,
    );
    expect(html).toMatch(/<h2 id="[^"]+" class="sr-only">Gateway<\/h2>/);
    expect(html).toContain("<section>own</section>");
    expect(html).not.toContain("px-6 pt-6");
    expect(html).not.toContain("aria-describedby");
  });

  it("default (bare omitted): padded wrapper, visible title, described by the body", () => {
    const html = renderToStaticMarkup(<Dialog open onClose={() => {}} title="Plain" description="body" />);
    expect(html).toContain("px-6 pt-6");
    expect(html).not.toContain("sr-only");
    expect(html).toContain("aria-describedby");
  });
});

describe("Dialog props: bare excludes description and footer (checked by tsc, not at runtime)", () => {
  it("rejects bare with a description or a footer", () => {
    const never = () => (
      <>
        {/* @ts-expect-error a bare dialog cannot take a description */}
        <Dialog open bare onClose={() => {}} title="T" description="x" />
        {/* @ts-expect-error a bare dialog cannot take a footer */}
        <Dialog open bare onClose={() => {}} title="T" footer={<b>x</b>} />
        <Dialog open bare={false} onClose={() => {}} title="T" description="ok" footer={<b>ok</b>} />
      </>
    );
    expect(typeof never).toBe("function");
  });
});
