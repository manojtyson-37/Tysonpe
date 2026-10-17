import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EmptyState, type EmptyActionItem } from "./empty";
import { functionProps } from "@/test/rsc-safe";
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
    // The title is itself a <p>; only the body paragraph (muted, max-w-sm) must be absent.
    expect(html.match(/<p\b/g)).toHaveLength(1);
    expect(html).not.toContain("mt-1 max-w-sm text-sm text-muted");
    const withBody = render(<EmptyState title="Empty" body="Nothing here." />);
    expect(withBody.match(/<p\b/g)).toHaveLength(2);
    expect(withBody).toContain('class="mt-1 max-w-sm text-sm text-muted"');
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

  it("a button action carries a handler, which makes it client-only; a link action does not", () => {
    const withHandler = <EmptyState title="No products" action={{ label: "Add product", onClick: () => {} }} />;
    expect(functionProps(withHandler)).toEqual(["<button>.onClick"]);
    expect(functionProps(<EmptyState title="No products" action={{ label: "Add product", href: "/new" }} />)).toEqual([]);
  });

  it("requires exactly one of href or onClick (a bare label would be a dead button)", () => {
    // Compile-time contract: each @ts-expect-error fails `npm run typecheck` if the line stops being an error.
    // @ts-expect-error neither href nor onClick
    const neither: EmptyActionItem = { label: "Add" };
    // @ts-expect-error both href and onClick
    const both: EmptyActionItem = { label: "Add", href: "/a", onClick: () => {} };
    expect([neither, both]).toHaveLength(2);
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

  // `.btn-outline` has never existed in globals.css, so the secondary action rendered unstyled. `.btn-secondary` does.
  it("styles the secondary action with the real btn-secondary class, as an anchor or a button", () => {
    for (const secondaryAction of [{ label: "Learn more", href: "/docs" }, { label: "Learn more", onClick: vi.fn() }]) {
      const html = render(<EmptyState title="No data" action={{ label: "Import", href: "/import" }} secondaryAction={secondaryAction} />);
      expect(html).toContain('class="btn btn-secondary"');
      expect(html).toContain('class="btn btn-primary"');
      expect(html).not.toContain("btn-outline");
    }
  });

  it("lets the caller put a size floor on every action", () => {
    const html = render(
      <EmptyState
        title="No data"
        actionClassName="pointer-coarse:min-h-11"
        action={{ label: "Import", href: "/import" }}
        secondaryAction={{ label: "Learn more", onClick: vi.fn() }}
      />
    );
    expect(html).toContain('class="btn btn-primary pointer-coarse:min-h-11"');
    expect(html).toContain('class="btn btn-secondary pointer-coarse:min-h-11"');
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
