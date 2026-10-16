// DOM-level overlay helpers shared by Dialog and the mobile menu sheet. No React, no framer-motion: importing this
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
