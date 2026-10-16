"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { createPortal } from "react-dom";
import { IconMenu, IconX } from "./icons";
import type { SiteNavItem } from "./site-nav-links";
import { buttonClass } from "./ui/button";
import { dialogFocusStep, focusableWithin, lockBodyScroll, nextFocusIndex } from "./ui/overlay";

/** The panel's id, derived from a `useId` value so the trigger's `aria-controls` and the panel agree. */
export function menuPanelId(uid: string): string {
  return `${uid}-panel`;
}

type LogoutAction = () => void | Promise<void>;

// Matches Tailwind's `lg` breakpoint (64rem), where the desktop links take over from this menu. Every `lg:` class on the
// nav and this menu must move with it; MobileMenu.test.tsx pins the pair.
export const DESKTOP_QUERY = "(min-width: 1024px)";

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

/**
 * The sheet markup. It is always in the document once mounted and slides on `transform` only: open enters over
 * `--dur-sheet` on `--ease-sheet`, closed leaves over the shorter `--dur-exit`. Closed, it is `inert` and `invisible`
 * (visibility flips only after the exit finishes, so nothing is cut short), which keeps its links out of the tab order
 * and the accessibility tree. Reduced motion collapses both durations through the global token override.
 */
export function MobileMenuView({ panelId, titleId, open, items, logoutAction, onClose, panelRef, closeRef }: MobileMenuViewProps) {
  const links = items.filter((item) => item.kind === "link");
  const action = items.find((item) => item.kind === "action");
  const logout = items.find((item) => item.kind === "logout");
  return (
    <div
      data-menu-root=""
      className={[
        "fixed inset-0 z-[60] overflow-hidden lg:hidden",
        open ? "visible" : "pointer-events-none invisible transition-[visibility] duration-(--dur-exit)",
      ].join(" ")}
    >
      <div
        data-menu-backdrop=""
        aria-hidden="true"
        onClick={onClose}
        className={[
          "absolute inset-0 bg-ink/40 transition-opacity",
          open ? "opacity-100 duration-(--dur-sheet) ease-(--ease-sheet)" : "opacity-0 duration-(--dur-exit) ease-(--ease-standard)",
        ].join(" ")}
      />
      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        inert={!open}
        className={[
          "absolute inset-y-0 right-0 flex w-80 max-w-[calc(100vw-3rem)] flex-col border-l border-line bg-surface shadow-float outline-none transition-transform",
          open ? "translate-x-0 duration-(--dur-sheet) ease-(--ease-sheet)" : "translate-x-full duration-(--dur-exit) ease-(--ease-standard)",
        ].join(" ")}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line pl-4 pr-2">
          <h2 id={titleId} className="text-sm font-semibold text-ink">
            Menu
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className={`${buttonClass({ variant: "ghost", size: "sm" })} px-2 pointer-coarse:min-h-11 pointer-coarse:min-w-11`}
          >
            <IconX size={20} />
          </button>
        </div>
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
      </div>
    </div>
  );
}

const subscribeNever = () => () => {};

export type MobileMenuProps = { items: SiteNavItem[]; logoutAction: LogoutAction };

/**
 * The hamburger and its sheet, shown below `lg`. The sheet is portalled to `<body>` because the sticky header's
 * backdrop blur would otherwise become the containing block of a `fixed` child. Focus moves to the close button on open,
 * is trapped while open (Tab cycles), and returns to the hamburger on close; Escape and a backdrop click close it, the
 * page cannot scroll behind it, and growing past `lg` closes it.
 */
export function MobileMenu({ items, logoutAction }: MobileMenuProps) {
  const uid = useId();
  const panelId = menuPanelId(uid);
  const titleId = `${uid}-title`;
  // Portals need `document`: false on the server and during hydration, true afterwards.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;

    const unlock = lockBodyScroll(document.body, window.innerWidth - document.documentElement.clientWidth);
    closeRef.current?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Someone else already used this Escape (a native control), or an IME is composing: leave it alone.
        if (event.defaultPrevented || event.isComposing) return;
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = focusableWithin(panel);
      const index = nodes.findIndex((node) => node === document.activeElement);
      const atEdge = index === -1 || (event.shiftKey ? index === 0 : index === nodes.length - 1);
      if (!atEdge) return; // inside the list, native Tab order already stays in the panel
      event.preventDefault();
      (nodes[nextFocusIndex(index, nodes.length, event.shiftKey)] ?? panel).focus();
    };
    document.addEventListener("keydown", onKeyDown);

    // The desktop links replace the menu at lg; a sheet left open there would lock scroll behind nothing.
    const query = window.matchMedia(DESKTOP_QUERY);
    const onViewport = () => {
      if (query.matches) setOpen(false);
    };
    query.addEventListener("change", onViewport);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      query.removeEventListener("change", onViewport);
      unlock();
    };
  }, [open, mounted]);

  // Focus goes back to the hamburger from an effect BODY on the real open -> closed transition, never from the cleanup
  // above: React restores the previously focused element after the mutation phase, where cleanups run, so a focus call
  // made in a cleanup is overwritten and focus falls to <body>. (Same rule as Dialog; see dialogFocusStep.)
  const wasOpenRef = useRef(false);
  useLayoutEffect(() => {
    const step = dialogFocusStep(wasOpenRef.current, open);
    wasOpenRef.current = open;
    if (step === "return") triggerRef.current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
        className={`${buttonClass({ variant: "ghost", size: "sm" })} -mr-2 px-2 pointer-coarse:min-h-11 pointer-coarse:min-w-11 lg:hidden`}
      >
        <IconMenu size={22} />
      </button>
      {mounted &&
        createPortal(
          <MobileMenuView
            panelId={panelId}
            titleId={titleId}
            open={open}
            items={items}
            logoutAction={logoutAction}
            onClose={close}
            panelRef={panelRef}
            closeRef={closeRef}
          />,
          document.body,
        )}
    </>
  );
}
