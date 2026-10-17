// BrandColorField is a thin client component: it owns one colour and hands it to the preview. The repo has no DOM
// runner, so (as QuizEditor.interactions.test.tsx does) useState is replaced by a tiny synchronous store and the
// component is called as a plain function. WHAT THIS CANNOT PROVE: that React's real ColorField fires onChange from a
// real input event (form.test.tsx covers its text/picker helpers), or batching and re-render timing in a browser.
import { isValidElement, type ReactNode } from "react";
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
  const tree = BrandColorField({ defaultColor: "#6d28d9", storeName: "Asha" });
  return { field: find(tree, ColorField)!, preview: find(tree, BrandPreview)! };
};

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
});
