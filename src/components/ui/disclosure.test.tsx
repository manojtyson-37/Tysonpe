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
});
