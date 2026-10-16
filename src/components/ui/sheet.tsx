"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { IconX } from "../icons";
import { buttonClass } from "./button";
import {
  dialogFocusStep,
  escapeAlreadyHandled,
  focusableWithin,
  lockBodyScroll,
  nextFocusIndex,
  tabAtEdge,
} from "./overlay";

/** The panel's id, derived from a `useId` value so the trigger's `aria-controls` and the panel agree. */
export function sheetPanelId(uid: string): string {
  return `${uid}-panel`;
}

// Matches Tailwind's `lg` breakpoint (64rem), where the desktop navigation takes over from every sheet. Every `lg:` class
// on a nav and on a sheet must move with it; sheet.test.tsx pins the pair for both shells.
export const DESKTOP_QUERY = "(min-width: 1024px)";

export type SheetSide = "left" | "right";

export type SheetViewProps = {
  panelId: string;
  titleId: string;
  title: string;
  closeLabel: string;
  open: boolean;
  /** The edge the panel slides in from. Right for the public menu, left for the console drawer. */
  side?: SheetSide;
  onClose?: () => void;
  panelRef?: RefObject<HTMLDivElement | null>;
  closeRef?: RefObject<HTMLButtonElement | null>;
  /** Everything under the title bar. The sheet makes no assumption about it beyond a flex column. */
  children?: ReactNode;
};

const SIDE_CLASS: Record<SheetSide, { edge: string; closed: string }> = {
  right: { edge: "right-0 border-l", closed: "translate-x-full" },
  left: { edge: "left-0 border-r", closed: "-translate-x-full" },
};

/**
 * The sheet markup. It is always in the document once mounted and slides on `transform` only: open enters over
 * `--dur-sheet` on `--ease-sheet`, closed leaves over the shorter `--dur-exit`. Closed, it is `inert` and `invisible`
 * (visibility flips only after the exit finishes, so nothing is cut short), which keeps its links out of the tab order
 * and the accessibility tree. Reduced motion collapses both durations through the global token override.
 */
export function SheetView({
  panelId,
  titleId,
  title,
  closeLabel,
  open,
  side = "right",
  onClose,
  panelRef,
  closeRef,
  children,
}: SheetViewProps) {
  const edge = SIDE_CLASS[side];
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
          "absolute inset-y-0 flex w-80 max-w-[calc(100vw-3rem)] flex-col border-line bg-surface shadow-float outline-none transition-transform",
          edge.edge,
          open ? "translate-x-0 duration-(--dur-sheet) ease-(--ease-sheet)" : `${edge.closed} duration-(--dur-exit) ease-(--ease-standard)`,
        ].join(" ")}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line pl-4 pr-2">
          <h2 id={titleId} className="text-sm font-semibold text-ink">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className={`${buttonClass({ variant: "ghost", size: "sm" })} px-2 pointer-coarse:min-h-11 pointer-coarse:min-w-11`}
          >
            <IconX size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const subscribeNever = () => () => {};

export type SheetProps = {
  title: string;
  closeLabel: string;
  /** The trigger's accessible name. */
  triggerLabel: string;
  triggerIcon: ReactNode;
  /** Extra classes for the trigger, typically a negative margin that aligns the glyph with the page edge. */
  triggerClassName?: string;
  side?: SheetSide;
  /** The sheet body. `close` closes the sheet, for links and actions that should dismiss it. */
  children: (close: () => void) => ReactNode;
};

/**
 * A trigger button and its sheet, shown below `lg`. The sheet is portalled to `<body>` because a sticky header's
 * backdrop blur would otherwise become the containing block of a `fixed` child. Focus moves to the close button on open,
 * is trapped while open (Tab cycles), and returns to the trigger on close; Escape and a backdrop click close it, the
 * page cannot scroll behind it, and growing past `lg` closes it.
 */
export function Sheet({ title, closeLabel, triggerLabel, triggerIcon, triggerClassName = "", side = "right", children }: SheetProps) {
  const uid = useId();
  const panelId = sheetPanelId(uid);
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
        if (escapeAlreadyHandled(event)) return;
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = focusableWithin(panel);
      const index = nodes.findIndex((node) => node === document.activeElement);
      if (!tabAtEdge(index, nodes.length, event.shiftKey)) return; // inside the list, native Tab order already stays in the panel
      event.preventDefault();
      (nodes[nextFocusIndex(index, nodes.length, event.shiftKey)] ?? panel).focus();
    };
    document.addEventListener("keydown", onKeyDown);

    // The desktop navigation replaces the sheet at lg; one left open there would lock scroll behind nothing.
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

  // Focus goes back to the trigger from an effect BODY on the real open -> closed transition, never from the cleanup
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
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
        className={`${buttonClass({ variant: "ghost", size: "sm" })} px-2 pointer-coarse:min-h-11 pointer-coarse:min-w-11 lg:hidden ${triggerClassName}`.trim()}
      >
        {triggerIcon}
      </button>
      {mounted &&
        createPortal(
          <SheetView
            panelId={panelId}
            titleId={titleId}
            title={title}
            closeLabel={closeLabel}
            open={open}
            side={side}
            onClose={close}
            panelRef={panelRef}
            closeRef={closeRef}
          >
            {children(close)}
          </SheetView>,
          document.body,
        )}
    </>
  );
}
