import { describe, expect, it } from "vitest";
import { footerGroups, siteNavLinks, storefrontHandleFor } from "./site-nav-links";

const pairs = (items: ReturnType<typeof siteNavLinks>) =>
  items.map((i) => [i.kind, i.label, "href" in i ? i.href : null]);

describe("siteNavLinks", () => {
  it("logged out: public links, then Log in and the ink Start selling action", () => {
    expect(pairs(siteNavLinks({ user: null, storefrontHandle: "demo" }))).toEqual([
      ["link", "Checkout demo", "/#sandbox-demo"],
      ["link", "Fees", "/#pricing"],
      ["link", "Sample storefront", "/c/demo"],
      ["link", "Log in", "/login"],
      ["action", "Start selling", "/signup?role=creator"],
    ]);
  });

  it("logged in as a creator: library, Dashboard action, Log out; storefront is their own", () => {
    expect(pairs(siteNavLinks({ user: { creator: {} }, storefrontHandle: "asha" }))).toEqual([
      ["link", "Checkout demo", "/#sandbox-demo"],
      ["link", "Fees", "/#pricing"],
      ["link", "Sample storefront", "/c/asha"],
      ["link", "My library", "/library"],
      ["action", "Dashboard", "/dashboard"],
      ["logout", "Log out", null],
    ]);
  });

  it("logged in without a creator profile: the action is Start selling, to onboarding", () => {
    const items = siteNavLinks({ user: { creator: null }, storefrontHandle: "demo" });
    expect(items.find((i) => i.kind === "action")).toMatchObject({ label: "Start selling", href: "/dashboard/onboarding" });
  });

  it("drops the storefront link when there is no handle", () => {
    const items = siteNavLinks({ user: null, storefrontHandle: "" });
    expect(items.some((i) => i.key === "storefront")).toBe(false);
  });

  it("has exactly one ink action and unique keys in every state", () => {
    for (const user of [null, { creator: null }, { creator: {} }]) {
      const items = siteNavLinks({ user, storefrontHandle: "demo" });
      expect(items.filter((i) => i.kind === "action")).toHaveLength(1);
      expect(new Set(items.map((i) => i.key)).size).toBe(items.length);
      expect(items.filter((i) => i.kind === "link").length).toBeLessThanOrEqual(5);
    }
  });

  it("only logout has no href, and it is only offered to a signed-in user", () => {
    const out = siteNavLinks({ user: null, storefrontHandle: "demo" });
    expect(out.some((i) => i.kind === "logout")).toBe(false);
    for (const i of siteNavLinks({ user: { creator: null }, storefrontHandle: "demo" })) {
      expect("href" in i).toBe(i.kind !== "logout");
    }
  });
});

describe("footerGroups", () => {
  // The routes that exist under src/app/(site) plus the two landing anchors.
  const REAL = [/^\/$/, /^\/demo$/, /^\/login$/, /^\/signup\?role=creator$/, /^\/library$/, /^\/c\/[\w-]+$/, /^\/#pricing$/, /^\/#sandbox-demo$/];

  it("links only to routes that exist, never to a bare # or an invented page", () => {
    const hrefs = footerGroups({ storefrontHandle: "demo" }).flatMap((g) => g.links.map((l) => l.href));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(REAL.some((re) => re.test(href)), href).toBe(true);
    expect(hrefs.join(" ")).not.toMatch(/privacy|terms|about/i);
  });

  it("omits the sample storefront when there is no demo handle", () => {
    const hrefs = footerGroups({ storefrontHandle: "" }).flatMap((g) => g.links.map((l) => l.href));
    expect(hrefs.some((h) => h.startsWith("/c/"))).toBe(false);
  });
});

describe("storefrontHandleFor", () => {
  it("a signed-in creator gets their own handle, never the demo one", () => {
    expect(storefrontHandleFor({ creator: { handle: "asha" } }, "demo")).toBe("asha");
  });

  it.each([
    ["logged out", null],
    ["logged in without a creator profile", { creator: null }],
    ["an unresolved user", undefined],
  ] as const)("%s: falls back to the demo handle", (_name, user) => {
    expect(storefrontHandleFor(user, "demo")).toBe("demo");
  });

  it("with no demo creator the fallback is empty, which hides the sample storefront link", () => {
    const handle = storefrontHandleFor(null, "");
    expect(handle).toBe("");
    expect(siteNavLinks({ user: null, storefrontHandle: handle }).some((i) => i.kind === "link" && i.key === "storefront")).toBe(false);
  });

  it("feeds the nav so a creator's Sample storefront link is their own page", () => {
    const user = { creator: { handle: "asha" } };
    const items = siteNavLinks({ user, storefrontHandle: storefrontHandleFor(user, "demo") });
    expect(items.find((i) => i.key === "storefront")).toMatchObject({ href: "/c/asha" });
  });
});
