"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FocusEvent } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { IconX } from "../icons";
import { OverlayMotion } from "./motion";

/* ------------------------------------------------------------------ queue reducer (pure) */

export type ToastTone = "info" | "good" | "bad";

export type ToastInput = { id: string; message: string; tone: ToastTone };
/** `expiresAt` is null when no timer is running: a `bad` toast (dismiss only), or any toast while paused (`remainingMs` holds what was left). */
export type ToastItem = ToastInput & { expiresAt: number | null; remainingMs?: number };
export type QueuedToast = ToastInput & { queuedAt: number };
export type ToastState = { visible: ToastItem[]; waiting: QueuedToast[]; paused: boolean };
export type ToastAction =
  | { type: "add"; toast: ToastInput; now: number }
  | { type: "dismiss"; id: string; now: number }
  | { type: "expire"; now: number }
  | { type: "pause"; now: number }
  | { type: "resume"; now: number }
  | { type: "prune"; now: number };

/** How long a toast stays on screen. */
export const TOAST_TTL_MS = 4000;
/** More than this at once is noise: the rest wait their turn. */
export const TOAST_MAX_VISIBLE = 3;
/** The waiting list is capped; when it overflows the oldest entries are dropped. */
export const TOAST_MAX_WAITING = 20;
/** A toast that waited longer than this is stale news and is dropped instead of shown. */
export const TOAST_WAITING_MAX_AGE_MS = 60_000;

export const initialToastState: ToastState = { visible: [], waiting: [], paused: false };

/**
 * Timer fields for a toast that starts (or restarts) now. `bad` toasts never expire on their own (WCAG 2.2.1: an error
 * needs to be readable at the user's pace). While paused the full time is held back until `resume`.
 */
function startTimer(tone: ToastTone, now: number, paused: boolean): Pick<ToastItem, "expiresAt" | "remainingMs"> {
  if (tone === "bad") return { expiresAt: null };
  if (paused) return { expiresAt: null, remainingMs: TOAST_TTL_MS };
  return { expiresAt: now + TOAST_TTL_MS };
}

/** Moves waiting toasts into free visible slots, starting their timers at `now`. */
function promote(visible: ToastItem[], waiting: QueuedToast[], now: number, paused: boolean): Pick<ToastState, "visible" | "waiting"> {
  const free = TOAST_MAX_VISIBLE - visible.length;
  if (free <= 0 || waiting.length === 0) return { visible, waiting };
  const next = waiting.slice(0, free).map((queued): ToastItem => {
    const toast: ToastInput = { id: queued.id, message: queued.message, tone: queued.tone };
    return { ...toast, ...startTimer(toast.tone, now, paused) };
  });
  return { visible: [...visible, ...next], waiting: waiting.slice(free) };
}

/**
 * Pure queue logic. Time is passed in, never read, so every transition is deterministic.
 * - add: dedupes by id (an existing toast is updated in place and its timer restarts); shows at most
 *   `TOAST_MAX_VISIBLE`, the rest wait in order (at most `TOAST_MAX_WAITING`, oldest dropped first).
 * - dismiss: removes by id, then fills the free slot from the waiting list.
 * - expire: drops visible toasts whose time is up and fills their slots. Returns the same object when nothing changed.
 * - pause / resume: freeze every timer (pointer over or focus inside the toasts) and restart each from what was left.
 * - prune: drops waiting toasts older than `TOAST_WAITING_MAX_AGE_MS`.
 */
export function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "add": {
      const { toast, now } = action;
      if (state.visible.some((t) => t.id === toast.id)) {
        const restarted: ToastItem = { ...toast, ...startTimer(toast.tone, now, state.paused) };
        return { ...state, visible: state.visible.map((t) => (t.id === toast.id ? restarted : t)) };
      }
      if (state.waiting.some((t) => t.id === toast.id)) {
        return { ...state, waiting: state.waiting.map((t) => (t.id === toast.id ? { ...toast, queuedAt: now } : t)) };
      }
      if (state.visible.length < TOAST_MAX_VISIBLE) {
        return { ...state, visible: [...state.visible, { ...toast, ...startTimer(toast.tone, now, state.paused) }] };
      }
      return { ...state, waiting: [...state.waiting, { ...toast, queuedAt: now }].slice(-TOAST_MAX_WAITING) };
    }
    case "dismiss": {
      const inVisible = state.visible.some((t) => t.id === action.id);
      const inWaiting = state.waiting.some((t) => t.id === action.id);
      if (!inVisible && !inWaiting) return state;
      return {
        ...state,
        ...promote(
          state.visible.filter((t) => t.id !== action.id),
          state.waiting.filter((t) => t.id !== action.id),
          action.now,
          state.paused,
        ),
      };
    }
    case "expire": {
      const alive = state.visible.filter((t) => t.expiresAt === null || t.expiresAt > action.now);
      if (alive.length === state.visible.length) return state;
      return { ...state, ...promote(alive, state.waiting, action.now, state.paused) };
    }
    case "pause": {
      if (state.paused) return state;
      const visible = state.visible.map((t): ToastItem => (t.expiresAt === null ? t : { ...t, expiresAt: null, remainingMs: Math.max(0, t.expiresAt - action.now) }));
      return { ...state, visible, paused: true };
    }
    case "resume": {
      if (!state.paused) return state;
      const visible = state.visible.map((t): ToastItem => {
        if (t.remainingMs === undefined) return t;
        const { remainingMs, ...rest } = t;
        return { ...rest, expiresAt: action.now + remainingMs };
      });
      return { ...state, visible, paused: false };
    }
    case "prune": {
      const waiting = state.waiting.filter((t) => action.now - t.queuedAt <= TOAST_WAITING_MAX_AGE_MS);
      return waiting.length === state.waiting.length ? state : { ...state, waiting };
    }
  }
}

/** Soonest time any running timer expires, or null when none is (nothing visible, only `bad` toasts, or paused). Drives the Toaster's single timer. */
export function nextExpiry(state: ToastState): number | null {
  const times = state.visible.flatMap((t) => (t.expiresAt === null ? [] : [t.expiresAt]));
  return times.length === 0 ? null : Math.min(...times);
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
    /**
     * Called by the timer aimed at the soonest expiry. `setTimeout` can fire a millisecond before the clock reads that
     * time, so the expiry is `max(now, soonest)`: the toast the timer was set for always goes, and the state always
     * changes, which re-arms the Toaster's effect.
     */
    expire() {
      const soonest = nextExpiry(state);
      dispatch({ type: "expire", now: Math.max(now(), soonest ?? -Infinity) });
    },
    pause() {
      dispatch({ type: "pause", now: now() });
    },
    resume() {
      dispatch({ type: "resume", now: now() });
    },
    /** Drops waiting toasts that are too old to be worth showing. */
    prune() {
      dispatch({ type: "prune", now: now() });
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
 * toast just appears and disappears (no `exit` at all, so removal never waits on a frame).
 */
export function toastMotion(reduced: boolean) {
  if (reduced) {
    return {
      initial: false as const,
      animate: { opacity: 1, y: 0, filter: "blur(0px)" },
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
      {/* 28px visual; the ::after widens the hit area to 44px (28 + 8 each side) without growing the toast. */}
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className="relative inline-flex size-7 shrink-0 items-center justify-center rounded-control text-muted transition-[color,background-color,scale] duration-(--dur-fast) ease-(--ease-standard) after:absolute after:-inset-2 hover:bg-surface-2 hover:text-ink active:scale-(--scale-press)"
      >
        <IconX size={16} />
      </button>
    </m.div>
  );
}

/**
 * The screen-reader side of the toasts: a polite live region that holds only the messages. It exists (empty) before the
 * first toast, so each arrival is announced, and it has no buttons, so the dismiss control is never read out as part
 * of the message. The visible toasts are not live themselves.
 */
export function ToastAnnouncer({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div role="status" aria-live="polite" className="sr-only">
      {toasts.map((item) => (
        <p key={item.id}>{item.message}</p>
      ))}
    </div>
  );
}

/**
 * Mount once, near the root of a layout. Toasts expire on a single timer aimed at the soonest expiry. All timers
 * pause while the pointer is over the toasts or focus is inside them (WCAG 2.2.1), and `bad` toasts stay until dismissed.
 */
export function Toaster({ store = toastStore }: { store?: ToastStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getState, () => initialToastState);
  const reduced = useReducedMotion() ?? false;
  const [featuresFailed, setFeaturesFailed] = useState(false);
  const expiry = nextExpiry(state);
  const regionRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(false);

  // Toasts that waited a long time while no Toaster was mounted are stale: drop them rather than flash old news.
  useEffect(() => {
    store.prune();
  }, [store]);

  useEffect(() => {
    if (expiry === null) return;
    const timer = setTimeout(() => store.expire(), Math.max(0, expiry - store.now()));
    return () => clearTimeout(timer);
  }, [expiry, store]);

  const syncPause = () => {
    const focusInside = regionRef.current?.contains(document.activeElement) ?? false;
    if (hoverRef.current || focusInside) store.pause();
    else store.resume();
  };

  // A dismissed toast can take the hovered or focused element with it without a leave or blur event: re-derive then.
  const visibleCount = state.visible.length;
  useEffect(() => {
    if (visibleCount === 0) hoverRef.current = false;
    if (state.paused) {
      const focusInside = regionRef.current?.contains(document.activeElement) ?? false;
      if (!hoverRef.current && !focusInside) store.resume();
    }
  }, [visibleCount, state.paused, store]);

  const motion = featuresFailed ? undefined : toastMotion(reduced);

  return (
    <OverlayMotion enabled={!reduced} onLoadError={() => setFeaturesFailed(true)}>
      <ToastAnnouncer toasts={state.visible} />
      <div
        ref={regionRef}
        className="pointer-events-none fixed inset-x-4 bottom-4 z-60 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end"
        onPointerEnter={() => {
          hoverRef.current = true;
          syncPause();
        }}
        onPointerLeave={() => {
          hoverRef.current = false;
          syncPause();
        }}
        onFocus={syncPause}
        onBlur={(event: FocusEvent<HTMLDivElement>) => {
          // Focus moving between two controls inside the region is not a blur of the region.
          if (event.currentTarget.contains(event.relatedTarget)) return;
          if (hoverRef.current) return;
          store.resume();
        }}
      >
        <AnimatePresence>
          {state.visible.map((item) => (
            <ToastView key={item.id} toast={item} onDismiss={() => store.dismiss(item.id)} motion={motion} />
          ))}
        </AnimatePresence>
      </div>
    </OverlayMotion>
  );
}
