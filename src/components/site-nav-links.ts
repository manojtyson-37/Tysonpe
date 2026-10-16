// The public site's link set, as data. SiteNavView (desktop row) and MobileMenu (sheet) both render this one array,
// so a link added here appears in both and the two can never drift. Pure: no server or client imports.

export type SiteNavItem =
  | { kind: "link"; key: string; href: string; label: string }
  /** The single ink-filled call to action. Visible at every width, and repeated in the mobile sheet. */
  | { kind: "action"; key: string; href: string; label: string }
  /** Rendered by each surface as a real server-action form: it has no href. */
  | { kind: "logout"; key: string; label: string };

export type SiteNavUser = { creator: object | null } | null;

/**
 * The storefront the nav links to: the signed-in creator's own handle, else the demo handle (which is empty on a
 * deployment with no demo creator). A creator must never be sent to the demo storefront instead of their own, so the
 * handle wins over the fallback whenever there is one. `demoHandle` is a parameter to keep this module free of imports.
 */
export function storefrontHandleFor(user: { creator: { handle: string } | null } | null | undefined, demoHandle: string): string {
  return user?.creator?.handle ?? demoHandle;
}

/**
 * Nav items in desktop order. `storefrontHandle` is the signed-in creator's handle, else the demo handle; empty hides
 * the sample-storefront link (a deployment without a demo creator).
 */
export function siteNavLinks({ user, storefrontHandle }: { user: SiteNavUser; storefrontHandle: string }): SiteNavItem[] {
  const items: SiteNavItem[] = [
    { kind: "link", key: "demo", href: "/#sandbox-demo", label: "Checkout demo" },
    { kind: "link", key: "fees", href: "/#pricing", label: "Fees" },
  ];
  if (storefrontHandle) {
    items.push({ kind: "link", key: "storefront", href: `/c/${storefrontHandle}`, label: "Sample storefront" });
  }
  if (user) {
    items.push(
      { kind: "link", key: "library", href: "/library", label: "My library" },
      user.creator
        ? { kind: "action", key: "action", href: "/dashboard", label: "Dashboard" }
        : { kind: "action", key: "action", href: "/dashboard/onboarding", label: "Start selling" },
      { kind: "logout", key: "logout", label: "Log out" },
    );
  } else {
    items.push(
      { kind: "link", key: "login", href: "/login", label: "Log in" },
      { kind: "action", key: "action", href: "/signup?role=creator", label: "Start selling" },
    );
  }
  return items;
}

export type FooterLink = { href: string; label: string };
export type FooterGroup = { label: string; links: FooterLink[] };

/** Footer columns. Every href is an existing route; there are no privacy, terms or about pages to link to. */
export function footerGroups({ storefrontHandle }: { storefrontHandle: string }): FooterGroup[] {
  const product: FooterLink[] = [
    { href: "/#sandbox-demo", label: "Checkout demo" },
    { href: "/demo", label: "Full demo" },
    { href: "/#pricing", label: "Fees" },
  ];
  if (storefrontHandle) product.push({ href: `/c/${storefrontHandle}`, label: "Sample storefront" });
  return [
    { label: "Product", links: product },
    {
      label: "Account",
      links: [
        { href: "/login", label: "Log in" },
        { href: "/signup?role=creator", label: "Start selling" },
        { href: "/library", label: "My library" },
      ],
    },
  ];
}
