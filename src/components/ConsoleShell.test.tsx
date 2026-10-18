import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard/orders" }));
vi.mock("@/app/actions/auth", () => ({ logout: async () => {} }));
vi.mock("@/lib/auth/session", () => ({
  requireCreator: async () => ({ user: { id: "u1" }, creator: { handle: "asha", displayName: "Asha Rao" } }),
}));

import ConsoleLayout from "@/app/dashboard/(console)/layout";
import { ConsoleTopBar } from "./ConsoleTopBar";
import { SkipLink } from "./SkipLink";
import { DASH_NAV_ITEMS } from "./dash-nav-links";

function tagAttrs(html: string, tag: string): Record<string, string>[] {
  return [...html.matchAll(new RegExp(`<${tag}\\s((?:"[^"]*"|'[^']*'|[^>"'])*)>`, "g"))].map((match) =>
    Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((attr) => [attr[1], attr[2]])),
  );
}

const noop = () => {};
const bar = () => renderToStaticMarkup(<ConsoleTopBar creatorName="Asha Rao" storefrontHref="/c/asha" logoutAction={noop} />);
const page = async () => renderToStaticMarkup(await ConsoleLayout({ children: <p>PAGE BODY</p> }));

describe("ConsoleTopBar", () => {
  it("is the same sticky h-14 bar as the public shell", () => {
    const html = bar();
    expect(html).toMatch(/^<header [^>]*class="[^"]*sticky top-0[^"]*"/);
    expect(html).toMatch(/class="[^"]*\bh-14\b[^"]*"/);
    expect(html).toContain("border-b border-line");
  });

  it("the wordmark goes to the dashboard, not the marketing site, and has an accessible name", () => {
    const logo = tagAttrs(bar(), "a").find((a) => a["aria-label"] === "Tysonpe dashboard")!;
    expect(logo.href).toBe("/dashboard");
    // 33px tall without this: a 44px target under a coarse pointer
    expect(logo.class).toContain("pointer-coarse:min-h-11");
    expect(logo.class).toContain("inline-flex");
    // items-center keeps the wordmark centred in that 44px box; shrink-0 keeps it from being squeezed by the name beside it
    expect(logo.class).toContain("items-center");
    expect(logo.class).toContain("shrink-0");
  });

  it("shows the creator's display name and links to their own storefront", () => {
    const html = bar();
    expect(html).toContain(">Asha Rao</span>");
    const link = tagAttrs(html, "a").find((a) => a.href === "/c/asha")!;
    expect(link).toBeDefined();
    expect(html).toMatch(/<a [^>]*href="\/c\/asha"[^>]*>View storefront/);
    expect(link.target).toBeUndefined();
  });

  it("log out is a real form, shown from lg up (the drawer carries it below)", () => {
    const html = bar();
    expect(tagAttrs(html, "form")).toHaveLength(1);
    expect(html).toMatch(/<form [^>]*class="[^"]*hidden lg:block/);
    expect(html).toMatch(/<button [^>]*type="submit"[^>]*>Log out<\/button>/);
  });

  it("holds the drawer trigger, hidden from lg up, and switches at lg only", () => {
    const html = bar();
    const trigger = tagAttrs(html, "button").find((a) => a["aria-label"] === "Dashboard menu")!;
    expect(trigger["aria-expanded"]).toBe("false");
    expect(trigger.class).toContain("lg:hidden");
    expect(html).not.toMatch(/\bmd:/);
  });

  it("is not the marketing nav: no Main landmark, no marketing links, no sign-up action", () => {
    const html = bar();
    expect(html).not.toContain('aria-label="Main"');
    expect(html).not.toMatch(/Checkout demo|Start selling|Sample storefront|Log in</);
  });

  it("uses radius tokens, 14px text, and no entrance motion", () => {
    const html = bar();
    expect(html).not.toMatch(/rounded-xl|rounded-\[|text-xs|animate-|transition-all/);
  });
});

describe("SkipLink", () => {
  it("targets #main, is screen-reader-only until focused, and paints above the bar and the sheets", () => {
    const [a] = tagAttrs(renderToStaticMarkup(<SkipLink />), "a");
    expect(a.href).toBe("#main");
    expect(a.class).toContain("sr-only");
    expect(a.class).toContain("focus:not-sr-only");
    expect(a.class).toContain("focus:z-[70]");
  });
});

describe("ConsoleLayout", () => {
  it("renders the skip link first, then the console bar, the sidebar and the page in <main id=main>", async () => {
    const html = await page();
    const skip = html.indexOf("<a ");
    const header = html.indexOf("<header");
    const aside = html.indexOf("<aside");
    const main = html.indexOf('<main id="main"');
    expect(skip).toBe(0); // the first element in the document, so the first Tab stop
    expect(html).toMatch(/^<a href="#main"/);
    expect(skip).toBeLessThan(header);
    expect(header).toBeLessThan(aside);
    expect(aside).toBeLessThan(main);
    expect(html).toMatch(/<main id="main" tabindex="-1"[^>]*>(?:(?!<\/main>).)*PAGE BODY/);
    expect(html.match(/<main\b/g)).toHaveLength(1);
  });

  it("no longer renders the marketing SiteNav", async () => {
    const html = await page();
    expect(html).not.toContain('aria-label="Main"');
    expect(html).not.toContain('aria-label="Tysonpe home"');
    expect(html).not.toMatch(/Checkout demo|Start selling|Sample storefront/);
    const source = readFileSync("src/app/dashboard/(console)/layout.tsx", "utf8");
    expect(source).not.toMatch(/SiteNav/);
  });

  it("the sidebar is one Dashboard nav with every console link, active on the current route", async () => {
    const html = await page();
    const aside = /<aside[^>]*>((?:(?!<\/aside>).)*)<\/aside>/.exec(html)![1];
    expect(aside.match(/<nav /g)).toHaveLength(1);
    expect(aside).toContain('aria-label="Dashboard"');
    expect(tagAttrs(aside, "a").map((a) => a.href)).toEqual(DASH_NAV_ITEMS.map((i) => i.href));
    expect(tagAttrs(aside, "a").filter((a) => a["aria-current"] === "page").map((a) => a.href)).toEqual(["/dashboard/orders"]);
  });

  it("the sidebar column is lg and up only (the drawer takes over), with no horizontal scroller left", async () => {
    const html = await page();
    expect(tagAttrs(html, "aside")[0].class).toMatch(/\bhidden\b.*\blg:block\b/);
    expect(html).not.toContain("overflow-x-auto");
    expect(html).not.toMatch(/\bmd:/);
  });

  it("the storefront link uses the creator's own handle", async () => {
    const html = await page();
    expect(tagAttrs(html, "a").filter((a) => a.href === "/c/asha")).toHaveLength(1);
    expect(html).toContain("Asha Rao");
  });
});
