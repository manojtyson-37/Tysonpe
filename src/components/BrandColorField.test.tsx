// BrandColorField is a thin client component: it owns one colour and hands it to the preview. The repo has no DOM
// runner, so (as QuizEditor.interactions.test.tsx does) useState is replaced by a tiny synchronous store and the
// component is called as a plain function. WHAT THIS CANNOT PROVE: that React's real ColorField fires onChange from a
// real input event (form.test.tsx covers its text/picker helpers), that a native `input` event bubbles from the text
// input to the wrapper's onInput in a browser, or batching and re-render timing. The wrapper's onInput is driven here
// with a hand-made event ({ target: { tagName, type, value } }), which is the only part of the event it reads.
import { isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const H = vi.hoisted(() => ({ slots: [] as unknown[], i: 0 }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const useState = (init: unknown) => {
    const idx = H.i++;
    if (!(idx in H.slots)) H.slots[idx] = init;
    const set = (v: unknown) => {
      H.slots[idx] = v;
    };
    return [H.slots[idx], set];
  };
  return { ...actual, default: { ...actual, useState }, useState };
});

import { BrandColorField } from "./BrandColorField";
import { BrandPreview } from "./BrandPreview";
import { ColorField } from "./form";

type P = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
function find(node: ReactNode, type: unknown): P | undefined {
  if (Array.isArray(node)) return node.map((c) => find(c, type)).find(Boolean);
  if (!isValidElement(node)) return undefined;
  const props = node.props as P;
  return node.type === type ? props : find(props.children, type);
}
const render = () => {
  H.i = 0;
  const tree = BrandColorField({ defaultColor: "#6d28d9", storeName: "Asha" }) as { props: P };
  return { root: tree.props, field: find(tree as ReactNode, ColorField)!, preview: find(tree as ReactNode, BrandPreview)! };
};
const input = (type: string, value: string, tagName = "INPUT") => ({ target: { tagName, type, value } });

beforeEach(() => {
  H.slots = [];
  H.i = 0;
});

describe("BrandColorField", () => {
  it("submits `brandColor` from the colour field, starting at the stored colour in both places", () => {
    const { field, preview } = render();
    expect(field.name).toBe("brandColor");
    expect(field.label).toBe("Brand colour");
    expect(field.defaultValue).toBe("#6d28d9");
    expect(preview.color).toBe("#6d28d9");
    expect(preview.storeName).toBe("Asha");
  });

  it("typing or picking a colour reaches the preview", () => {
    const first = render();
    first.field.onChange("#fde68a");
    expect(render().preview.color).toBe("#fde68a");
    first.field.onChange("#0f172a");
    expect(render().preview.color).toBe("#0f172a");
  });

  it("the preview is not pending at first, and a valid typed colour keeps it that way", () => {
    expect(render().preview.pending).toBe(false);
    const a = render();
    a.root.onInput(input("text", "#fde68a"));
    a.field.onChange("#fde68a");
    const b = render();
    expect(b.preview.pending).toBe(false);
    expect(b.preview.color).toBe("#fde68a");
  });

  it("an invalid hex in the text box flags the preview as pending and keeps the last valid colour", () => {
    render().root.onInput(input("text", "#12345"));
    const r = render();
    expect(r.preview.pending).toBe(true);
    expect(r.preview.color).toBe("#6d28d9");
  });

  it("an empty or three-digit box is pending too (same rule as the storefront)", () => {
    for (const v of ["", "#fff", "#1234567", "#12345g"]) {
      H.slots = [];
      render().root.onInput(input("text", v));
      expect(render().preview.pending, JSON.stringify(v)).toBe(true);
    }
  });

  it("completing the hex clears the flag", () => {
    render().root.onInput(input("text", "#12345"));
    expect(render().preview.pending).toBe(true);
    const a = render();
    a.root.onInput(input("text", "#123456"));
    a.field.onChange("#123456");
    const b = render();
    expect(b.preview.pending).toBe(false);
    expect(b.preview.color).toBe("#123456");
  });

  it("a pending hex puts the field in an error state (aria-invalid comes from ColorField's `error`), and any valid colour lifts it", () => {
    expect(render().field.error).toBeUndefined();
    render().root.onInput(input("text", "#12345"));
    const pending = render().field.error;
    expect(pending).toEqual(expect.stringMatching(/six digits/i));
    expect(typeof pending).toBe("string"); // the message is announced via the field's own describedby/alert wiring
    render().field.onChange("#abcdef");
    expect(render().field.error).toBeUndefined();
    render().root.onInput(input("text", "#12"));
    expect(render().field.error).toBeDefined();
    render().root.onInput(input("color", "#abcdef"));
    expect(render().field.error).toBeUndefined();
  });

  it("ColorField turns `error` into aria-invalid on the hex text input (the contract the pending state relies on)", () => {
    const hexInput = (error?: string) => {
      H.i = 0;
      H.slots = [];
      const html = renderToStaticMarkup(<ColorField name="brandColor" label="Brand colour" defaultValue="#6d28d9" error={error} />);
      return /<input\b[^>]*type="text"[^>]*>/.exec(html)![0];
    };
    expect(hexInput("Enter six digits, like #0f7b4d.")).toContain('aria-invalid="true"');
    expect(hexInput()).not.toContain("aria-invalid");
  });

  it("an input event from the colour picker clears the flag on its own", () => {
    render().root.onInput(input("text", "#12345"));
    expect(render().preview.pending).toBe(true);
    render().root.onInput(input("color", "#abcdef"));
    expect(render().preview.pending).toBe(false);
  });

  it("a valid colour reported by the field clears the flag on its own", () => {
    render().root.onInput(input("text", "#12345"));
    render().field.onChange("#abcdef");
    const r = render();
    expect(r.preview.pending).toBe(false);
    expect(r.preview.color).toBe("#abcdef");
  });

  it("ignores input events from anything that is not the text box (each would flag pending if it were read as text)", () => {
    for (const ev of [input("checkbox", "on"), input("text", "", "TEXTAREA"), input("text", "", "SELECT"), { target: null }]) {
      H.slots = [];
      render().root.onInput(ev);
      expect(render().preview.pending).toBe(false);
    }
  });
});
