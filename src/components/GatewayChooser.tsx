"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { gatewayFormId } from "@/lib/gateway-form";
import { RadioCard } from "./form";

export type GatewayOption = { id: string; name: string; blurb: string; fact: string };

export const SAVED_FLAG = "tysonpe:gateway-saved";

const readFlag = (): string | null => {
  try {
    return sessionStorage.getItem(SAVED_FLAG);
  } catch {
    return null;
  }
};
const writeFlag = (id: string) => {
  try {
    sessionStorage.setItem(SAVED_FLAG, id);
  } catch {}
};
const clearFlag = () => {
  try {
    sessionStorage.removeItem(SAVED_FLAG);
  } catch {}
};

/** Submits the form that saves this gateway. The forms live in the server page, each bound to its own action. */
function submitGatewayForm(gatewayId: string) {
  const form = document.getElementById(gatewayFormId(gatewayId)) as HTMLFormElement | null;
  form?.requestSubmit();
}

/**
 * Saving ends in a server-action redirect to /demo, and Next remounts the whole page segment for it: this component
 * is a brand-new instance afterwards, so its state is lost and the focused radio is gone (focus drops to <body>). A
 * `key` is not the cause and removing it does not help. The choice is therefore carried across the remount in
 * sessionStorage: `onChoose` writes the gateway id, and the new instance reads it once on mount, clears it, puts focus
 * back on that radio and shows "Saved: <gateway> is your gateway" in the live region. Without a flag (a normal page
 * load) nothing is focused. Every storage call is wrapped, because storage can throw (privacy modes, quota).
 *
 * One native radio group (arrow keys, a single tab stop and form semantics come from the browser). Choosing a gateway
 * saves it at once by submitting the matching server-action form. The radios are controlled and follow `selected`, so
 * if the instance does survive a re-render the user's pick shows at once and the server value wins when it changes.
 * "Current" is the saved choice (the `selected` prop), written out so the state is not carried by colour alone. The
 * role=status region is always in the DOM (a live region must exist before its text changes) and its text is set after
 * mount. Props are plain data: the server actions stay in the page and never cross into this client module.
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
  const container = useRef<HTMLDivElement>(null);
  const moved = seen !== selected;
  if (moved) {
    setSeen(selected);
    setPick(null);
  }
  const shown = !moved && pick !== null ? pick : selected;
  const savedName = chosen !== null && chosen === selected ? options.find((o) => o.id === selected)?.name : undefined;

  // Mount only: the previous instance was replaced by the save's redirect. Restore focus and the confirmation.
  useEffect(() => {
    const id = readFlag();
    if (id === null) return;
    clearFlag();
    if (!options.some((o) => o.id === id)) return;
    container.current?.querySelector<HTMLInputElement>(`input[name="gateway"][value="${id}"]`)?.focus();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the flag only exists after the previous instance unmounted; there is nothing to derive it from during render
    setChosen(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only: `options` is static page data
  }, []);

  // No remount: once the save is confirmed here, the flag is spent (it must not steal focus on a later visit).
  useEffect(() => {
    if (chosen !== null && chosen === selected) clearFlag();
  }, [chosen, selected]);

  function onChoose(event: ChangeEvent<HTMLInputElement>) {
    if (!event.currentTarget.checked) return;
    const id = event.currentTarget.value;
    setPick(id);
    setChosen(id);
    writeFlag(id);
    submitGatewayForm(id);
  }

  return (
    <div ref={container}>
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
