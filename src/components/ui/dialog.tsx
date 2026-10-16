"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m, useMotionValue, useReducedMotion, type MotionValue } from "framer-motion";
import { buttonClass } from "./button";
import { OverlayMotion } from "./motion";

// Kept as an export of this module for existing imports; the implementation lives in ./motion.
export { OverlayMotion };

/* ------------------------------------------------------------------ pure helpers */

/**
 * Focus-trap target. `current` is the index of the focused element within the trap's focusable list, or -1 when focus
 * sits outside it. Tab wraps from the last element to the first (Shift+Tab the other way); from outside the trap it
 * enters at the first (or, with Shift, the last) element. Returns -1 when there is nothing focusable.
 */
export function nextFocusIndex(current: number, count: number, shift: boolean): number {
  if (count <= 0) return -1;
  if (current < 0) return shift ? count - 1 : 0;
  return shift ? (current - 1 + count) % count : (current + 1) % count;
}

export type RectLike = { left: number; top: number; width: number; height: number };

/**
 * Where the panel should scale from: the centre of the trigger, as a 0..1 fraction of the panel (for framer's
 * `originX`/`originY`). Clamped to the panel; centre when there is no trigger or the panel has no size yet.
 */
export function originFromRects(trigger: RectLike | null, panel: RectLike): { x: number; y: number } {
  if (!trigger || panel.width <= 0 || panel.height <= 0) return { x: 0.5, y: 0.5 };
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  return {
    x: clamp((trigger.left + trigger.width / 2 - panel.left) / panel.width),
    y: clamp((trigger.top + trigger.height / 2 - panel.top) / panel.height),
  };
}

type Ease = [number, number, number, number];
// Same values as --ease-overlay and --ease-standard in globals.css (framer needs numbers, not CSS vars).
const EASE_OVERLAY: Ease = [0.16, 1, 0.3, 1];
const EASE_STANDARD: Ease = [0.2, 0, 0, 1];

const SETTLED = { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" };

/**
 * Enter and exit for the dialog panel and its backdrop. Enter 220ms on --ease-overlay: 8px rise, 4px blur, scale from
 * 0.96 (the panel is large, so the start scale stays shallow). Exit 160ms and subtler. Under reduced motion there is
 * no travel, no blur, no scale, no fade and no exit: the dialog appears and disappears at once. (`MotionConfig
 * reducedMotion="user"` is not enough here, because it still fades opacity.)
 */
export function dialogMotion(reduced: boolean) {
  if (reduced) {
    // No `exit` on purpose: an exit animation, even of zero length, waits on a frame, and a dialog that is closed
    // must be gone at once (and must not hang when frames are throttled, e.g. in a hidden tab).
    const still = { initial: false as const, transition: { duration: 0 } };
    return { panel: { ...still, animate: SETTLED }, backdrop: { ...still, animate: { opacity: 1 } } };
  }
  const exitTransition = { duration: 0.16, ease: EASE_STANDARD };
  return {
    panel: {
      initial: { opacity: 0, y: 8, scale: 0.96, filter: "blur(4px)" } as false | Record<string, number | string>,
      animate: SETTLED,
      exit: { opacity: 0, y: -6, filter: "blur(2px)", transition: exitTransition },
      transition: { duration: 0.22, ease: EASE_OVERLAY },
    },
    backdrop: {
      initial: { opacity: 0 } as false | Record<string, number | string>,
      animate: { opacity: 1 },
      exit: { opacity: 0, transition: exitTransition },
      transition: { duration: 0.22, ease: EASE_OVERLAY },
    },
  };
}

export type DialogMotionPlan = { load: boolean; motion: ReturnType<typeof dialogMotion> | undefined };

/**
 * What the Dialog does about motion. Normal: animate and load the features chunk. Reduced motion: the instant variant,
 * no chunk. Features failed to load (`featuresFailed`): no motion props at all, because `initial: opacity 0` with no
 * features to animate it would leave an open dialog invisible.
 */
export function dialogMotionPlan(reduced: boolean, featuresFailed: boolean): DialogMotionPlan {
  if (featuresFailed) return { load: false, motion: undefined };
  return { load: !reduced, motion: dialogMotion(reduced) };
}

export type DialogStack = readonly string[];

/** Opens `id` on top of the stack (moving it to the top if it was already in it). */
export function pushDialog(stack: DialogStack, id: string): DialogStack {
  return [...stack.filter((entry) => entry !== id), id];
}

/** Removes `id` wherever it sits, so the dialog underneath becomes the top again. */
export function popDialog(stack: DialogStack, id: string): DialogStack {
  return stack.includes(id) ? stack.filter((entry) => entry !== id) : stack;
}

/** True only for the most recently opened dialog: the one that owns Escape and Tab. */
export function isTopDialog(stack: DialogStack, id: string): boolean {
  return stack.length > 0 && stack[stack.length - 1] === id;
}

// Every open Dialog listens on `document`; only the top of this stack acts, so Esc closes one dialog and Tab is trapped once.
let openDialogs: DialogStack = [];

type BodyLike = { style: { overflow: string; paddingRight: string } };

const scrollLocks = new WeakMap<object, { count: number; overflow: string; paddingRight: string }>();

/**
 * Locks page scroll and pads by the scrollbar width so the page does not shift. Reference counted per body, so stacked
 * overlays release only when the last one lets go. Returns an idempotent unlock function.
 */
export function lockBodyScroll(body: BodyLike, scrollbarWidth: number): () => void {
  let lock = scrollLocks.get(body);
  if (!lock) {
    lock = { count: 0, overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    scrollLocks.set(body, lock);
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
  }
  lock.count += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const current = scrollLocks.get(body);
    if (!current) return;
    current.count -= 1;
    if (current.count > 0) return;
    body.style.overflow = current.overflow;
    body.style.paddingRight = current.paddingRight;
    scrollLocks.delete(body);
  };
}

export type ConfirmState = { open: boolean; submit: boolean };
export type ConfirmAction = "open" | "confirm" | "cancel" | "submitted";

/**
 * State of a confirm-then-submit control. `confirm` closes the dialog and raises `submit`; the owner submits the
 * original form once and answers `submitted`. `confirm` and `cancel` while closed do nothing, so a late event
 * (a double click on Confirm during the exit animation) cannot submit twice.
 */
export function confirmReducer(state: ConfirmState, action: ConfirmAction): ConfirmState {
  switch (action) {
    case "open":
      return { open: true, submit: false };
    case "confirm":
      return state.open ? { open: false, submit: true } : state;
    case "cancel":
      return state.open ? { open: false, submit: false } : state;
    case "submitted":
      return state.submit ? { open: false, submit: false } : state;
  }
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
}

/* ------------------------------------------------------------------ Dialog */

type PanelMotion = ReturnType<typeof dialogMotion>;

export type DialogViewProps = {
  titleId: string;
  descriptionId: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  panelRef?: RefObject<HTMLDivElement | null>;
  onBackdropClick?: () => void;
  motion?: PanelMotion;
  origin?: { x: MotionValue<number>; y: MotionValue<number> };
};

/** The dialog markup: a flat translucent ink backdrop and the panel. Rendered into a portal by `Dialog`. */
export function DialogView({
  titleId,
  descriptionId,
  title,
  description,
  children,
  footer,
  className,
  panelRef,
  onBackdropClick,
  motion,
  origin,
}: DialogViewProps) {
  const hasBody = Boolean(description || children);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <m.div
        data-dialog-backdrop=""
        aria-hidden="true"
        className="absolute inset-0 bg-ink/40"
        onClick={onBackdropClick}
        {...motion?.backdrop}
      />
      <m.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={hasBody ? descriptionId : undefined}
        tabIndex={-1}
        style={origin ? { originX: origin.x, originY: origin.y } : undefined}
        className={[
          "relative flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-y-auto rounded-dialog border border-line bg-surface shadow-float outline-none",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...motion?.panel}
      >
        <div className="px-6 pt-6">
          <h2 id={titleId} className="text-lg font-semibold leading-snug text-ink">
            {title}
          </h2>
          {hasBody && (
            <div id={descriptionId} className="mt-2 text-sm text-muted">
              {description && <p>{description}</p>}
              {children}
            </div>
          )}
        </div>
        {footer && <div className="mt-5 flex flex-col-reverse gap-2 px-6 pb-5 sm:flex-row sm:justify-end">{footer}</div>}
      </m.div>
    </div>
  );
}

export type DialogProps = {
  open: boolean;
  /** Called for Escape and a click on the backdrop. The owner flips `open`. */
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Element to focus on open. Defaults to the first focusable element in the panel. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** The opener: focus returns to it on close, and the panel scales out of it. Defaults to the element focused at open. */
  returnFocusRef?: RefObject<HTMLElement | null>;
};

const subscribeNever = () => () => {};

/** If an exit animation never reports back (frames throttled, features still loading), the scroll lock lets go anyway. */
const EXIT_FALLBACK_MS = 400;

/**
 * Modal dialog in a portal. Focus is trapped (Tab cycles), Escape and the backdrop close, focus returns to the
 * opener, the page cannot scroll behind it, and it is labelled by `title` and described by the body.
 *
 * Nothing is mounted until the first `open`, so a page with many closed dialogs (one per table row) pays no cost.
 * Nested dialogs stack: only the top one reacts to Escape and Tab.
 */
export function Dialog({ open, onClose, title, description, children, footer, className, initialFocusRef, returnFocusRef }: DialogProps) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const descriptionId = `${uid}-desc`;
  // Portals need `document`: false on the server and during hydration, true afterwards.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [hasOpened, setHasOpened] = useState(open);
  if (open && !hasOpened) setHasOpened(true);
  const [featuresFailed, setFeaturesFailed] = useState(false);
  const reduced = useReducedMotion() ?? false;
  const plan = dialogMotionPlan(reduced, featuresFailed);
  const panelRef = useRef<HTMLDivElement>(null);
  const originX = useMotionValue(0.5);
  const originY = useMotionValue(0.5);
  const close = useEffectEvent(onClose);

  // The scroll lock outlives `open` until the panel has left the screen, so the page never scrolls behind a visible panel.
  const unlockRef = useRef<(() => void) | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTargetRef = useRef<HTMLElement | null>(null);
  const focusReturnedRef = useRef(true);

  const releaseScroll = useCallback(() => {
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
    fallbackRef.current = null;
    unlockRef.current?.();
    unlockRef.current = null;
  }, []);

  useEffect(() => releaseScroll, [releaseScroll]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;

    const active = document.activeElement;
    const trigger = returnFocusRef?.current ?? (active instanceof HTMLElement && active !== document.body ? active : null);

    const origin = originFromRects(trigger?.getBoundingClientRect() ?? null, panel.getBoundingClientRect());
    originX.set(origin.x);
    originY.set(origin.y);

    releaseScroll();
    unlockRef.current = lockBodyScroll(document.body, window.innerWidth - document.documentElement.clientWidth);

    const first = initialFocusRef?.current ?? focusableWithin(panel)[0] ?? panel;
    first.focus({ preventScroll: true });

    openDialogs = pushDialog(openDialogs, uid);

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTopDialog(openDialogs, uid)) return;
      if (event.key === "Escape") {
        // Someone else already used this Escape (a menu, a native control), or an IME is composing: leave it alone.
        if (event.defaultPrevented || event.isComposing) return;
        event.preventDefault();
        close();
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

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      openDialogs = popDialog(openDialogs, uid);
      // Same path for Escape, Cancel and the backdrop: focus goes back to the opener at once, not after the exit animation.
      focusTargetRef.current = trigger;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      focusReturnedRef.current = !trigger || document.activeElement === trigger;
      fallbackRef.current = setTimeout(releaseScroll, EXIT_FALLBACK_MS);
    };
  }, [open, mounted, uid, initialFocusRef, returnFocusRef, originX, originY, releaseScroll]);

  const handleExitComplete = () => {
    releaseScroll();
    // Safety net: if focusing the opener did not stick and focus fell to the page, put it back now the panel is gone.
    const target = focusTargetRef.current;
    if (!focusReturnedRef.current && target?.isConnected && (!document.activeElement || document.activeElement === document.body)) {
      target.focus({ preventScroll: true });
    }
    focusReturnedRef.current = true;
  };

  if (!mounted || !hasOpened) return null;
  return createPortal(
    <OverlayMotion enabled={plan.load} onLoadError={() => setFeaturesFailed(true)}>
      <AnimatePresence onExitComplete={handleExitComplete}>
        {open && (
          <DialogView
            key="dialog"
            titleId={titleId}
            descriptionId={descriptionId}
            title={title}
            description={description}
            footer={footer}
            className={className}
            panelRef={panelRef}
            onBackdropClick={onClose}
            motion={plan.motion}
            origin={{ x: originX, y: originY }}
          >
            {children}
          </DialogView>
        )}
      </AnimatePresence>
    </OverlayMotion>,
    document.body,
  );
}

/* ------------------------------------------------------------------ ConfirmDialog */

export type ConfirmActionsProps = {
  confirmLabel: ReactNode;
  cancelLabel: ReactNode;
  /** Red-text danger button for confirm (default). False renders the ink primary button. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  cancelRef?: RefObject<HTMLButtonElement | null>;
};

/** Cancel and confirm buttons. Both are `type="button"` so they never submit a form on their own. */
export function ConfirmActions({ confirmLabel, cancelLabel, destructive = true, onConfirm, onCancel, cancelRef }: ConfirmActionsProps) {
  return (
    <>
      <button ref={cancelRef} type="button" className={buttonClass({ variant: "secondary" })} onClick={onCancel}>
        {cancelLabel}
      </button>
      <button type="button" className={buttonClass({ variant: destructive ? "danger" : "primary" })} onClick={onConfirm}>
        {confirmLabel}
      </button>
    </>
  );
}

export type ConfirmDialogProps = {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  /** Name the action ("Delete lesson"), not "OK". */
  confirmLabel: ReactNode;
  cancelLabel?: ReactNode;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

/** A `Dialog` with Cancel and Confirm. Initial focus lands on Cancel, the least destructive action. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = true,
  onConfirm,
  onCancel,
  returnFocusRef,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      initialFocusRef={cancelRef}
      returnFocusRef={returnFocusRef}
      footer={
        <ConfirmActions
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          destructive={destructive}
          onConfirm={onConfirm}
          onCancel={onCancel}
          cancelRef={cancelRef}
        />
      }
    />
  );
}
