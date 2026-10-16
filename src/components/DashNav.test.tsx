import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

let mockPath: string | null = "/dashboard/orders/42";
vi.mock("next/navigation", () => ({ usePathname: () => mockPath }));

import { DashDrawer, DashDrawerBody, type DashDrawerBodyProps } from "./DashDrawer";
import { DashNav } from "./DashNav";
import { DASH_NAV_ITEMS, isDashNavActive } from "./dash-nav-links";
import { Sheet, SheetView, type SheetProps } from "./ui/sheet";

function tagAttrs(html: string, tag: string): Record<string, string>[] {
  return [...html.matchAll(new RegExp(`<${tag}\\s((?:"[^"]*"|'[^']*'|[^>"'])*)>`, "g"))].map((match) =>
    Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((attr) => [attr[1], attr[2]])),
  );
}

/** `[href, label]` of every link, read from the markup. */
function linkPairs(html: string): [string, string][] {
  return [...html.matchAll(/<a\s((?:"[^"]*"|'[^']*'|[^>"'])*)>((?:(?!<\/a>).)*)<\/a>/g)].map((m) => [
    /href="([^"]*)"/.exec(m[1])![1],
    m[2].replace(/<[^>]*>/g, ""),
  ]);
}

function findElements(node: ReactNode, test: (el: ReactElement<Record<string, unknown>>) => boolean): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap((child) => findElements(child, test));
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  const own = test(node) ? [node] : [];
  return [...own, ...findElements(node.props.children as ReactNode, test)];
}

const noop = () => {};
const body = (pathname: string | null, onNavigate?: () => void) =>
  renderToStaticMarkup(
    <DashDrawerBody pathname={pathname} creatorName="Asha Rao" storefrontHref="/c/asha" logoutAction={noop} onNavigate={onNavigate} />,
  );

describe("DashNav (sidebar)", () => {
  const sidebar = (path: string | null) => {
    mockPath = path;
    return renderToStaticMarkup(<DashNav />);
  };

  it("is the labelled Dashboard nav with every console link, in order", () => {
    const html = sidebar("/dashboard/orders");
    expect(html).toMatch(/^<nav aria-label="Dashboard"/);
    expect(linkPairs(html)).toEqual(DASH_NAV_ITEMS.map((i) => [i.href, i.label]));
  });

  it("marks only the current section with aria-current=page", () => {
    const html = sidebar("/dashboard/orders/42");
    const current = tagAttrs(html, "a").filter((a) => a["aria-current"] === "page");
    expect(current.map((a) => a.href)).toEqual(["/dashboard/orders"]);
  });

  it("Overview is current on /dashboard only, and /dashboard/productsX matches nothing", () => {
    expect(tagAttrs(sidebar("/dashboard"), "a").filter((a) => a["aria-current"]).map((a) => a.href)).toEqual(["/dashboard"]);
    expect(tagAttrs(sidebar("/dashboard/products/new"), "a").filter((a) => a["aria-current"]).map((a) => a.href)).toEqual(["/dashboard/products"]);
    expect(tagAttrs(sidebar("/dashboard/productsX"), "a").filter((a) => a["aria-current"])).toHaveLength(0);
  });

  it("agrees with isDashNavActive for every item on every path", () => {
    for (const path of ["/dashboard", "/dashboard/products", "/dashboard/products/new", "/dashboard/productsX", "/dashboard/settings"]) {
      const current = tagAttrs(sidebar(path), "a").filter((a) => a["aria-current"] === "page").map((a) => a.href);
      expect(current, path).toEqual(DASH_NAV_ITEMS.filter((i) => isDashNavActive(path, i)).map((i) => i.href));
    }
  });

  it("is a vertical stack of 44px rows with the label aligned to the start", () => {
    const html = sidebar("/dashboard/orders");
    expect(html).toMatch(/<nav [^>]*class="[^"]*flex-col/);
    for (const a of tagAttrs(html, "a")) {
      expect(a.class).toContain("min-h-11");
      expect(a.class).toContain("justify-start");
      expect(a.class).not.toContain("justify-center");
    }
  });

  it("the active state is tone plus weight on a surface-2 pill: ink and semibold, no brand or emerald tint", () => {
    const html = sidebar("/dashboard/orders");
    const [active] = tagAttrs(html, "a").filter((a) => a["aria-current"] === "page");
    const idle = tagAttrs(html, "a").find((a) => !a["aria-current"])!;
    expect(active.class).toContain("text-ink");
    expect(active.class).toContain("font-semibold");
    expect(active.class).not.toContain("font-medium");
    expect(idle.class).toContain("text-muted");
    expect(idle.class).toContain("font-medium");
    expect(html).toContain("bg-surface-2");
    expect(html).not.toMatch(/brand-soft|text-brand|bg-brand|text-good|bg-good|emerald/);
  });

  it("uses radius tokens and the 14px floor, with no horizontal scroller", () => {
    const html = sidebar("/dashboard");
    expect(html).toContain("rounded-control");
    expect(html).not.toMatch(/rounded-xl|rounded-\[|text-xs|text-\[\d+px\]|overflow-x-auto|transition-all/);
    expect(html).toContain("text-sm");
  });
});

describe("DashDrawerBody", () => {
  it("lists exactly the sidebar's links, in the same order, then the storefront link", () => {
    mockPath = "/dashboard";
    const sidebarPairs = linkPairs(renderToStaticMarkup(<DashNav />));
    const drawerPairs = linkPairs(body("/dashboard"));
    expect(drawerPairs.slice(0, sidebarPairs.length)).toEqual(sidebarPairs);
    expect(drawerPairs.slice(sidebarPairs.length)).toEqual([["/c/asha", "View storefront"]]);
  });

  it("no console item is missing from the drawer", () => {
    const hrefs = linkPairs(body(null)).map(([href]) => href);
    for (const item of DASH_NAV_ITEMS) expect(hrefs, item.key).toContain(item.href);
  });

  it("marks the same section current as the sidebar does, on every path", () => {
    for (const path of ["/dashboard", "/dashboard/orders/42", "/dashboard/products/new", "/dashboard/productsX", "/library", null]) {
      mockPath = path;
      const sidebarCurrent = tagAttrs(renderToStaticMarkup(<DashNav />), "a").filter((a) => a["aria-current"] === "page").map((a) => a.href);
      const drawerCurrent = tagAttrs(body(path), "a").filter((a) => a["aria-current"] === "page").map((a) => a.href);
      expect(drawerCurrent, String(path)).toEqual(sidebarCurrent);
    }
  });

  it("current is tone plus weight, never a colour tint; rows are at least 44px", () => {
    const html = body("/dashboard/payouts");
    const links = tagAttrs(html, "a").filter((a) => DASH_NAV_ITEMS.some((i) => i.href === a.href));
    const active = links.filter((a) => a["aria-current"] === "page");
    expect(active).toHaveLength(1);
    expect(active[0].class).toMatch(/font-semibold.*text-ink|text-ink.*font-semibold/);
    expect(active[0].class).toContain("bg-surface-2");
    for (const a of links) expect(a.class).toContain("min-h-12");
    expect(html).not.toMatch(/brand-soft|text-brand|bg-brand|text-good|rounded-xl|rounded-\[|text-xs/);
  });

  it("is a labelled nav landmark and shows who is signed in", () => {
    const html = body("/dashboard");
    expect(html).toMatch(/<nav [^>]*aria-label="Dashboard menu"/);
    expect(html).toContain(">Asha Rao</p>");
  });

  it("log out is a real form with a submit button", () => {
    const html = body("/dashboard");
    expect(tagAttrs(html, "form")).toHaveLength(1);
    expect(html).toMatch(/<button [^>]*type="submit"[^>]*>Log out<\/button>/);
  });

  it("every link calls onNavigate, so following one dismisses the drawer (the layout persists across navigation)", () => {
    const onNavigate = vi.fn();
    const tree = DashDrawerBody({ pathname: "/dashboard", creatorName: "A", storefrontHref: "/c/a", logoutAction: noop, onNavigate });
    const links = findElements(tree, (el) => typeof el.props.href === "string");
    expect(links).toHaveLength(DASH_NAV_ITEMS.length + 1);
    for (const link of links) expect(link.props.onClick, String(link.props.href)).toBe(onNavigate);
    for (const link of links) (link.props.onClick as () => void)();
    expect(onNavigate).toHaveBeenCalledTimes(links.length);
  });
});

describe("DashDrawer trigger (closed, as rendered on the server)", () => {
  mockPath = "/dashboard";
  const html = renderToStaticMarkup(<DashDrawer creatorName="Asha Rao" storefrontHref="/c/asha" logoutAction={noop} />);
  const [button] = tagAttrs(html, "button");

  it("is one named, collapsed button that controls the panel", () => {
    expect(tagAttrs(html, "button")).toHaveLength(1);
    expect(button["aria-label"]).toBe("Dashboard menu");
    expect(button["aria-expanded"]).toBe("false");
    expect(button["aria-haspopup"]).toBe("dialog");
    expect(button["aria-controls"]).toMatch(/-panel$/);
    expect(html).toMatch(/<svg /);
  });

  it("is hidden from lg up, aligned to the left edge, with a 44px coarse-pointer floor in its border box", () => {
    expect(button.class).toContain("lg:hidden");
    expect(button.class).toContain("-ml-2");
    expect(button.class).toContain("pointer-coarse:min-h-11");
    expect(button.class).toContain("pointer-coarse:min-w-11");
  });

  it("renders no links on the server: the drawer lives in a portal", () => {
    expect(html).not.toContain("<a ");
    expect(html).not.toContain('role="dialog"');
  });
});

describe("the drawer panel", () => {
  const panel = (open: boolean) =>
    renderToStaticMarkup(
      <SheetView panelId="dp" titleId="dt" title="Dashboard" closeLabel="Close dashboard menu" open={open} side="left" onClose={noop}>
        <DashDrawerBody pathname="/dashboard" creatorName="Asha Rao" storefrontHref="/c/asha" logoutAction={noop} />
      </SheetView>,
    );

  it("closed: inert and invisible, so its links are out of the tab order and the accessibility tree", () => {
    const html = panel(false);
    expect(html).toContain('inert=""');
    expect(html).toContain("invisible");
    expect(html).toContain("-translate-x-full");
  });

  it("open: interactive, on-screen, and it enters from the left edge", () => {
    const html = panel(true);
    expect(html).not.toContain("inert");
    expect(html).not.toContain("invisible");
    const dialog = tagAttrs(html, "div").find((a) => a.role === "dialog")!;
    expect(dialog.class).toContain("left-0");
    expect(dialog.class).toContain("translate-x-0");
    expect(html).not.toMatch(/\bmd:/);
  });
});

describe("DashDrawer wiring", () => {
  it("hands the sheet's close function to the drawer body as onNavigate, so following a link closes the drawer", () => {
    mockPath = "/dashboard";
    const sheet = DashDrawer({ creatorName: "Asha Rao", storefrontHref: "/c/asha", logoutAction: noop });
    expect(sheet.type).toBe(Sheet);
    const renderBody = (sheet.props as SheetProps).children;
    const close = vi.fn();
    const bodyElement = renderBody(close) as ReactElement<DashDrawerBodyProps>;
    expect(bodyElement.type).toBe(DashDrawerBody);
    expect(bodyElement.props.onNavigate).toBe(close);
    expect(bodyElement.props.pathname).toBe("/dashboard");
  });
});
