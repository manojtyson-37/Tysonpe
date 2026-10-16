import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DASH_NAV_ITEMS, isDashNavActive, storefrontHref } from "./dash-nav-links";
import { isLinkActive } from "./ui/link-active";

const byKey = (key: string) => DASH_NAV_ITEMS.find((i) => i.key === key)!;

describe("DASH_NAV_ITEMS", () => {
  it("lists the eight console sections in order", () => {
    expect(DASH_NAV_ITEMS.map((i) => [i.label, i.href])).toEqual([
      ["Overview", "/dashboard"],
      ["Products", "/dashboard/products"],
      ["Orders", "/dashboard/orders"],
      ["Learners", "/dashboard/learners"],
      ["Community", "/dashboard/community"],
      ["Coupons", "/dashboard/coupons"],
      ["Payouts", "/dashboard/payouts"],
      ["Settings", "/dashboard/settings"],
    ]);
  });

  it("has unique keys and hrefs", () => {
    expect(new Set(DASH_NAV_ITEMS.map((i) => i.key)).size).toBe(DASH_NAV_ITEMS.length);
    expect(new Set(DASH_NAV_ITEMS.map((i) => i.href)).size).toBe(DASH_NAV_ITEMS.length);
  });

  it("only Overview is exact: it is the prefix of every other console route", () => {
    expect(DASH_NAV_ITEMS.filter((i) => i.match === "exact").map((i) => i.key)).toEqual(["overview"]);
  });

  it("every href is a page under the (console) group, so no link 404s", () => {
    for (const item of DASH_NAV_ITEMS) {
      const dir = item.href === "/dashboard" ? "" : `/${item.href.slice("/dashboard/".length)}`;
      expect(existsSync(`src/app/dashboard/(console)${dir}/page.tsx`), item.href).toBe(true);
    }
  });
});

describe("isDashNavActive", () => {
  it("Overview is active only on /dashboard itself", () => {
    expect(isDashNavActive("/dashboard", byKey("overview"))).toBe(true);
    expect(isDashNavActive("/dashboard/orders", byKey("overview"))).toBe(false);
    expect(isDashNavActive("/dashboard/", byKey("overview"))).toBe(false);
  });

  it("a section is active on its page and on nested routes", () => {
    expect(isDashNavActive("/dashboard/products", byKey("products"))).toBe(true);
    expect(isDashNavActive("/dashboard/products/new", byKey("products"))).toBe(true);
    expect(isDashNavActive("/dashboard/products/abc123/edit", byKey("products"))).toBe(true);
  });

  it("respects segment boundaries: /dashboard/productsX is not Products", () => {
    expect(isDashNavActive("/dashboard/productsX", byKey("products"))).toBe(false);
    expect(isDashNavActive("/dashboard/products-archive", byKey("products"))).toBe(false);
    expect(isDashNavActive("/dashboard/order", byKey("orders"))).toBe(false);
  });

  it("exactly one item is active on any console route", () => {
    const paths = ["/dashboard", "/dashboard/orders", "/dashboard/orders/42", "/dashboard/settings", "/dashboard/community/p/1"];
    for (const path of paths) {
      expect(DASH_NAV_ITEMS.filter((i) => isDashNavActive(path, i)), path).toHaveLength(1);
    }
  });

  it("no item is active outside the console or without a pathname", () => {
    for (const path of ["/", "/library", "/dashboard/onboarding", null, undefined, ""]) {
      expect(DASH_NAV_ITEMS.filter((i) => isDashNavActive(path, i)), String(path)).toHaveLength(0);
    }
  });

  it("answers exactly as Tabs link mode does (both call isLinkActive), for every item and path", () => {
    const paths = ["/dashboard", "/dashboard/products", "/dashboard/products/new", "/dashboard/productsX", "/dashboard/payouts/", "/"];
    for (const item of DASH_NAV_ITEMS) {
      for (const path of paths) expect(isDashNavActive(path, item), `${item.key} @ ${path}`).toBe(isLinkActive(path, item.href, item.match));
    }
  });
});

describe("storefrontHref", () => {
  it("points at the creator's own public storefront", () => {
    expect(storefrontHref("asha")).toBe("/c/asha");
  });
});
