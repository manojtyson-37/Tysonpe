import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SiteNavView } from "./SiteNavView";
import { siteNavLinks, type SiteNavUser } from "./site-nav-links";

const noop = () => {};
const render = (user: SiteNavUser, handle = "demo") =>
  renderToStaticMarkup(<SiteNavView items={siteNavLinks({ user, storefrontHandle: handle })} logoutAction={noop} />);

describe("SiteNavView", () => {
  it("is a sticky header whose nav row keeps the h-14 height", () => {
    const html = render(null);
    expect(html).toMatch(/^<header [^>]*class="[^"]*sticky top-0[^"]*"/);
    expect(html).toMatch(/<nav [^>]*class="[^"]*\bh-14\b[^"]*"[^>]*aria-label="Main"|<nav [^>]*aria-label="Main"[^>]*class="[^"]*\bh-14\b/);
  });

  it("is hidden in print, so a printed invoice or certificate carries no site header", () => {
    expect(render(null)).toMatch(/^<header [^>]*class="[^"]*\bprint:hidden\b[^"]*"/);
  });

  it("links the wordmark home with an accessible name", () => {
    expect(render(null)).toMatch(/<a [^>]*aria-label="Tysonpe home"[^>]*href="\/"|<a [^>]*href="\/"[^>]*aria-label="Tysonpe home"/);
  });

  it("logged out: plain links are hidden below lg, the ink action is always visible", () => {
    const html = render(null);
    expect(html).toMatch(/<a [^>]*class="[^"]*hidden lg:inline-flex[^"]*"[^>]*>Fees<\/a>/);
    const action = html.match(/<a [^>]*class="([^"]*)"[^>]*>Start selling<\/a>/);
    expect(action?.[1]).toContain("btn-primary");
    expect(action?.[1]).not.toContain("hidden");
  });

  it("logged in: logout is a real form, hidden below lg (the sheet carries it)", () => {
    const html = render({ creator: {} });
    expect(html).toMatch(/<form [^>]*class="[^"]*hidden lg:block[^"]*"/);
    expect(html).toMatch(/<button [^>]*type="submit"[^>]*>Log out<\/button>/);
  });

  it("has exactly one ink-filled action per state", () => {
    for (const user of [null, { creator: null }, { creator: {} }]) {
      expect(render(user).match(/btn-primary/g)).toHaveLength(1);
    }
  });

  it("includes the hamburger trigger: a collapsed, named dialog button that only shows below lg", () => {
    const buttons = [...render(null).matchAll(/<button\s([^>]*)>/g)].map((m) =>
      Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]])),
    );
    const trigger = buttons.find((b) => b["aria-label"] === "Menu");
    expect(trigger).toBeDefined();
    expect(trigger?.type).toBe("button");
    expect(trigger?.["aria-expanded"]).toBe("false");
    expect(trigger?.["aria-haspopup"]).toBe("dialog");
    expect(trigger?.["aria-controls"]).toMatch(/-panel$/);
    expect(trigger?.class).toContain("lg:hidden");
  });

  it("keeps the desktop links at the 44px touch floor on coarse pointers (tablets with a wide viewport show them)", () => {
    const links = [...render(null).matchAll(/<a ([^>]*)>(Fees|Demo|Log in)<\/a>/g)];
    expect(links.length).toBeGreaterThan(0);
    for (const m of links) expect(m[1]).toContain("pointer-coarse:min-h-11");
  });
});
