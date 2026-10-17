import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const state = vi.hoisted(() => ({
  product: null as null | Record<string, unknown>,
  user: null as null | Record<string, unknown>,
  enrolled: false,
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
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: async () => state.user }));
const findFirst = vi.hoisted(() => vi.fn<(args: unknown) => Promise<unknown>>(async () => state.product));
const findEnrollment = vi.hoisted(() => vi.fn<(args: unknown) => Promise<unknown>>(async () => (state.enrolled ? { id: "e1" } : null)));
vi.mock("@/lib/db", () => ({ db: { product: { findFirst }, enrollment: { findUnique: findEnrollment } } }));

import Link from "next/link";
import { Avatar } from "@/components/Brand";
import { ButtonLink, Callout, Price, Surface } from "@/components/ui";
import { functionProps } from "@/test/rsc-safe";
import ProductPage from "./(site)/c/[handle]/[slug]/page";

const items = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `i${i + 1}`, title: `Lesson title ${i + 1}`, kind: ["video", "pdf", "text", "link", "quiz"][i % 5] }));

const product = (over: Record<string, unknown> = {}) => ({
  id: "p1",
  slug: "bookkeeping",
  creatorId: "cr1",
  title: "Bookkeeping for shop owners",
  tagline: "Close your books in an afternoon",
  description: "Learn the ledger.\nStep by step.",
  type: "course",
  status: "published",
  pricePaise: 49900,
  billing: "one_time",
  gstRatePct: 18,
  creator: { id: "cr1", handle: "meera", displayName: "Meera Nair", brandColor: "#f59e0b" },
  items: items(5),
  ...over,
});

beforeEach(() => {
  state.product = product();
  state.user = null;
  state.enrolled = false;
  findFirst.mockClear();
  findEnrollment.mockClear();
});

const call = () => ProductPage({ params: Promise.resolve({ handle: "Meera", slug: "bookkeeping" }) } as never);
async function render(): Promise<string> {
  const tree: ReactNode = await call();
  return renderToStaticMarkup(<>{tree}</>);
}
const count = (html: string, needle: string) => html.split(needle).length - 1;
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const aside = (html: string) => html.slice(html.indexOf("<aside"), html.indexOf("</aside>"));
const ctaLinks = (html: string) => [...html.matchAll(/<a [^>]*class="btn [^"]*"[^>]*>/g)].map((m) => m[0]);

describe("product page: variants", () => {
  it("paid one-time: price, GST note from the product's own rate, Buy now to checkout", async () => {
    const html = await render();
    expect(html).toContain('<span class="tabular-nums whitespace-nowrap text-2xl font-semibold sm:text-3xl">₹499</span>');
    expect(text(aside(html))).toContain("₹499 incl. 18% GST");
    expect(html).not.toContain("/ month");
    expect(html).toMatch(/<a [^>]*href="\/checkout\/p1"[^>]*>Buy now<\/a>/);
  });

  it("pins a non-18 GST rate: the note reads the product's gstRatePct", async () => {
    state.product = product({ gstRatePct: 5 });
    const html = await render();
    expect(text(html)).toContain("incl. 5% GST");
    expect(text(html)).not.toContain("18%");
  });

  it("free: bare Free, no rupee amount, no GST note, no invoice line, Get it free", async () => {
    state.product = product({ pricePaise: 0, gstRatePct: 18 });
    const html = await render();
    expect(html).toContain(">Free</span>");
    expect(html).not.toContain("₹");
    expect(text(html)).not.toContain("GST");
    expect(text(html)).not.toContain("invoice");
    expect(text(html)).not.toContain("test mode");
    expect(text(html)).toContain("Instant access in your library");
    expect(html).toMatch(/<a [^>]*href="\/checkout\/p1"[^>]*>Get it free<\/a>/);
  });

  it("membership (monthly, paid): shows / month with the GST note", async () => {
    state.product = product({ type: "membership", billing: "monthly", pricePaise: 29900, items: [] });
    const html = await render();
    expect(text(aside(html))).toContain("₹299 / month incl. 18% GST");
    expect(text(html)).toContain("Membership");
    expect(html).toMatch(/>Buy now<\/a>/);
  });

  it("a free monthly product shows Free with no period", async () => {
    state.product = product({ pricePaise: 0, billing: "monthly" });
    const html = await render();
    expect(html).not.toContain("/ month");
  });

  it("owned: Open in your library is the one action, and no checkout link remains", async () => {
    state.user = { id: "u1", creator: null };
    state.enrolled = true;
    const html = await render();
    expect(html).toMatch(/<a [^>]*href="\/library\/p1"[^>]*>Open in your library<\/a>/);
    expect(html).not.toContain("/checkout/");
    expect(ctaLinks(html)).toHaveLength(1);
    expect(ctaLinks(html)[0]).toContain("btn-primary");
  });

  it("the owner (not enrolled) gets Edit product as a secondary action", async () => {
    state.user = { id: "u2", creator: { id: "cr1" } };
    const html = await render();
    expect(html).toMatch(/<a [^>]*href="\/dashboard\/products\/p1"[^>]*>Edit product<\/a>/);
    expect(ctaLinks(html)).toHaveLength(1);
    expect(ctaLinks(html)[0]).toContain("btn-secondary");
    expect(html).not.toContain("btn-primary");
  });

  it("a draft is a 404 for the public and for another creator", async () => {
    state.product = product({ status: "draft" });
    await expect(call()).rejects.toThrow("NOT_FOUND");
    state.user = { id: "u3", creator: { id: "other" } };
    await expect(call()).rejects.toThrow("NOT_FOUND");
  });

  it("a draft shows the owner a warn Callout and no checkout link", async () => {
    state.product = product({ status: "draft" });
    state.user = { id: "u2", creator: { id: "cr1" } };
    const html = await render();
    expect(text(html)).toContain("Draft preview. Only you can see this page until you publish.");
    expect(html).toContain("bg-warn-soft");
    expect(html).not.toContain("rounded-xl");
    expect(html).not.toContain("/checkout/");
    expect(ctaLinks(html)).toHaveLength(1);
  });

  it("a missing product is a 404", async () => {
    state.product = null;
    await expect(call()).rejects.toThrow("NOT_FOUND");
  });
});

describe("product page: the header block", () => {
  it("has no eyebrow: the h1 is the first block in the content column, and no pill exists", async () => {
    const html = await render();
    expect(html).not.toContain("badge");
    expect(html).not.toContain("rounded-full");
    expect(html).toMatch(/<div class="min-w-0"><h1 /);
  });

  it("the type line sits below the tagline: 'Course · 5 lessons'", async () => {
    const html = await render();
    expect(html).toMatch(/<p class="t-meta mt-3">Course · 5 lessons<\/p>/);
    expect(html.indexOf("Close your books")).toBeLessThan(html.indexOf("Course · 5 lessons"));
    expect(html.indexOf("<h1")).toBeLessThan(html.indexOf("Close your books"));
  });

  it("singular for one lesson, bare label for none, items for non-courses", async () => {
    state.product = product({ items: items(1) });
    expect(text(await render())).toContain("Course · 1 lesson");
    expect(text(await render())).not.toContain("1 lessons");
    state.product = product({ items: [] });
    const html = await render();
    expect(html).toMatch(/<p class="t-meta mt-3">Course<\/p>/);
    expect(html).not.toContain("What&#x27;s included");
    state.product = product({ type: "download", items: items(3) });
    expect(text(await render())).toContain("Digital download · 3 items");
  });

  it("the draft banner and creator link keep their copy, with a touch floor on the link", async () => {
    const html = await render();
    const link = html.match(/<a [^>]*href="\/c\/meera"[^>]*>/)?.[0] ?? "";
    expect(link).toContain("pointer-coarse:min-h-11");
    expect(link).toContain("transition-colors duration-(--dur-fast)");
    expect(text(html)).toContain("Meera Nair");
  });
});

describe("product page: the curriculum is a ruled list of plain text", () => {
  it("renders rows in order, numbered, with the kind as plain text and no card or pill", async () => {
    const html = await render();
    const list = html.slice(html.indexOf("<ol"), html.indexOf("</ol>"));
    expect(list).toContain("divide-y divide-line border-y border-line");
    expect(list).not.toContain("card");
    expect(count(list, "<li")).toBe(5);
    expect(list).toMatch(/<span class="t-meta shrink-0">Video<\/span>/);
    expect(list).toMatch(/<span class="t-meta shrink-0">PDF<\/span>/);
    expect(list).toMatch(/<span class="t-meta shrink-0">Reading<\/span>/);
    expect(list).toMatch(/<span class="t-meta shrink-0">Link<\/span>/);
    expect(list).toMatch(/<span class="t-meta shrink-0">Quiz<\/span>/);
    expect(list).toContain("tabular-nums");
    const order = [1, 2, 3, 4, 5].map((n) => list.indexOf(`Lesson title ${n}<`));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every((i) => i >= 0)).toBe(true);
  });

  it("invents no duration: ContentItem has no length field", async () => {
    const t = text(await render());
    expect(t).not.toMatch(/\b\d+\s*(min|mins|minutes|hr|hrs|hours|sec)\b/i);
    expect(t).not.toMatch(/\b\d+:\d{2}\b/);
    expect(t).not.toMatch(/duration/i);
  });
});

describe("product page: claims are limited to what is built", () => {
  it("paid lists three honest lines", async () => {
    const t = text(aside(await render()));
    expect(t).toContain("Instant access in your library");
    expect(t).toContain("An invoice for every order");
    expect(t).toContain("Payments run in test mode.");
  });

  it("the unbacked claims are absent for free and paid", async () => {
    for (const pricePaise of [49900, 0]) {
      state.product = product({ pricePaise });
      const t = text(await render());
      for (const word of ["UPI", "netbanking", "cards", "secure", "Secure", "guarantee", "refund", "GST invoice", "Instant access after payment"]) {
        expect(t, `${word} @ ${pricePaise}`).not.toContain(word);
      }
    }
  });

  it("the bullet list is hidden below lg, where the aside is a compact bar", async () => {
    const html = await render();
    expect(aside(html)).toMatch(/<ul class="[^"]*hidden[^"]*lg:block[^"]*"/);
  });
});

describe("product page: Taste v2 on a marketing page", () => {
  it("no resting shadow, glow, gradient, hover scale, animation or bare transition anywhere", async () => {
    for (const status of ["published", "draft"]) {
      state.product = product({ status });
      state.user = status === "draft" ? { id: "u2", creator: { id: "cr1" } } : null;
      const html = await render();
      for (const banned of ["shadow-sm", "shadow-", "gradient", "blur", "hover:scale", "animate-", "badge", "text-brand\"", "text-brand ", "text-good"]) {
        expect(html, banned).not.toContain(banned);
      }
      expect(html).not.toMatch(/\btransition(?![-\w])/);
    }
  });

  it("the h1 uses the display scale and wraps long words", async () => {
    expect(await render()).toMatch(/<h1 class="t-display break-words">/);
  });

  it("brand colour reaches the page only through the validated scope", async () => {
    const html = await render();
    expect(html).toContain("--brand:#f59e0b");
    state.product = product({ creator: { id: "cr1", handle: "meera", displayName: "Meera Nair", brandColor: "red;background:url(x)" } });
    const bad = await render();
    expect(bad).not.toContain("url(x)");
    expect(bad).toContain("--brand:#16130f");
  });
});

describe("product page: the panel, and the buy bar below lg", () => {
  it("the aside is sticky to the bottom edge on mobile and to the top offset from lg", async () => {
    const html = await render();
    const open = html.match(/<aside class="([^"]*)"/)?.[1] ?? "";
    const classes = open.split(" ");
    for (const c of ["sticky", "bottom-0", "lg:top-24", "lg:bottom-auto", "lg:self-start", "border-t", "border-line", "bg-bg", "lg:border-t-0", "lg:bg-transparent", "lg:p-0"]) {
      expect(classes, c).toContain(c);
    }
    expect(open).toContain("pb-[max(0.75rem,env(safe-area-inset-bottom))]");
    expect(open).not.toMatch(/\bfixed\b/);
    expect(open).not.toContain("shadow");
    expect(open).not.toContain("backdrop");
  });

  it("the content and aside share one flex-column parent (the aside's containing block) that turns into the two-column grid at lg", async () => {
    const html = await render();
    expect(html).toContain('class="mt-6 flex flex-col gap-10 lg:grid lg:grid-cols-[1fr_380px] lg:gap-14"');
    // content first, aside last: the bar ends the column on mobile
    expect(html.indexOf("<h1")).toBeLessThan(html.indexOf("<aside"));
    expect(html.indexOf("</aside>")).toBeGreaterThan(html.lastIndexOf("</section>"));
    expect(html.slice(html.indexOf("</aside>") + 8)).toBe("</div></div></div>");
  });

  it("no ancestor of the aside sets overflow (sticky would silently fail)", async () => {
    const html = await render();
    // everything that wraps the aside: from the brand scope down to the aside's open tag (the avatar's own overflow-hidden is a leaf, not an ancestor)
    const ancestors = html.slice(0, html.indexOf("<aside")).replace(/<a class="[^>]*>.*?<\/a>/, "");
    expect(ancestors).not.toMatch(/overflow/);
    expect(ancestors).toContain("mt-6 flex flex-col");
    expect(html).toContain("overflow-hidden"); // positive control: the avatar's leaf is in the string, so the filter above removed something real
  });

  it("one DOM element, one CTA link, a single price", async () => {
    const html = await render();
    expect(count(html, "<aside")).toBe(1);
    expect(ctaLinks(html)).toHaveLength(1);
    expect(count(html, "/checkout/p1")).toBe(1);
    expect(count(html, "₹")).toBe(1);
  });

  it("the panel is the Surface primitive: card on lg, flattened below it, no resting shadow", async () => {
    const html = await render();
    const panel = aside(html).match(/<div class="([^"]*)"/)?.[1] ?? "";
    expect(panel.split(" ")).toEqual(expect.arrayContaining(["card", "flex", "items-center", "justify-between", "lg:block", "max-lg:border-0", "max-lg:bg-transparent", "max-lg:p-0!", "max-lg:rounded-none"]));
    expect(panel).not.toContain("shadow");
  });

  it("the action keeps its width on the bar and fills the panel from lg", async () => {
    const cta = ctaLinks(await render())[0];
    expect(cta).toContain("shrink-0");
    expect(cta).toContain("lg:w-full");
    expect(cta).toContain("btn-lg");
  });
});

describe("product page: renders from a server component", () => {
  it("passes no function prop anywhere", async () => {
    state.user = { id: "u1", creator: null };
    const visited = new Set<unknown>();
    expect(functionProps(await call(), [Link], { onVisit: (t) => visited.add(t) })).toEqual([]);
    for (const type of [Link, Avatar, Price, Surface, ButtonLink]) expect(visited.has(type)).toBe(true);
  });

  it("the draft path (Callout) is walked clean too", async () => {
    state.product = product({ status: "draft" });
    state.user = { id: "u2", creator: { id: "cr1" } };
    const visited = new Set<unknown>();
    expect(functionProps(await call(), [Link], { onVisit: (t) => visited.add(t) })).toEqual([]);
    expect(visited.has(Callout)).toBe(true);
  });

  it("positive control: the same walk reports a function prop planted in the tree", async () => {
    const planted = (
      <>
        {await call()}
        <button onClick={() => {}}>x</button>
      </>
    );
    expect(functionProps(planted, [Link])).toEqual(["<button>.onClick"]);
  });
});

describe("product page: the query is pinned", () => {
  type Args = { where: { slug: string; creator: { handle: string } }; include: { creator: boolean; items: { orderBy: unknown; select: unknown } } };
  const args = async (): Promise<Args> => {
    await render();
    expect(findFirst).toHaveBeenCalled();
    return findFirst.mock.calls[0][0] as Args;
  };

  it("looks up by slug and lower-cased creator handle", async () => {
    const a = await args();
    expect(a.where).toEqual({ slug: "bookkeeping", creator: { handle: "meera" } });
  });

  it("orders lessons by position ascending", async () => {
    expect((await args()).include.items.orderBy).toEqual({ position: "asc" });
  });

  it("selects only what the page shows from each item", async () => {
    expect((await args()).include.items.select).toEqual({ id: true, title: true, kind: true });
  });

  it("checks enrollment for the signed-in user and this product, and not at all when signed out", async () => {
    await render();
    expect(findEnrollment).not.toHaveBeenCalled();
    state.user = { id: "u1", creator: null };
    await render();
    expect(findEnrollment).toHaveBeenCalledWith({ where: { userId_productId: { userId: "u1", productId: "p1" } } });
  });
});
