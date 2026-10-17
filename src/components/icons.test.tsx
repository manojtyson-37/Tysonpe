import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import * as icons from "./icons";

const ICONS = [
  ["IconCheck", icons.IconCheck],
  ["IconX", icons.IconX],
  ["IconArrowRight", icons.IconArrowRight],
  ["IconArrowLeft", icons.IconArrowLeft],
  ["IconArrowUp", icons.IconArrowUp],
  ["IconArrowDown", icons.IconArrowDown],
  ["IconChevronDown", icons.IconChevronDown],
  ["IconPlus", icons.IconPlus],
  ["IconCopy", icons.IconCopy],
  ["IconLock", icons.IconLock],
  ["IconTrash", icons.IconTrash],
  ["IconSearch", icons.IconSearch],
  ["IconExternal", icons.IconExternal],
  ["IconDrag", icons.IconDrag],
  ["IconMenu", icons.IconMenu],
  ["IconInfo", icons.IconInfo],
  ["IconAlert", icons.IconAlert],
  ["IconClock", icons.IconClock],
  ["IconHeart", icons.IconHeart],
  ["IconPin", icons.IconPin],
] as const;

describe("icon set", () => {
  it("exports exactly the 20 icons", () => {
    const exported = Object.keys(icons).filter((k) => k.startsWith("Icon")).sort();
    expect(exported).toEqual(ICONS.map(([name]) => name).sort());
  });

  it.each(ICONS)("%s renders in the shared stroke style, decorative by default", (_name, Icon) => {
    const html = renderToStaticMarkup(<Icon />);
    expect(html).toMatch(/^<svg /);
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain('width="20"');
    expect(html).toContain('height="20"');
    expect(html).toContain('fill="none"');
    expect(html).toContain('stroke="currentColor"');
    expect(html).toContain('stroke-width="1.75"');
    expect(html).toContain('stroke-linecap="round"');
    expect(html).toContain('stroke-linejoin="round"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
    // Strokes only: no hard-coded colours.
    expect(html).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  it("applies the size prop to width and height", () => {
    const html = renderToStaticMarkup(<icons.IconCheck size={14} />);
    expect(html).toContain('width="14"');
    expect(html).toContain('height="14"');
  });

  it("lets a standalone icon opt in to the accessibility tree", () => {
    const html = renderToStaticMarkup(<icons.IconAlert aria-hidden={false} aria-label="Warning" role="img" />);
    expect(html).toContain('aria-label="Warning"');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-hidden="false"');
  });

  it("passes className through for sizing and colour utilities", () => {
    const html = renderToStaticMarkup(<icons.IconPlus className="text-muted" />);
    expect(html).toContain('class="text-muted"');
  });
});
