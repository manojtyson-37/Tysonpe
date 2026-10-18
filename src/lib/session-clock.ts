// The home demo's session countdown as a tiny external store, so React can subscribe to it from one leaf component
// (useSyncExternalStore) and the shell, the tab bar and the calculator never re-render on a tick. No React, no
// "use client": the state is plain and unit-tested on its own.
import { COUNTDOWN_START_SECONDS, nextCountdown } from "./demo-model";

export type SessionClock = {
  /** Seconds left. Stable between ticks, as useSyncExternalStore requires. */
  get: () => number;
  /** Register a listener; returns the unsubscribe. */
  subscribe: (listener: () => void) => () => void;
  /**
   * Start the one-second interval; returns the stop. The owner calls this from an effect. Starting a clock that is already
   * running starts nothing new (one interval, one tick a second) and returns the same stop; after a stop it can start again.
   */
  start: () => () => void;
};

export function createSessionClock(initialSeconds: number = COUNTDOWN_START_SECONDS): SessionClock {
  let seconds = initialSeconds;
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setInterval> | null = null;
  const stop = () => {
    if (timer === null) return;
    clearInterval(timer);
    timer = null;
  };
  return {
    get: () => seconds,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start() {
      if (timer === null) {
        timer = setInterval(() => {
          seconds = nextCountdown(seconds);
          for (const listener of [...listeners]) listener();
        }, 1000);
      }
      return stop;
    },
  };
}
