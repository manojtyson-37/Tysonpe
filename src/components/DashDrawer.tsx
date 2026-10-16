"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconExternal, IconMenu } from "./icons";
import { DASH_NAV_ITEMS, isDashNavActive } from "./dash-nav-links";
import { buttonClass } from "./ui/button";
import { Sheet } from "./ui/sheet";

type LogoutAction = () => void | Promise<void>;

export type DashDrawerBodyProps = {
  pathname: string | null;
  creatorName: string;
  storefrontHref: string;
  logoutAction: LogoutAction;
  /** Called when a link is followed, to dismiss the drawer: the console layout persists across navigation. */
  onNavigate?: () => void;
};

const itemBase = "flex min-h-12 items-center rounded-control px-3 text-base transition-colors duration-(--dur-fast)";

/**
 * The drawer's body: the same `DASH_NAV_ITEMS` as the sidebar, with the same active rule, then who is signed in, the
 * storefront link and the logout form. Active is tone plus weight (ink, semibold, surface-2), never a colour tint.
 * Plain links rather than `Tabs`: a sliding indicator measured inside a panel that is itself translating would misplace.
 */
export function DashDrawerBody({ pathname, creatorName, storefrontHref, logoutAction, onNavigate }: DashDrawerBodyProps) {
  return (
    <>
      <nav aria-label="Dashboard menu" className="min-h-0 flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {DASH_NAV_ITEMS.map((item) => {
            const active = isDashNavActive(pathname, item);
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`${itemBase} ${active ? "bg-surface-2 font-semibold text-ink" : "font-medium text-muted hover:text-ink"}`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="shrink-0 space-y-2 border-t border-line p-4">
        <p className="truncate text-sm font-semibold text-ink">{creatorName}</p>
        <Link href={storefrontHref} onClick={onNavigate} className={`${buttonClass({ variant: "secondary" })} w-full`}>
          View storefront
          <IconExternal size={16} />
        </Link>
        <form action={logoutAction}>
          <button type="submit" className={`${buttonClass({ variant: "secondary" })} w-full`}>
            Log out
          </button>
        </form>
      </div>
    </>
  );
}

export type DashDrawerProps = Omit<DashDrawerBodyProps, "pathname" | "onNavigate">;

/** The console's hamburger and its left-edge sheet, shown below `lg`. The mechanics are `Sheet`'s; this is the content. */
export function DashDrawer(props: DashDrawerProps) {
  const pathname = usePathname();
  return (
    <Sheet
      title="Dashboard"
      closeLabel="Close dashboard menu"
      triggerLabel="Dashboard menu"
      triggerIcon={<IconMenu size={22} />}
      triggerClassName="-ml-2"
      side="left"
    >
      {(close) => <DashDrawerBody {...props} pathname={pathname} onNavigate={close} />}
    </Sheet>
  );
}
