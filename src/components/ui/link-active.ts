// The one rule for "is this link the current page", shared by `Tabs` link mode and the console nav. Pure: no React.

export type TabMatch = "exact" | "prefix";

/** Whether `pathname` is "inside" `href`. `prefix` (default) respects segment boundaries: /a matches /a/b but not /ab. */
export function isLinkActive(pathname: string, href: string, match: TabMatch = "prefix"): boolean {
  const target = href.split(/[?#]/)[0] || "/";
  if (match === "exact") return pathname === target;
  if (target === "/") return pathname === "/";
  return pathname === target || pathname.startsWith(`${target}/`);
}
