"use client";

import { useSyncExternalStore } from "react";
import { formatTimer } from "@/lib/demo-model";
import type { SessionClock as Clock } from "@/lib/session-clock";

/**
 * The demo's session digits. This leaf alone subscribes to the one-second clock, so a tick re-renders a single span: the
 * shell, the tab bar (and its sliding indicator) and the calculator are not touched. The server and first client render
 * both read the clock's opening value, so hydration matches.
 */
export function SessionClock({ clock, className }: { clock: Clock; className?: string }) {
  const seconds = useSyncExternalStore(clock.subscribe, clock.get, clock.get);
  return <span className={className}>{formatTimer(seconds)}</span>;
}
