import type { ReactNode } from "react";
import Link from "next/link";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
  usePathname: () => "/dashboard/products/new",
}));
vi.mock("@/app/actions/creator", () => ({ createProduct: async () => undefined }));

import { ProductForm } from "@/components/ProductForm";
import { PageHeader } from "@/components/ui";
import { functionProps } from "@/test/rsc-safe";
import NewProduct from "./dashboard/(console)/products/new/page";

const html = () => renderToStaticMarkup(<>{NewProduct() as ReactNode}</>);

describe("new product page", () => {
  it("has the h1, the sub line and a back link to the list", () => {
    const out = html();
    expect(out).toContain(">New product</h1>");
    expect(out).toContain("You can add lessons and publish after saving.");
    expect(out).toMatch(/<a [^>]*href="\/dashboard\/products"[^>]*>(?:<svg.*?<\/svg>)?Products<\/a>/);
  });

  it("puts the form on paper in a ruled section, not in a card box", () => {
    const out = html();
    expect(out).not.toMatch(/class="[^"]*\bcard\b/);
    expect(out).not.toContain("p-6");
    expect(out).toMatch(/<section aria-label="Product details" class="max-w-2xl border-t border-line pt-6">/);
    expect(out).toContain('name="title"');
    expect(out).toContain(">Create product</button>");
  });

  it("passes only the server action across the client boundary", () => {
    const visited = new Set<unknown>();
    // `createProduct` is a "use server" reference in production, so a function on ProductForm.action is the one allowed prop.
    expect(functionProps(NewProduct() as ReactNode, [ProductForm, Link], { onVisit: (t) => visited.add(t) })).toEqual(["<ProductForm>.action"]);
    expect(visited.has(PageHeader)).toBe(true);
    expect(visited.has(ProductForm)).toBe(true);
  });

  it("positive control: a handler planted in the page tree is reported as well", () => {
    const planted = (
      <>
        {NewProduct() as ReactNode}
        <button onClick={() => {}}>x</button>
      </>
    );
    expect(functionProps(planted, [ProductForm, Link])).toEqual(["<ProductForm>.action", "<button>.onClick"]);
  });
});
