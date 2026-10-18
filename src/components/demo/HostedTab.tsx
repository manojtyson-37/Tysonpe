"use client";

import { useId, useState } from "react";
import { BankIcon } from "@/components/gateway-icons";
import { IconCheck } from "@/components/icons";
import { Button } from "@/components/ui";
import { DEMO_BANKS, DEMO_TOTAL_PAISE, stepAnnouncement } from "@/lib/demo-model";
import { formatINR } from "@/lib/money";
import type { SessionClock as Clock } from "@/lib/session-clock";
import { FailedView, ProcessingView, Stage, StatusRegion, StepHeading, SuccessView } from "./parts";
import { SessionClock } from "./SessionClock";
import { useDemoFlow } from "./use-flow";

/**
 * The simulated Easebuzz hosted page: a full-page redirect with a 15-minute clock and a return flow. It is drawn with
 * the app's own tokens and labelled as a simulation; the gateway's real look is not copied.
 */
export function HostedTab({ clock }: { clock: Clock }) {
  const { flow, send, headingRef, rootRef } = useDemoFlow();
  const [bank, setBank] = useState<string>(DEMO_BANKS[0]);
  const groupName = useId();
  const amount = formatINR(DEMO_TOTAL_PAISE);
  // A fresh run starts from the first sample bank again.
  const reset = () => {
    setBank(DEMO_BANKS[0]);
    send({ type: "reset" });
  };

  return (
    <div ref={rootRef} className="mx-auto max-w-lg rounded-card border border-line bg-surface">
      <StatusRegion>{stepAnnouncement(flow, "hosted")}</StatusRegion>

      <div className="flex items-start justify-between gap-4 rounded-t-card border-b border-line bg-surface-2 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-ink">Simulated Easebuzz hosted page</p>
          <p className="text-sm text-muted">Merchant: Sample creator</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted">Page expires in</p>
          <p>
            <SessionClock clock={clock} className="text-lg font-semibold tabular-nums text-ink" />
          </p>
        </div>
      </div>

      <Stage step={flow.step} touched={flow.touched}>
        {flow.step === "checkout" && (
          <div className="px-5 py-5">
            <div className="flex items-baseline justify-between gap-4 border-b border-line pb-4">
              <span className="text-sm text-muted">Payable amount</span>
              <span className="text-xl font-semibold tabular-nums text-ink">{amount}</span>
            </div>

            <fieldset className="mt-4">
              <legend>
                <StepHeading headingRef={headingRef}>Choose a sample bank</StepHeading>
              </legend>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {DEMO_BANKS.map((name) => (
                  <label
                    key={name}
                    className="group relative flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-line bg-surface px-3 py-2 text-sm font-medium text-ink transition-[background-color,border-color] duration-(--dur-fast) ease-(--ease-standard) hover:bg-surface-2 has-checked:border-ink has-focus-visible:[outline-offset:var(--focus-ring-offset)] has-focus-visible:[outline:var(--focus-ring)]"
                  >
                    <input
                      type="radio"
                      name={groupName}
                      value={name}
                      checked={bank === name}
                      onChange={() => setBank(name)}
                      className="sr-only"
                    />
                    <BankIcon className="size-5 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">{name}</span>
                    <IconCheck size={16} className="shrink-0 opacity-0 group-has-checked:opacity-100" />
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button className="flex-1" onClick={() => send({ type: "approve" })}>
                Pay {amount} with {bank}
              </Button>
              <Button variant="secondary" onClick={() => send({ type: "decline" })}>
                Cancel payment
              </Button>
            </div>
          </div>
        )}

        {flow.step === "processing" && <ProcessingView headingRef={headingRef} outcome={flow.outcome} />}
        {flow.step === "success" && <SuccessView headingRef={headingRef} surface="hosted" onReset={reset} />}
        {flow.step === "failed" && <FailedView headingRef={headingRef} surface="hosted" onReset={reset} />}
      </Stage>

      <p className="rounded-b-card border-t border-line bg-surface-2 px-5 py-3 text-center text-sm text-muted">
        Simulated return flow. Test mode, no gateway is called.
      </p>
    </div>
  );
}
