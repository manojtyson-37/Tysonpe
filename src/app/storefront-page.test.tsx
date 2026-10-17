import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const state = vi.hoisted(() => ({
  creator: null as null | Record<string, unknown>,
}));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  usePathname: () => "/",
}));
const findUnique = vi.hoisted(() => vi.fn<(args: unknown) => Promise<unknown>>(async () => state.creator));
vi.mock("@/lib/db", () => ({ db: { creator: { findUnique } } }));

import Link from "next/link";
import { AvatarImage } from "@/components/ui/avatar-image";
import { Avatar } from "@/components/Brand";
import { Price } from "@/components/ui";
import { brandRingColor, brandTextColor, contrastRatio, readableOn } from "@/lib/color";
import { functionProps } from "@/test/rsc-safe";
import Storefront from "./(site)/c/[handle]/page";

const LIGHT = "#f59e0b"; // amber: a creator colour that fails as text on white (about 2:1)

const product = (n: number, over: Record<string, unknown> = {}) => ({
  id: `p${n}`,
  slug: `product-${n}`,
  title: `Product ${n}`,
  tagline: `Tagline ${n}`,
  type: "course",
  status: "published",
  pricePaise: 49900 + n * 100,
  billing: "one_time",
  createdAt: new Date(2026, 0, 10 - n),
  ...over,
});

function creator(count: number, over: Record<string, unknown> = {}) {
  return {
    id: "cr1",
    handle: "meera",
    displayName: "Meera Nair",
    bio: "I teach bookkeeping to small shop owners.",
    brandColor: LIGHT,
    products: Array.from({ length: count }, (_, i) => product(i + 1)),
    _count: { channels: 0 },
    ...over,
  };
}

beforeEach(() => {
  state.creator = creator(4);
  findUnique.mockClear();
});

const call = () => Storefront({ params: Promise.resolve({ handle: "meera" }) } as never);
async function render(): Promise<string> {
  const tree: ReactNode = await call();
  return renderToStaticMarkup(<>{tree}</>);
}
const count = (html: string, needle: string) => html.split(needle).length - 1;
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("storefront: 1, 4 and 0 products", () => {
  it("1 product renders the wide row only: no list, no stray rule", async () => {
    state.creator = creator(1);
    const html = await render();
    expect(count(html, "<h2")).toBe(1);
    expect(html).toContain("Product 1");
    expect(html).not.toContain("<ul");
    expect(html).not.toContain("divide-y");
    expect(text(html)).toContain("1 product");
    expect(text(html)).not.toContain("1 products");
  });

  it("4 products render one wide row (the newest) and a ruled list of the other 3, in query order", async () => {
    const html = await render();
    expect(count(html, "<h2")).toBe(4);
    expect(count(html, "<li")).toBe(3);
    expect(count(html, "divide-y")).toBe(1);
    expect(count(html, "View product")).toBe(1);
    const wide = html.slice(0, html.indexOf("<ul"));
    expect(wide).toContain("Product 1");
    expect(wide).not.toContain("Product 2");
    const order = [2, 3, 4].map((n) => html.indexOf(`Product ${n}<`));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every((i) => i > html.indexOf("<ul"))).toBe(true);
    expect(text(html)).toContain("4 products");
  });

  it("list rows share the wide row's text inset, so the list and the lead read as one system", async () => {
    const html = await render();
    const wide = html.slice(0, html.indexOf("<ul"));
    const list = html.slice(html.indexOf("<ul"));
    expect(wide).toContain("p-5");
    expect(wide).toContain("sm:p-8");
    expect(count(list, "px-5")).toBe(3);
    expect(count(list, "sm:px-8")).toBe(3);
    expect(list).not.toContain("px-3");
  });

  it("every product links to its own page", async () => {
    const html = await render();
    for (const n of [1, 2, 3, 4]) expect(html).toContain(`href="/c/meera/product-${n}"`);
  });

  it("0 products render the empty state and neither a row nor a list", async () => {
    state.creator = creator(0);
    const html = await render();
    expect(text(html)).toContain("Nothing for sale yet");
    expect(text(html)).toContain("Meera Nair hasn&#x27;t published a product. Check back soon.");
    expect(html).not.toContain("<ul");
    expect(html).not.toContain("<h2");
    expect(html).not.toContain("View product");
    expect(text(html)).toContain("0 products");
  });

  it("an unknown handle is a 404", async () => {
    state.creator = null;
    await expect(call()).rejects.toThrow("NOT_FOUND");
  });
});

describe("storefront: no card-grid or pill idioms, hover is a border/tone shift", () => {
  it.each([1, 4])("none of the banned classes appear with %i products", async (n) => {
    state.creator = creator(n, { _count: { channels: 2 } });
    const html = await render();
    for (const banned of ["badge", "-translate-y", "shadow-lg", "shadow-", "group-hover:text-brand", "hover:scale", "animate-", "sm:grid-cols-2", "lg:grid-cols-3", "text-brand\"", "text-brand "]) {
      expect(html, banned).not.toContain(banned);
    }
    // Bare `transition` means `transition-property: all`; only the explicit colour transition is allowed.
    expect(html).not.toMatch(/\btransition(?![-\w])/);
  });

  it("hover changes colour only, over the fast duration", async () => {
    const html = await render();
    expect(html).toContain("hover:border-line-strong");
    expect(html).toContain("hover:bg-surface-2");
    expect(count(html, "transition-colors duration-(--dur-fast)")).toBe(4);
  });

  it("rows meet the 44px touch height on coarse pointers", async () => {
    const html = await render();
    expect(count(html, "pointer-coarse:min-h-11")).toBe(3);
  });

  it("the community link meets the 44px touch height too", async () => {
    state.creator = creator(4, { _count: { channels: 2 } });
    const html = await render();
    const link = html.match(/<a [^>]*href="\/c\/meera\/community"[^>]*>/)?.[0] ?? "";
    expect(link).toContain("pointer-coarse:min-h-11");
    expect(count(html, "pointer-coarse:min-h-11")).toBe(4);
  });
});

describe("storefront: type is plain text", () => {
  it("shows the type label as muted meta text, not a pill", async () => {
    state.creator = creator(3);
    state.creator.products = [product(1, { type: "webinar" }), product(2, { type: "download" }), product(3, { type: "membership" })];
    const html = await render();
    expect(html).toMatch(/<p class="t-meta mt-3">Live webinar<\/p>/);
    expect(html).toMatch(/<p class="t-meta mt-1">Digital download<\/p>/);
    expect(html).toMatch(/<p class="t-meta mt-1">Membership<\/p>/);
    expect(html).not.toContain("rounded-full");
  });

  it("does not invent a label the data cannot back", async () => {
    const t = text(await render());
    for (const word of ["Featured", "Best seller", "Bestseller", "Popular", "Trending"]) expect(t).not.toContain(word);
  });

  it.each([1, 4])("does not call the lead 'Newest' or 'Latest': createdAt is not a release date (%i products)", async (n) => {
    state.creator = creator(n);
    const t = text(await render());
    for (const word of ["Newest", "Latest", "Newly"]) expect(t).not.toContain(word);
  });
});

describe("storefront: prices go through Money", () => {
  it("prints a paid price with the rupee sign in a tabular-nums span", async () => {
    const html = await render();
    expect(html).toContain('<span class="tabular-nums whitespace-nowrap text-2xl font-semibold sm:text-3xl">₹500</span>');
    expect(html).toContain('<span class="tabular-nums whitespace-nowrap">₹501</span>');
    const rupees = [...html.matchAll(/₹[\d,.]+/g)].length;
    const inMoney = [...html.matchAll(/<span class="tabular-nums[^"]*">₹[\d,.]+<\/span>/g)].length;
    expect(rupees).toBe(4);
    expect(inMoney).toBe(rupees);
  });

  it("prints Free for a zero price, with no rupee amount and no period", async () => {
    state.creator = creator(2);
    state.creator.products = [product(1, { pricePaise: 0, billing: "monthly" }), product(2, { pricePaise: 0 })];
    const html = await render();
    expect(count(html, ">Free</span>")).toBe(2);
    expect(html).not.toContain("₹");
    expect(html).not.toContain("/ month");
  });

  it("adds / month only for a paid monthly product", async () => {
    state.creator = creator(3);
    state.creator.products = [product(1, { billing: "monthly" }), product(2, { billing: "monthly" }), product(3)];
    const html = await render();
    expect(count(html, "/ month")).toBe(2);
    const last = html.slice(html.indexOf("Product 3"));
    expect(last).not.toContain("/ month");
  });
});

describe("storefront: header", () => {
  it("shows the real bio when there is one", async () => {
    const html = await render();
    expect(text(html)).toContain("I teach bookkeeping to small shop owners.");
    expect(html).toContain("<h1");
    expect(text(html)).toContain("Meera Nair");
  });

  it("renders nothing for an empty or missing bio, rather than filler", async () => {
    for (const bio of ["", null]) {
      state.creator = creator(4, { bio });
      const html = await render();
      expect(html).not.toContain("I teach");
      expect(html).not.toContain("max-w-2xl");
      expect(text(html)).toContain("Meera Nair 4 products");
    }
  });

  it("links to the community, worded 'Customer community', only when the creator has channels", async () => {
    expect(text(await render())).not.toContain("Customer community");
    state.creator = creator(4, { _count: { channels: 3 } });
    const html = await render();
    expect(html).toContain('href="/c/meera/community"');
    expect(text(html)).toContain("Customer community");
  });
});

describe("storefront: a light creator colour stays legible", () => {
  it("sets the contrast-safe brand text token and uses it for the brand-coloured text", async () => {
    const html = await render();
    expect(html).toContain(`--brand-text:${brandTextColor(LIGHT)}`);
    expect(html).toContain(`--brand-ink:${readableOn(LIGHT)}`);
    expect(html).toContain(`--brand-ring:${brandRingColor(LIGHT)}`);
    expect(html).toContain("text-[color:var(--brand-text)]");
    expect(brandTextColor(LIGHT)).not.toBe(LIGHT);
  });

  it("the avatar letter clears 4.5:1 on the brand fill, the brand text clears 4.5:1 on white and on paper (it is never drawn on the tint here)", () => {
    const ink = readableOn(LIGHT);
    expect(contrastRatio(ink, LIGHT)).toBeGreaterThanOrEqual(4.5);
    // The raw colour would fail as text: the reason the token exists.
    expect(contrastRatio(LIGHT, "#ffffff")).toBeLessThan(3);
    const text = brandTextColor(LIGHT);
    expect(contrastRatio(text, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    // brand text sits on the white wide row and on the paper canvas; the tinted band holds only ink text and the avatar
    expect(contrastRatio(text, "#fbfaf7")).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["#f59e0b", "#facc15", "#22c55e", "#0ea5e9", "#5b3df5", "#16130f"])("%s: avatar letter and brand text both clear 4.5:1 where they are drawn", (hex) => {
    expect(contrastRatio(readableOn(hex), hex)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(brandTextColor(hex), "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(brandTextColor(hex), "#fbfaf7")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("storefront: renders from a server component", () => {
  it("passes no function prop anywhere (renderToStaticMarkup would hide one)", async () => {
    state.creator = creator(4, { _count: { channels: 1 } });
    const visited = new Set<unknown>();
    expect(functionProps(await call(), [Link, AvatarImage], { onVisit: (t) => visited.add(t) })).toEqual([]);
    // the walk really reached the page's components, so "[]" is not an empty walk
    for (const type of [Link, Avatar, Price]) expect(visited.has(type)).toBe(true);
  });

  it("positive control: the same walk reports a function prop planted in the page tree", async () => {
    state.creator = creator(4, { _count: { channels: 1 } });
    const planted = (
      <>
        {await call()}
        <button onClick={() => {}}>x</button>
      </>
    );
    expect(functionProps(planted, [Link, AvatarImage])).toEqual(["<button>.onClick"]);
  });
});

describe("storefront: the public query is pinned", () => {
  type Args = { where: unknown; include: { products: { where: unknown; orderBy: unknown } } };
  const lastArgs = async (): Promise<Args> => {
    await render();
    expect(findUnique).toHaveBeenCalled();
    return findUnique.mock.calls[0][0] as Args;
  };

  it("loads only published products, so a draft never reaches a public page", async () => {
    const args = await lastArgs();
    expect(args.include.products.where).toEqual({ status: "published" });
  });

  it("orders products newest-created first with id as a tiebreak, so the lead is deterministic", async () => {
    const args = await lastArgs();
    expect(args.include.products.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
  });

  it("looks the creator up by lower-cased handle", async () => {
    const args = await lastArgs();
    expect(args.where).toEqual({ handle: "meera" });
  });
});
