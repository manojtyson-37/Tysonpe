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

  it("links the wordmark home with an accessible name", () => {
    expect(render(null)).toMatch(/<a [^>]*aria-label="Tysonpe home"[^>]*href="\/"|<a [^>]*href="\/"[^>]*aria-label="Tysonpe home"/);
  });

  it("logged out: plain links are hidden below md, the ink action is always visible", () => {
    const html = render(null);
    expect(html).toMatch(/<a [^>]*class="[^"]*hidden md:inline-flex[^"]*"[^>]*>Fees<\/a>/);
    const action = html.match(/<a [^>]*class="([^"]*)"[^>]*>Start selling<\/a>/);
    expect(action?.[1]).toContain("btn-primary");
    expect(action?.[1]).not.toContain("hidden");
  });

  it("logged in: logout is a real form, hidden below md (the sheet carries it)", () => {
    const html = render({ creator: {} });
    expect(html).toMatch(/<form [^>]*class="[^"]*hidden md:block[^"]*"/);
    expect(html).toMatch(/<button [^>]*type="submit"[^>]*>Log out<\/button>/);
  });

  it("has exactly one ink-filled action per state", () => {
    for (const user of [null, { creator: null }, { creator: {} }]) {
      expect(render(user).match(/btn-primary/g)).toHaveLength(1);
    }
  });

  it("includes the hamburger trigger", () => {
    expect(render(null)).toMatch(/aria-label="Menu"[^>]*>|aria-expanded="false"/);
  });
});
