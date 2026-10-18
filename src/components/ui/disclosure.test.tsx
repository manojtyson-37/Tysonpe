// Markup is checked on server-rendered HTML. The click handler is state, and the repo has no DOM runner, so (as
// QuizEditor.interactions.test.tsx does) the last group swaps useState/useId for a tiny synchronous store and calls
// Disclosure() as a plain function. WHAT THAT CANNOT PROVE: real React batching, or that the browser lays the
// button out at the row's full width (the width CLASS is pinned here; the rendered width needs a browser).
import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const H = vi.hoisted(() => ({ on: false, slots: [] as unknown[], i: 0 }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const useState = (init: unknown) => {
    if (!H.on) return actual.useState(init as never);
    const idx = H.i++;
    if (!(idx in H.slots)) H.slots[idx] = init;
    return [H.slots[idx], (v: unknown) => { H.slots[idx] = typeof v === "function" ? (v as (p: unknown) => unknown)(H.slots[idx]) : v; }];
  };
  const useId = () => (H.on ? ":r0:" : actual.useId());
  return { ...actual, default: { ...actual, useState, useId }, useState, useId };
});

import { Disclosure } from "./disclosure";
import { Disclosure as DisclosureFromUi } from "@/components/ui";

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

beforeEach(() => {
  H.on = false;
  H.slots = [];
  H.i = 0;
});

describe("Disclosure", () => {
  it("renders the label text", () => {
    const html = render(<Disclosure label="Show details"><p>Hidden content</p></Disclosure>);
    expect(html).toContain("Show details");
  });

  it("renders a button with aria-expanded=false by default (closed)", () => {
    const html = render(<Disclosure label="Filter"><p>Options</p></Disclosure>);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("<button");
  });

  it("renders with aria-expanded=true when defaultOpen", () => {
    const html = render(<Disclosure label="Filter" defaultOpen><p>Options</p></Disclosure>);
    expect(html).toContain('aria-expanded="true"');
  });

  it("includes aria-controls pointing to the panel id", () => {
    const html = render(<Disclosure label="Filter"><p>Panel</p></Disclosure>);
    const controls = html.match(/aria-controls="([^"]+)"/)?.[1];
    expect(controls).toBeTruthy();
    // The panel element should have that id
    expect(html).toContain(`id="${controls}"`);
  });

  it("renders an SVG chevron icon", () => {
    const html = render(<Disclosure label="Filter"><p>Panel</p></Disclosure>);
    expect(html).toContain("<svg");
  });

  it("always renders children in the DOM (SSR; visibility toggled by CSS)", () => {
    const html = render(<Disclosure label="Filter"><p data-content="panel">Content</p></Disclosure>);
    expect(html).toContain("data-content=\"panel\"");
    expect(html).toContain(">Content<");
  });

  it("uses the grid overflow hidden pattern for CSS-driven height animation", () => {
    const html = render(<Disclosure label="Filter"><p>Panel</p></Disclosure>);
    expect(html).toContain("overflow-hidden");
    expect(html).toMatch(/grid-rows-\[0fr\]|grid-rows-\[1fr\]/);
  });

  it("is re-exported from @/components/ui", () => {
    expect(DisclosureFromUi).toBe(Disclosure);
  });

  // A collapsed panel is only squashed to zero height by CSS: its fields stay in the tab order and the accessibility
  // tree, so a keyboard user tabs through invisible inputs. `inert` takes it out of both until it opens.
  const panel = (html: string) => /<div id="[^"]*-panel"[^>]*>/.exec(html)![0];

  it("makes the closed panel inert, so nothing inside it can be tabbed to or read", () => {
    expect(panel(render(<Disclosure label="Filter"><input name="q" /></Disclosure>))).toMatch(/\sinert=""/);
  });

  it("leaves an open panel interactive", () => {
    expect(panel(render(<Disclosure label="Filter" defaultOpen><input name="q" /></Disclosure>))).not.toContain("inert");
  });

  // The panel clips overflow (that is what lets the height collapse), and a focus ring is 2px wide plus a 2px offset:
  // 4px beyond the field. So the clip edge must sit 4px outside the content, on the PANEL itself (a padding on the
  // root is outside the clip and protects nothing).
  const classesOf = (tag: string) => new Set(/class="([^"]*)"/.exec(tag)![1].split(/\s+/));

  it("puts the panel's clip edge 4px outside its content so edge fields keep their whole focus ring", () => {
    const classes = classesOf(panel(render(<Disclosure label="Filter"><input name="q" /></Disclosure>)));
    expect(classes).toContain("overflow-hidden");
    expect(classes).toContain("-mx-1");
    expect(classes).toContain("px-1");
    expect(classes).not.toContain("px-0.5");
  });

  it("styles the button like the project's other controls: hover fill, 150ms explicit-property transition, press scale", () => {
    const button = /<button[^>]*>/.exec(render(<Disclosure label="Filter"><p>p</p></Disclosure>))![0];
    const classes = classesOf(button);
    expect(classes).toContain("hover:bg-surface-2");
    expect(classes).toContain("duration-[var(--dur-fast)]");
    expect(classes).toContain("ease-[var(--ease-standard)]");
    expect(classes).toContain("active:scale-[var(--scale-press-lg)]");
    expect([...classes].some((c) => /^transition-\[[^\]]*background-color[^\]]*transform[^\]]*\]$/.test(c))).toBe(true);
    expect(classes).not.toContain("transition-all");
    expect(classes).not.toContain("transition");
  });

  it("lets a long label shrink and wrap instead of pushing the chevron out of the row", () => {
    const html = render(<Disclosure label="x"><p>p</p></Disclosure>);
    expect(html).toMatch(/<span class="[^"]*\bmin-w-0\b[^"]*\bflex-1\b[^"]*">x<\/span>/);
  });

  const rootTag = (html: string) => /^<div\b[^>]*>/.exec(html)![0];
  const buttonTag = (html: string) => /<button\b[^>]*>/.exec(html)![0];
  const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
  const closed = render(<Disclosure label="Filter"><p>p</p></Disclosure>);
  const opened = render(<Disclosure label="Filter" defaultOpen><p>p</p></Disclosure>);

  // An auto-width <button> is fit-content even as a flex container, so negative margins alone never stretch it: the
  // chevron sat right after the label, the hover fill covered the text only and the empty right part was unclickable.
  // Root `px-1.5` leaves 6px each side; the button is content + 12px wide and starts 6px left, so it spans the root's
  // box exactly. The panel's 4px clip bleed (-mx-1 px-1) is inside those 6px, so neither can reach past the root and
  // nothing scrolls horizontally at the viewport edge.
  it("stretches the button across the whole row: content width plus the 6px bleed each side, inside the root's px-1.5", () => {
    const button = classesOf(buttonTag(closed));
    expect(button).toContain("w-[calc(100%+0.75rem)]");
    expect(button).toContain("-mx-1.5");
    expect(button).toContain("px-1.5");
    expect(button).toContain("flex");
    expect(classesOf(rootTag(closed))).toContain("px-1.5");
  });

  it("keeps the root padding at least as wide as every bleed, so nothing overflows the row", () => {
    const px = (tokens: Set<string>, re: RegExp) => [...tokens].map((c) => re.exec(c)?.[1]).filter(Boolean).map(Number);
    const root = px(classesOf(rootTag(closed)), /^px-(\d(?:\.5)?)$/);
    const buttonBleed = px(classesOf(buttonTag(closed)), /^-mx-(\d(?:\.5)?)$/);
    const panelBleed = px(classesOf(panel(closed)), /^-mx-(\d(?:\.5)?)$/);
    expect(root).toEqual([1.5]);
    expect(buttonBleed).toEqual([1.5]);
    expect(panelBleed).toEqual([1]);
    expect(Math.max(...buttonBleed, ...panelBleed)).toBeLessThanOrEqual(root[0]);
  });

  it("keeps the className prop on the root, next to the built-in padding", () => {
    const root = classesOf(rootTag(render(<Disclosure label="x" className="border-b mt-2"><p>p</p></Disclosure>)));
    expect(root).toContain("border-b");
    expect(root).toContain("mt-2");
    expect(root).toContain("px-1.5");
  });

  // The 44px used to come only from py-3 plus one text-sm line: change either and a touch target quietly shrinks.
  it("has an explicit 44px touch floor on coarse pointers", () => {
    expect(classesOf(buttonTag(closed))).toContain("pointer-coarse:min-h-11");
  });

  it("is a non-submitting button with its own id", () => {
    const button = buttonTag(closed);
    expect(attr(button, "type")).toBe("button");
    expect(attr(button, "id")).toBeTruthy();
  });

  it("wires aria-controls to the PANEL id and the region's aria-labelledby to the BUTTON id", () => {
    const button = buttonTag(closed);
    const region = panel(closed);
    const buttonId = attr(button, "id")!;
    const panelId = attr(region, "id")!;
    expect(panelId).toBeTruthy();
    expect(panelId).not.toBe(buttonId);
    expect(attr(button, "aria-controls")).toBe(panelId);
    expect(attr(region, "aria-labelledby")).toBe(buttonId);
    expect(region).toContain('role="region"');
    expect(closed.match(new RegExp(`id="${buttonId}"`, "g"))).toHaveLength(1);
  });

  it("never lets the chevron shrink, and turns it over only while open", () => {
    const chevron = (html: string) => classesOf(/<svg\b[^>]*>/.exec(html)![0]);
    expect(chevron(closed)).toContain("shrink-0");
    expect(chevron(opened)).toContain("shrink-0");
    expect(chevron(closed)).not.toContain("rotate-180");
    expect(chevron(opened)).toContain("rotate-180");
  });

  it("collapses with exactly one of the two grid rows, and the inner box can shrink to zero", () => {
    expect(classesOf(panel(closed))).toContain("grid-rows-[0fr]");
    expect(classesOf(panel(closed))).not.toContain("grid-rows-[1fr]");
    expect(classesOf(panel(opened))).toContain("grid-rows-[1fr]");
    expect(classesOf(panel(opened))).not.toContain("grid-rows-[0fr]");
    expect(closed).toMatch(/<div class="min-h-0">/);
  });

  describe("toggling (hook store; see the header for what this cannot prove)", () => {
    type P = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    const find = (node: ReactNode, pred: (type: unknown, p: P) => boolean, out: P[] = []): P[] => {
      if (Array.isArray(node)) node.forEach((c) => find(c, pred, out));
      else if (isValidElement(node)) {
        const p = node.props as P;
        if (pred(node.type, p)) out.push(p);
        find(p.children, pred, out);
      }
      return out;
    };
    const show = (defaultOpen?: boolean) => {
      H.on = true;
      H.i = 0;
      const tree = Disclosure({ label: "Filter", defaultOpen, children: <p>p</p> }) as ReactNode;
      return {
        button: find(tree, (t) => t === "button")[0],
        region: find(tree, (_t, p) => p.role === "region")[0],
      };
    };

    it("a click opens a closed panel and un-inerts it; a second click closes and re-inerts it", () => {
      const first = show();
      expect(first.button["aria-expanded"]).toBe(false);
      expect(first.region.inert).toBe(true);
      first.button.onClick();
      const second = show();
      expect(second.button["aria-expanded"]).toBe(true);
      expect(second.region.inert).toBe(false);
      second.button.onClick();
      const third = show();
      expect(third.button["aria-expanded"]).toBe(false);
      expect(third.region.inert).toBe(true);
    });

    it("a click closes a panel that started open", () => {
      show(true).button.onClick();
      expect(show(true).button["aria-expanded"]).toBe(false);
    });
  });
});
