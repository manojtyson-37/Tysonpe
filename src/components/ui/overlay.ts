// DOM-level overlay helpers shared by Dialog and Sheet. No React, no framer-motion: importing this
// module never loads the animation library.

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

/**
 * Whether a Tab press must be handled by the trap rather than left to the browser. True when focus is outside the
 * trap's focusable list (`index` -1) or on the element Tab would leave through: the last one, or with Shift the first.
 * Inside the list the native Tab order already stays in the panel, so this is false there. An empty list (count 0) is
 * always an edge, so focus is pulled back onto the panel itself.
 */
export function tabAtEdge(index: number, count: number, shift: boolean): boolean {
  return index === -1 || (shift ? index === 0 : index === count - 1);
}

/**
 * Whether an Escape keydown is not ours to act on: another handler already used it (a native control such as an open
 * select called preventDefault), or an IME is composing and Escape only cancels the composition.
 */
export function escapeAlreadyHandled(event: { defaultPrevented: boolean; isComposing: boolean }): boolean {
  return event.defaultPrevented || event.isComposing;
}

export type OverlayStack = readonly string[];

/** Opens `id` on top of the stack (moving it to the top if it was already in it). */
export function pushOverlay(stack: OverlayStack, id: string): OverlayStack {
  return [...stack.filter((entry) => entry !== id), id];
}

/** Removes `id` wherever it sits, so the overlay underneath becomes the top again. */
export function popOverlay(stack: OverlayStack, id: string): OverlayStack {
  return stack.includes(id) ? stack.filter((entry) => entry !== id) : stack;
}

/** True only for the most recently opened overlay: the one that owns Escape and Tab. */
export function isTopOverlay(stack: OverlayStack, id: string): boolean {
  return stack.length > 0 && stack[stack.length - 1] === id;
}

// Every open Dialog and Sheet listens on `document`; only the top of this one shared stack acts, so Escape closes one
// overlay and Tab is trapped once, whichever kind is on top. (Module state, like the scroll-lock registry below.)
let openOverlays: OverlayStack = [];
// How to move focus into each open overlay: the same routine it runs on open. Kept beside the stack so that an overlay
// closing over another can hand focus to the one now on top without knowing what kind it is.
const overlayFocusers = new Map<string, () => void>();

/**
 * Puts `id` on top of the shared stack; `focusInto` is how focus enters that overlay (its open-time focus routine).
 * Returns an idempotent function that takes it off again.
 */
export function registerOverlay(id: string, focusInto?: () => void): () => void {
  openOverlays = pushOverlay(openOverlays, id);
  if (focusInto) overlayFocusers.set(id, focusInto);
  return () => {
    openOverlays = popOverlay(openOverlays, id);
    overlayFocusers.delete(id);
  };
}

/** Whether `id` is the top of the shared stack right now, read at event time. */
export function isActiveOverlay(id: string): boolean {
  return isTopOverlay(openOverlays, id);
}

export type FocusReturnTarget = "trigger" | "top-overlay";

/**
 * Where focus goes when an overlay closes, given the stack that remains. With nothing left open it returns to the
 * closing overlay's own trigger. With another overlay still open the trigger sits behind that modal, so focus must go
 * into the overlay now on top instead: never to the hidden trigger, and never to <body>.
 */
export function focusReturnTarget(stackAfterClose: OverlayStack): FocusReturnTarget {
  return stackAfterClose.length === 0 ? "trigger" : "top-overlay";
}

/**
 * Called by a closing overlay (`closingId`) from its layout-effect body, once, to give focus back. Reads the shared stack
 * minus `closingId` (a Sheet's registration is only dropped in a later passive cleanup, so it may still be listed), and
 * either runs `focusTrigger` or moves focus into the overlay now on top. Returns where focus went. If the top overlay
 * registered no focus routine, nothing is moved rather than falling back to the trigger behind it.
 */
export function returnOverlayFocus(closingId: string, focusTrigger: () => void): FocusReturnTarget {
  const remaining = popOverlay(openOverlays, closingId);
  const target = focusReturnTarget(remaining);
  if (target === "trigger") focusTrigger();
  else overlayFocusers.get(remaining[remaining.length - 1])?.();
  return target;
}

export type OverlayKeyIntent = "close" | "trap" | "ignore";

/**
 * What an overlay's document keydown handler does with a key. An overlay that is not on top ignores everything, so a
 * dialog over a sheet owns Escape and Tab and the sheet underneath neither closes nor steals focus. The top overlay
 * closes on a first-hand Escape (see `escapeAlreadyHandled`) and traps Tab.
 */
export function overlayKey(
  isTop: boolean,
  event: { key: string; defaultPrevented: boolean; isComposing: boolean },
): OverlayKeyIntent {
  if (!isTop) return "ignore";
  if (event.key === "Escape") return escapeAlreadyHandled(event) ? "ignore" : "close";
  return event.key === "Tab" ? "trap" : "ignore";
}

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

export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
}

export type DialogFocusStep = "enter" | "return" | "none";

/**
 * What a change of `open` means for focus. Focus goes back to the opener only on a real open -> closed transition, and
 * the Dialog does that in a layout-effect body (the commit's layout phase), never in an effect cleanup: React restores
 * the previously focused element (the Cancel button, still mounted while the exit animation runs) AFTER the mutation
 * phase, where cleanups run, so a focus call made in a cleanup is overwritten and focus ends on the dialog, then on body.
 */
export function dialogFocusStep(wasOpen: boolean, isOpen: boolean): DialogFocusStep {
  if (isOpen && !wasOpen) return "enter";
  if (!isOpen && wasOpen) return "return";
  return "none";
}
