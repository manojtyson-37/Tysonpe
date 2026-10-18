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
import {
  dialogFocusStep,
  focusableWithin,
  isActiveOverlay,
  isTopOverlay,
  lockBodyScroll,
  nextFocusIndex,
  overlayKey,
  popOverlay,
  pushOverlay,
  registerOverlay,
  returnOverlayFocus,
  tabAtEdge,
  type OverlayStack,
} from "./overlay";
export type { DialogFocusStep } from "./overlay";

// Kept as an export of this module for existing imports; the implementation lives in ./motion.
export { OverlayMotion };
// The overlay helpers moved to ./overlay (so a sheet can use them without loading framer-motion); same names here.
export { dialogFocusStep, lockBodyScroll, nextFocusIndex };
// The open-overlay stack moved to ./overlay so a Sheet shares it with Dialog; the dialog names stay as aliases.
export { isTopOverlay as isTopDialog, popOverlay as popDialog, pushOverlay as pushDialog };
export type DialogStack = OverlayStack;

/* ------------------------------------------------------------------ pure helpers */

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
  /** The content draws its own chrome: see `DialogProps.bare`. */
  bare?: boolean;
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
  bare,
  panelRef,
  onBackdropClick,
  motion,
  origin,
}: DialogViewProps) {
  const hasBody = !bare && Boolean(description || children);
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
        {bare ? (
          <>
            <h2 id={titleId} className="sr-only">
              {title}
            </h2>
            {children}
          </>
        ) : (
          <>
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
          </>
        )}
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
  /**
   * For content that draws its own header and body (a gateway replica). The title stays as the accessible name but is
   * visually hidden, `children` fill the panel edge to edge and are not wired as its description (a form is not a
   * description), and `description` and `footer` are ignored. Focus trap, Escape, scroll lock and focus return are unchanged.
   */
  bare?: boolean;
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
 * Nested dialogs, and a dialog over a sheet, stack: only the top one reacts to Escape and Tab.
 */
export function Dialog({ open, onClose, title, description, children, footer, className, bare, initialFocusRef, returnFocusRef }: DialogProps) {
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

  // Closing over another overlay (a confirm over a sheet): the opener is behind that modal, so focus goes into the
  // overlay now on top instead (see returnOverlayFocus), and the exit safety net below has nothing to put back.
  const returnFocus = useCallback(() => {
    const trigger = focusTargetRef.current;
    const target = returnOverlayFocus(uid, () => {
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    });
    focusReturnedRef.current = target === "top-overlay" || !trigger || document.activeElement === trigger;
  }, [uid]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;

    const active = document.activeElement;
    const trigger = returnFocusRef?.current ?? (active instanceof HTMLElement && active !== document.body ? active : null);
    focusTargetRef.current = trigger;

    const origin = originFromRects(trigger?.getBoundingClientRect() ?? null, panel.getBoundingClientRect());
    originX.set(origin.x);
    originY.set(origin.y);

    releaseScroll();
    unlockRef.current = lockBodyScroll(document.body, window.innerWidth - document.documentElement.clientWidth);

    // How focus enters this dialog. Also what an overlay closing over it calls to hand focus back; if focus is already
    // inside the panel there is nothing to move.
    const focusInto = () => {
      if (panel.contains(document.activeElement)) return;
      (initialFocusRef?.current ?? focusableWithin(panel)[0] ?? panel).focus({ preventScroll: true });
    };
    focusInto();

    const unregister = registerOverlay(uid, focusInto);

    const onKeyDown = (event: KeyboardEvent) => {
      // Only the top of the shared overlay stack (dialogs and sheets) acts. An Escape someone else already used (a menu,
      // a native control) or an IME composition is left alone.
      const intent = overlayKey(isActiveOverlay(uid), event);
      if (intent === "ignore") return;
      if (intent === "close") {
        event.preventDefault();
        close();
        return;
      }
      const nodes = focusableWithin(panel);
      const index = nodes.findIndex((node) => node === document.activeElement);
      if (!tabAtEdge(index, nodes.length, event.shiftKey)) return; // inside the list, native Tab order already stays in the panel
      event.preventDefault();
      (nodes[nextFocusIndex(index, nodes.length, event.shiftKey)] ?? panel).focus();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unregister();
      // Focus is NOT returned here: see dialogFocusStep. The effect below does it, after React has restored focus.
      fallbackRef.current = setTimeout(releaseScroll, EXIT_FALLBACK_MS);
    };
  }, [open, mounted, uid, initialFocusRef, returnFocusRef, originX, originY, releaseScroll]);

  // Same path for Escape, Cancel and the backdrop: focus goes back to the opener at once, not after the exit animation.
  // This is the layout phase of the closing commit, which runs after React has restored the previously focused element.
  const wasOpenRef = useRef(false);
  useLayoutEffect(() => {
    const step = dialogFocusStep(wasOpenRef.current, open);
    wasOpenRef.current = open;
    if (step === "return") returnFocus();
  }, [open, returnFocus]);

  // Unmounted while still open (a route change): there is no closing commit, so give focus back here.
  useLayoutEffect(
    () => () => {
      if (wasOpenRef.current) returnFocus();
    },
    [returnFocus],
  );

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
            bare={bare}
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
