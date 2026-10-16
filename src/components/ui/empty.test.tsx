import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EmptyState } from "./empty";
import { Empty, EmptyState as EmptyStateFromUi } from "@/components/ui";

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("EmptyState", () => {
  it("renders title and body", () => {
    const html = render(<EmptyState title="No orders yet" body="Your orders will appear here." />);
    expect(html).toContain(">No orders yet<");
    expect(html).toContain("Your orders will appear here.");
  });

  it("omits the body paragraph when body is absent", () => {
    const html = render(<EmptyState title="Empty" />);
    expect(html).not.toContain("<p");
  });

  it("renders the icon slot when provided", () => {
    const html = render(<EmptyState title="Empty" icon={<span data-testid="icon">📦</span>} />);
    expect(html).toContain("📦");
  });

  it("primary action renders as an anchor when href is given", () => {
    const html = render(
      <EmptyState title="No products" action={{ label: "Add product", href: "/products/new" }} />
    );
    expect(html).toContain('<a');
    expect(html).toContain('href="/products/new"');
    expect(html).toContain(">Add product<");
  });

  it("primary action renders as a button when onClick is given", () => {
    const html = render(
      <EmptyState title="No products" action={{ label: "Add product", onClick: vi.fn() }} />
    );
    expect(html).toContain("<button");
    expect(html).toContain(">Add product<");
    expect(html).not.toContain("<a");
  });

  it("renders the secondary action alongside the primary", () => {
    const html = render(
      <EmptyState
        title="No data"
        action={{ label: "Import", href: "/import" }}
        secondaryAction={{ label: "Learn more", href: "/docs" }}
      />
    );
    expect(html).toContain(">Import<");
    expect(html).toContain(">Learn more<");
  });

  it("default mode includes a card class", () => {
    const html = render(<EmptyState title="Empty" />);
    expect(html).toMatch(/\bcard\b/);
  });

  it("inline mode removes the card wrapper", () => {
    const html = render(<EmptyState title="Empty" inline />);
    expect(html).not.toMatch(/\bcard\b/);
  });

  it("is re-exported from @/components/ui as EmptyState", () => {
    expect(EmptyStateFromUi).toBe(EmptyState);
  });
});

describe("Empty backwards-compat alias", () => {
  it("Empty from @/components/ui renders the title and body (backwards compat)", () => {
    const html = render(<Empty title="No orders" body="Your orders will appear here." />);
    expect(html).toContain(">No orders<");
    expect(html).toContain("Your orders will appear here.");
  });
});
