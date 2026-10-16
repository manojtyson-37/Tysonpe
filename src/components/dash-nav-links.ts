// The creator console's link set, as data. The sidebar (DashNav, `Tabs` link mode) and the mobile drawer (DashDrawer)
// both render this one array, so a link added here appears in both and the two can never drift. Pure: no React, no
// server or client imports, so it is unit-testable without a DOM.

import { isLinkActive, type TabMatch } from "./ui/link-active";

export type DashNavMatch = TabMatch;

export type DashNavItem = {
  key: string;
  href: string;
  label: string;
  /** `exact` for Overview, which is the prefix of every other console route and would otherwise always be active. */
  match: DashNavMatch;
};

export const DASH_NAV_ITEMS: readonly DashNavItem[] = [
  { key: "overview", href: "/dashboard", label: "Overview", match: "exact" },
  { key: "products", href: "/dashboard/products", label: "Products", match: "prefix" },
  { key: "orders", href: "/dashboard/orders", label: "Orders", match: "prefix" },
  { key: "learners", href: "/dashboard/learners", label: "Learners", match: "prefix" },
  { key: "community", href: "/dashboard/community", label: "Community", match: "prefix" },
  { key: "coupons", href: "/dashboard/coupons", label: "Coupons", match: "prefix" },
  { key: "payouts", href: "/dashboard/payouts", label: "Payouts", match: "prefix" },
  { key: "settings", href: "/dashboard/settings", label: "Settings", match: "prefix" },
];

/**
 * Whether `item` is the current page, by `isLinkActive`: the exact rule `Tabs` link mode applies in the sidebar. The
 * drawer renders plain links and calls this directly, so both surfaces answer identically. Prefix matching respects
 * segment boundaries: /dashboard/products/new is inside Products, /dashboard/productsX is not.
 */
export function isDashNavActive(pathname: string | null | undefined, item: Pick<DashNavItem, "href" | "match">): boolean {
  return isLinkActive(pathname ?? "", item.href, item.match);
}

/** Where "View storefront" goes for the signed-in creator. */
export function storefrontHref(handle: string): string {
  return `/c/${handle}`;
}
