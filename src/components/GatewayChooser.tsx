"use client";

import type { ChangeEvent } from "react";
import { gatewayFormId } from "@/lib/gateway-form";
import { RadioCard } from "./form";

export type GatewayOption = { id: string; name: string; blurb: string; fact: string };

/** Submits the form that saves this gateway. The forms live in the server page, each bound to its own action. */
function saveGateway(event: ChangeEvent<HTMLInputElement>) {
  if (!event.currentTarget.checked) return;
  const form = document.getElementById(gatewayFormId(event.currentTarget.value)) as HTMLFormElement | null;
  form?.requestSubmit();
}

/**
 * One native radio group (arrow keys, a single tab stop and form semantics come from the browser). Choosing a gateway
 * saves it at once by submitting the matching server-action form, then the page re-renders on the new choice; the
 * page tells the user that. "Current" is the saved choice, written out so the state is not carried by colour alone.
 * Props are plain data: the server actions stay in the page and never cross into this client module.
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
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => (
        <RadioCard
          key={option.id}
          name="gateway"
          value={option.id}
          defaultChecked={option.id === selected}
          onChange={saveGateway}
          title={option.name}
          description={option.blurb}
          trailing={option.id === selected ? <span className="text-sm font-medium text-ink">Current</span> : null}
        >
          <span className="mt-2 block text-sm text-muted">{option.fact}</span>
        </RadioCard>
      ))}
    </div>
  );
}
