"use client";

import { useState, type ChangeEvent } from "react";
import { gatewayFormId } from "@/lib/gateway-form";
import { RadioCard } from "./form";

export type GatewayOption = { id: string; name: string; blurb: string; fact: string };

/** Submits the form that saves this gateway. The forms live in the server page, each bound to its own action. */
function submitGatewayForm(gatewayId: string) {
  const form = document.getElementById(gatewayFormId(gatewayId)) as HTMLFormElement | null;
  form?.requestSubmit();
}

/**
 * One native radio group (arrow keys, a single tab stop and form semantics come from the browser). Choosing a gateway
 * saves it at once by submitting the matching server-action form, then the page re-renders on the new choice. This
 * component is NOT remounted by that re-render (a `key` on it would drop keyboard focus), so the radios are controlled
 * and follow `selected`: the user's pick shows at once and stops mattering as soon as the server value changes.
 * "Current" is the saved choice (the `selected` prop), written out so the state is not carried by colour alone. A
 * live region that is always in the DOM says "Saved: <gateway> is your gateway" once the saved choice matches what the
 * user picked. Props are plain data: the server actions stay in the page and never cross into this client module.
 */
export function GatewayChooser({
  options,
  selected,
  labelledBy,
}: {
  options: readonly GatewayOption[];
  selected: string;
  labelledBy: string;
}) {
  // The user's pick shows until the saved value changes; then the server value wins (React's "adjust state while
  // rendering" pattern: no effect, no remount, and no second pass of stale state).
  const [pick, setPick] = useState<string | null>(null);
  const [seen, setSeen] = useState(selected);
  // The gateway the user last chose; confirmed only once the saved choice equals it.
  const [chosen, setChosen] = useState<string | null>(null);
  const moved = seen !== selected;
  if (moved) {
    setSeen(selected);
    setPick(null);
  }
  const shown = !moved && pick !== null ? pick : selected;
  const savedName = chosen !== null && chosen === selected ? options.find((o) => o.id === selected)?.name : undefined;

  function onChoose(event: ChangeEvent<HTMLInputElement>) {
    if (!event.currentTarget.checked) return;
    const id = event.currentTarget.value;
    setPick(id);
    setChosen(id);
    submitGatewayForm(id);
  }

  return (
    <div>
      <div role="radiogroup" aria-labelledby={labelledBy} className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <RadioCard
            key={option.id}
            name="gateway"
            value={option.id}
            checked={option.id === shown}
            onChange={onChoose}
            title={option.name}
            description={option.blurb}
            trailing={option.id === selected ? <span className="text-sm font-medium text-ink">Current</span> : null}
          >
            <span className="mt-2 block text-sm text-muted">{option.fact}</span>
          </RadioCard>
        ))}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {savedName ? `Saved: ${savedName} is your gateway` : ""}
      </p>
    </div>
  );
}
