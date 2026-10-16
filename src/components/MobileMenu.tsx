"use client";

import Link from "next/link";
import type { RefObject } from "react";
import { IconMenu } from "./icons";
import type { SiteNavItem } from "./site-nav-links";
import { buttonClass } from "./ui/button";
import { Sheet, SheetView } from "./ui/sheet";

type LogoutAction = () => void | Promise<void>;

export type MobileMenuViewProps = {
  panelId: string;
  titleId: string;
  open: boolean;
  items: SiteNavItem[];
  logoutAction: LogoutAction;
  onClose?: () => void;
  panelRef?: RefObject<HTMLDivElement | null>;
  closeRef?: RefObject<HTMLButtonElement | null>;
};

/** The public menu's body: the plain links, then the ink action and logout form pinned to the foot. */
function MenuBody({ items, logoutAction, onClose }: { items: SiteNavItem[]; logoutAction: LogoutAction; onClose?: () => void }) {
  const links = items.filter((item) => item.kind === "link");
  const action = items.find((item) => item.kind === "action");
  const logout = items.find((item) => item.kind === "logout");
  return (
    <>
      <nav aria-label="Mobile" className="min-h-0 flex-1 overflow-y-auto px-4">
        <ul className="divide-y divide-line">
          {links.map((item) => (
            <li key={item.key}>
              {item.kind === "link" && (
                <Link href={item.href} onClick={onClose} className="flex min-h-12 items-center text-base font-medium text-ink">
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
      {(action || logout) && (
        <div className="shrink-0 space-y-2 border-t border-line p-4">
          {action?.kind === "action" && (
            <Link href={action.href} onClick={onClose} className={`${buttonClass({ variant: "primary" })} w-full`}>
              {action.label}
            </Link>
          )}
          {logout && (
            <form action={logoutAction}>
              <button type="submit" className={`${buttonClass({ variant: "secondary" })} w-full`}>
                {logout.label}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}

/** The public menu's sheet markup (a right-edge `SheetView` around the menu body). Render-only, so tests can drive it. */
export function MobileMenuView({ panelId, titleId, open, items, logoutAction, onClose, panelRef, closeRef }: MobileMenuViewProps) {
  return (
    <SheetView
      panelId={panelId}
      titleId={titleId}
      title="Menu"
      closeLabel="Close menu"
      open={open}
      side="right"
      onClose={onClose}
      panelRef={panelRef}
      closeRef={closeRef}
    >
      <MenuBody items={items} logoutAction={logoutAction} onClose={onClose} />
    </SheetView>
  );
}

export type MobileMenuProps = { items: SiteNavItem[]; logoutAction: LogoutAction };

/** The hamburger and its right-edge sheet, shown below `lg`. All the open/close, focus and scroll mechanics are in `Sheet`. */
export function MobileMenu({ items, logoutAction }: MobileMenuProps) {
  return (
    <Sheet title="Menu" closeLabel="Close menu" triggerLabel="Menu" triggerIcon={<IconMenu size={22} />} triggerClassName="-mr-2" side="right">
      {(close) => <MenuBody items={items} logoutAction={logoutAction} onClose={close} />}
    </Sheet>
  );
}
