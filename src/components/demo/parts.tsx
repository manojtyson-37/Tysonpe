"use client";

import type { ReactNode, Ref } from "react";
import { IconCheck, IconClock, IconX } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui";
import { DEMO_INVOICE_NO, DEMO_TOTAL_PAISE, SETTLE_MS, type DemoOutcome } from "@/lib/demo-model";
import { formatINR } from "@/lib/money";

// Pieces both simulated screens (UPI QR and Easebuzz hosted) share. Presentational only: the step machine lives in
// use-flow.ts and the pure model in lib/demo-model.ts.

export type DemoSurface = "upi" | "hosted";

/** The step's heading. tabIndex -1 so the step machine can move focus here when the step changes. */
export function StepHeading({ headingRef, className, children }: { headingRef: Ref<HTMLHeadingElement>; className?: string; children: ReactNode }) {
  return (
    <h3 ref={headingRef} tabIndex={-1} className={["text-base font-semibold text-ink", className].filter(Boolean).join(" ")}>
      {children}
    </h3>
  );
}

/**
 * One polite status region per tab, always mounted, so a step change is announced once. The text is the pure
 * `stepAnnouncement`. The region is outside the animated step so it is never re-created.
 */
export function StatusRegion({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="sr-only">
      {children}
    </p>
  );
}

/**
 * Wraps a step so it enters once (opacity and a short rise, the 220ms overlay recipe) when the step changes. The
 * key restarts the animation per step; before the visitor has acted nothing animates, so the first paint is still.
 */
export function Stage({ step, touched, children }: { step: string; touched: boolean; children: ReactNode }) {
  return (
    <div key={step} className={touched ? "enter" : undefined}>
      {children}
    </div>
  );
}

/** `outcome` is what the check will settle into; it sets the delay the copy states (1.2s to succeed, 0.6s to fail). */
export function ProcessingView({ headingRef, outcome }: { headingRef: Ref<HTMLHeadingElement>; outcome: DemoOutcome | null }) {
  return (
    <div className="px-5 py-10 text-center">
      <IconClock size={24} className="mx-auto text-muted" />
      <StepHeading headingRef={headingRef} className="mt-3">
        Checking the payment
      </StepHeading>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
        Simulated, about {(SETTLE_MS[outcome ?? "success"] / 1000).toFixed(1)} seconds. No gateway is called. In the real flow the server verifies the
        payment before the order is marked paid.
      </p>
    </div>
  );
}

export function SuccessView({
  headingRef,
  surface,
  onReset,
}: {
  headingRef: Ref<HTMLHeadingElement>;
  surface: DemoSurface;
  onReset: () => void;
}) {
  const amount = formatINR(DEMO_TOTAL_PAISE);
  return (
    <div className="px-5 py-6 text-center">
      <span className="reveal-pop mx-auto grid size-12 place-items-center rounded-full bg-good-soft text-good">
        <IconCheck size={24} />
      </span>
      <StepHeading headingRef={headingRef} className="mt-3">
        Simulated payment of {amount} succeeded
      </StepHeading>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
        {surface === "hosted"
          ? "In the real flow the learner returns to your site and the server checks the response before the order is marked paid."
          : "Test mode: no money moved. Everything below is a sample."}
      </p>
      <dl className="mt-4 divide-y divide-line rounded-card border border-line bg-surface-2 px-4 text-left text-sm">
        <div className="flex flex-wrap justify-between gap-x-4 py-3">
          <dt className="text-muted">Learner (sample)</dt>
          <dd className="font-medium text-ink">learner@demo.tysonpe.test</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-4 py-3">
          <dt className="text-muted">Tax invoice (sample)</dt>
          <dd className="font-mono font-medium text-ink">{DEMO_INVOICE_NO}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-4 py-3">
          <dt className="text-muted">Course access</dt>
          <dd className="font-medium text-good">Added to the sample library</dd>
        </div>
      </dl>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button variant="secondary" onClick={onReset}>
          Run it again
        </Button>
        <ButtonLink href="/demo">Open the full sandbox</ButtonLink>
      </div>
    </div>
  );
}

export function FailedView({
  headingRef,
  surface,
  onReset,
}: {
  headingRef: Ref<HTMLHeadingElement>;
  surface: DemoSurface;
  onReset: () => void;
}) {
  return (
    <div className="px-5 py-6 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-bad-soft text-bad">
        <IconX size={24} />
      </span>
      <StepHeading headingRef={headingRef} className="mt-3">
        {surface === "hosted" ? "Simulated payment cancelled" : "Simulated payment declined"}
      </StepHeading>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
        {surface === "hosted" ? "The sample payer cancelled on the hosted page." : "The sample payer declined the request on the phone."} No money
        moved.
      </p>
      <Button className="mt-4" onClick={onReset}>
        Try again
      </Button>
    </div>
  );
}
