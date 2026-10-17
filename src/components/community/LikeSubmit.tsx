"use client";

import { useFormStatus } from "react-dom";
import { IconHeart } from "@/components/icons";
import { Button } from "@/components/ui";
import { touchButton } from "./styles";

/**
 * The like button's submit control. The accessible name is CONSTANT ("Like, 3"); `aria-pressed` carries the on/off
 * state, so a screen reader doesn't hear the label flip. `aria-disabled` (not `disabled`, which drops keyboard focus in Chrome) while in flight; clicks are ignored to stop double-taps.
 * Always a secondary button: liked is a FILLED heart in the brand text colour, not a brand-filled call to action, so a
 * feed of liked posts is not a wall of primary buttons. The shape change (outline to filled) carries the state, not colour alone.
 */
export function LikeSubmit({ count, liked }: { count: number; liked: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="secondary"
      size="sm"
      aria-disabled={pending || undefined}
      onClick={(e) => { if (pending) e.preventDefault(); }}
      aria-pressed={liked}
      aria-label={`Like, ${count}`}
      className={touchButton}
    >
      <IconHeart size={16} fill={liked ? "currentColor" : "none"} className={liked ? "text-[color:var(--brand-text)]" : undefined} />
      <span className="tabular-nums" aria-hidden>{count}</span>
    </Button>
  );
}
