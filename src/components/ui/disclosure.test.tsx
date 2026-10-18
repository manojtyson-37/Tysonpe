import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Disclosure } from "./disclosure";
import { Disclosure as DisclosureFromUi } from "@/components/ui";

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

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
});
