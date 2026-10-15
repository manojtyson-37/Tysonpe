"use client";

import { useFormStatus } from "react-dom";
import { focusRing } from "./styles";

/**
 * The like button's submit control. The accessible name is CONSTANT ("Like, 3"); `aria-pressed` carries the on/off
 * state, so a screen reader doesn't hear the label flip. Disabled while the action is in flight to stop double-taps.
 */
export function LikeSubmit({ count, liked }: { count: number; liked: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={liked}
      aria-label={`Like, ${count}`}
      className={`btn btn-sm min-h-10 ${focusRing} ${liked ? "btn-primary" : "btn-secondary"}`}
    >
      <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6">
        <path d="M10 16.5s-6-3.6-6-8.1A3.4 3.4 0 0 1 10 6.3a3.4 3.4 0 0 1 6 2.1c0 4.5-6 8.1-6 8.1Z" strokeLinejoin="round" />
      </svg>
      <span className="tabular-nums" aria-hidden>{count}</span>
    </button>
  );
}
