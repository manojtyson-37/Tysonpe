import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";

// ColorField is a client component and this env has no DOM (node environment, no jsdom), so a change event
// cannot be dispatched. Instead call the component as a plain function with useState swapped for a recorder,
// walk the returned element tree to the two <input>s, and invoke their onChange props with a fake event.
const setters: Record<number, ReturnType<typeof vi.fn>> = {};
let slot = 0;
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useId: () => "cf",
  useState: (init: unknown) => {
    const i = slot++;
    setters[i] = vi.fn();
    return [init, setters[i]];
  },
}));

import { ColorField } from "./form";

type Props = { type?: string; onChange?: (e: { target: { value: string } }) => void; children?: ReactNode };

function inputs(node: ReactNode, out: ReactElement<Props>[] = []): ReactElement<Props>[] {
  if (Array.isArray(node)) node.forEach((n) => inputs(n, out));
  else if (node && typeof node === "object" && "props" in node) {
    const el = node as ReactElement<Props>;
    if (el.type === "input") out.push(el);
    inputs(el.props.children, out);
  }
  return out;
}

function mount(onChange: (hex: string) => void) {
  slot = 0;
  const tree = ColorField({ name: "brand", label: "Brand", onChange }) as ReactElement<Props>;
  const [picker, text] = inputs(tree);
  // useState slot 0 is `text`, slot 1 is `picker` (declaration order in ColorField).
  return { picker, text, setText: setters[0], setPicker: setters[1] };
}

describe("ColorField casing", () => {
  const onChange = vi.fn();
  beforeEach(() => onChange.mockReset());

  it("finds the picker and the text input", () => {
    const { picker, text } = mount(onChange);
    expect(picker.props.type).toBe("color");
    expect(text.props.type).toBe("text");
  });

  it("typing an uppercase hex keeps the user's casing in the box but emits lowercase", () => {
    const { text, setText, setPicker } = mount(onChange);
    text.props.onChange!({ target: { value: "#ABCDEF" } });
    expect(setText).toHaveBeenCalledWith("#ABCDEF");
    expect(setPicker).toHaveBeenCalledWith("#abcdef");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("#abcdef");
  });

  it("does not emit while the typed value is not yet a full hex colour", () => {
    const { text, setText, setPicker } = mount(onChange);
    text.props.onChange!({ target: { value: "#ABC" } });
    expect(setText).toHaveBeenCalledWith("#ABC");
    expect(setPicker).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("an uppercase value from the native picker is lowercased everywhere, box included", () => {
    const { picker, setText, setPicker } = mount(onChange);
    picker.props.onChange!({ target: { value: "#5B3DF5" } });
    expect(setPicker).toHaveBeenCalledWith("#5b3df5");
    expect(setText).toHaveBeenCalledWith("#5b3df5");
    expect(onChange).toHaveBeenCalledWith("#5b3df5");
  });
});
