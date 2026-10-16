"use client";

import { useEffect, useSyncExternalStore } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { IconX } from "../icons";
import { OverlayMotion } from "./dialog";

/* ------------------------------------------------------------------ queue reducer (pure) */

export type ToastTone = "info" | "good" | "bad";

export type ToastInput = { id: string; message: string; tone: ToastTone };
export type ToastItem = ToastInput & { expiresAt: number };
export type ToastState = { visible: ToastItem[]; waiting: ToastInput[] };
export type ToastAction =
  | { type: "add"; toast: ToastInput; now: number }
  | { type: "dismiss"; id: string; now: number }
  | { type: "expire"; now: number };

/** How long a toast stays on screen. */
export const TOAST_TTL_MS = 4000;
/** More than this at once is noise: the rest wait their turn. */
export const TOAST_MAX_VISIBLE = 3;

export const initialToastState: ToastState = { visible: [], waiting: [] };

/** Moves waiting toasts into free visible slots, starting their timers at `now`. */
function promote(visible: ToastItem[], waiting: ToastInput[], now: number): ToastState {
  const free = TOAST_MAX_VISIBLE - visible.length;
  if (free <= 0 || waiting.length === 0) return { visible, waiting };
  const next = waiting.slice(0, free).map((toast) => ({ ...toast, expiresAt: now + TOAST_TTL_MS }));
  return { visible: [...visible, ...next], waiting: waiting.slice(free) };
}

/**
 * Pure queue logic. Time is passed in, never read, so every transition is deterministic.
 * - add: dedupes by id (an existing toast is updated in place and its timer restarts); shows at most
 *   `TOAST_MAX_VISIBLE`, the rest wait in order.
 * - dismiss: removes by id, then fills the free slot from the waiting list.
 * - expire: drops visible toasts whose time is up and fills their slots. Returns the same object when nothing changed.
 */
export function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "add": {
      const { toast, now } = action;
      if (state.visible.some((t) => t.id === toast.id)) {
        return { ...state, visible: state.visible.map((t) => (t.id === toast.id ? { ...toast, expiresAt: now + TOAST_TTL_MS } : t)) };
      }
      if (state.waiting.some((t) => t.id === toast.id)) {
        return { ...state, waiting: state.waiting.map((t) => (t.id === toast.id ? toast : t)) };
      }
      if (state.visible.length < TOAST_MAX_VISIBLE) {
        return { ...state, visible: [...state.visible, { ...toast, expiresAt: now + TOAST_TTL_MS }] };
      }
      return { ...state, waiting: [...state.waiting, toast] };
    }
    case "dismiss": {
      const inVisible = state.visible.some((t) => t.id === action.id);
      const inWaiting = state.waiting.some((t) => t.id === action.id);
      if (!inVisible && !inWaiting) return state;
      return promote(
        state.visible.filter((t) => t.id !== action.id),
        state.waiting.filter((t) => t.id !== action.id),
        action.now,
      );
    }
    case "expire": {
      const alive = state.visible.filter((t) => t.expiresAt > action.now);
      if (alive.length === state.visible.length) return state;
      return promote(alive, state.waiting, action.now);
    }
  }
}

/** Soonest time any visible toast expires, or null when none is showing. Drives the Toaster's single timer. */
export function nextExpiry(state: ToastState): number | null {
  return state.visible.length === 0 ? null : Math.min(...state.visible.map((t) => t.expiresAt));
}

/* ------------------------------------------------------------------ store */

export type ToastOptions = { id?: string; tone?: ToastTone };

/** External store over the reducer, shaped for `useSyncExternalStore`. `now` is injectable for tests. */
export function createToastStore(now: () => number = Date.now) {
  let state = initialToastState;
  const listeners = new Set<() => void>();

  const dispatch = (action: ToastAction) => {
    const next = toastReducer(state, action);
    if (next === state) return;
    state = next;
    listeners.forEach((listener) => listener());
  };

  return {
    now,
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** The id defaults to tone and message, so firing the same message twice shows it once. */
    add(input: { message: string } & ToastOptions): string {
      const tone = input.tone ?? "info";
      const id = input.id ?? `${tone}:${input.message}`;
      dispatch({ type: "add", toast: { id, message: input.message, tone }, now: now() });
      return id;
    },
    dismiss(id: string) {
      dispatch({ type: "dismiss", id, now: now() });
    },
    expire() {
      dispatch({ type: "expire", now: now() });
    },
  };
}

export type ToastStore = ReturnType<typeof createToastStore>;

const toastStore = createToastStore();

/** Show a toast from anywhere on the client. Needs a mounted `<Toaster />`. Returns the toast id. */
export function toast(message: string, options?: ToastOptions): string {
  return toastStore.add({ message, ...options });
}

export function dismissToast(id: string): void {
  toastStore.dismiss(id);
}

/* ------------------------------------------------------------------ view */

type Ease = [number, number, number, number];

/**
 * Toast enter 400ms on --ease-out (8px rise, 4px blur), exit 160ms. Nothing moves under reduced motion; the
 * toast just appears and disappears.
 */
export function toastMotion(reduced: boolean) {
  if (reduced) {
    return {
      initial: false as const,
      animate: { opacity: 1, y: 0, filter: "blur(0px)" },
      exit: { opacity: 0, transition: { duration: 0 } },
      transition: { duration: 0 },
    };
  }
  return {
    initial: { opacity: 0, y: 8, filter: "blur(4px)" } as false | Record<string, number | string>,
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, filter: "blur(2px)", transition: { duration: 0.16, ease: [0.2, 0, 0, 1] as Ease } },
    transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] as Ease },
  };
}

const TONE_DOT: Record<ToastTone, string> = { info: "bg-ink", good: "bg-good", bad: "bg-bad" };

export function ToastView({
  toast: item,
  onDismiss,
  motion,
}: {
  toast: ToastItem;
  onDismiss: () => void;
  motion?: ReturnType<typeof toastMotion>;
}) {
  return (
    <m.div
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border border-line bg-surface py-3 pl-4 pr-2 shadow-float"
      {...motion}
    >
      <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${TONE_DOT[item.tone]}`} />
      <p className="min-w-0 flex-1 py-0.5 text-sm font-medium text-ink">{item.message}</p>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-control text-muted transition-[color,background-color,scale] duration-(--dur-fast) ease-(--ease-standard) hover:bg-surface-2 hover:text-ink active:scale-(--scale-press)"
      >
        <IconX size={16} />
      </button>
    </m.div>
  );
}

/**
 * Mount once, near the root of a layout. The live region exists before any toast does, so screen readers announce
 * each one as it arrives. Toasts expire on a single timer aimed at the soonest expiry.
 */
export function Toaster({ store = toastStore }: { store?: ToastStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getState, () => initialToastState);
  const reduced = useReducedMotion() ?? false;
  const expiry = nextExpiry(state);

  useEffect(() => {
    if (expiry === null) return;
    const timer = setTimeout(() => store.expire(), Math.max(0, expiry - store.now()));
    return () => clearTimeout(timer);
  }, [expiry, store]);

  return (
    <OverlayMotion>
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-60 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end"
      >
        <AnimatePresence>
          {state.visible.map((item) => (
            <ToastView key={item.id} toast={item} onDismiss={() => store.dismiss(item.id)} motion={toastMotion(reduced)} />
          ))}
        </AnimatePresence>
      </div>
    </OverlayMotion>
  );
}
