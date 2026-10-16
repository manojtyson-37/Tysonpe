import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PageHeader } from "./page-header";
import { PageHeader as PageHeaderFromUi } from "@/components/ui";

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("PageHeader", () => {
  it("renders the title as an h1", () => {
    const html = render(<PageHeader title="Orders" />);
    expect(html).toContain("<h1");
    expect(html).toContain(">Orders<");
  });

  it("renders the sub text when provided", () => {
    const html = render(<PageHeader title="Orders" sub="Manage your store orders" />);
    expect(html).toContain("Manage your store orders");
  });

  it("omits sub when not provided", () => {
    const html = render(<PageHeader title="Orders" />);
    expect(html.match(/<p/g) ?? []).toHaveLength(0);
  });

  it("renders the back link as an anchor with the given href", () => {
    const html = render(<PageHeader title="Order details" back={{ label: "Back to orders", href: "/orders" }} />);
    expect(html).toContain('<a');
    expect(html).toContain('href="/orders"');
    expect(html).toContain("Back to orders");
  });

  it("includes an SVG arrow icon in the back link", () => {
    const html = render(<PageHeader title="Details" back={{ label: "Back", href: "/" }} />);
    expect(html).toContain("<svg");
  });

  it("renders the actions slot", () => {
    const html = render(<PageHeader title="Orders" actions={<button type="button">Export</button>} />);
    expect(html).toContain("<button");
    expect(html).toContain(">Export<");
  });

  it("renders the meta slot below the title", () => {
    const html = render(
      <PageHeader title="Order #123" meta={<span className="badge">Paid</span>} />
    );
    expect(html).toContain("badge");
    expect(html).toContain(">Paid<");
  });

  it("does not include an eyebrow by default", () => {
    // No element before the h1 that would serve as an eyebrow
    const html = render(<PageHeader title="Orders" />);
    expect(html).not.toContain("t-eyebrow");
    expect(html).not.toContain("eyebrow");
  });

  it("is re-exported from @/components/ui", () => {
    expect(PageHeaderFromUi).toBe(PageHeader);
  });
});
