"use client";

import { GooglePayIcon, PaytmIcon, PhonePeIcon, UpiIcon } from "@/components/gateway-icons";
import { IconArrowLeft, IconLock } from "@/components/icons";
import { Button } from "@/components/ui";
import {
  DEMO_APPS,
  DEMO_GST_PAISE,
  DEMO_GST_RATE_PCT,
  DEMO_TOTAL_PAISE,
  appName,
  promptTitle,
  stepAnnouncement,
  type DemoApp,
} from "@/lib/demo-model";
import { formatINR } from "@/lib/money";
import type { SessionClock as Clock } from "@/lib/session-clock";
import { FailedView, ProcessingView, Stage, StatusRegion, StepHeading, SuccessView } from "./parts";
import { SampleQr } from "./qr";
import { SessionClock } from "./SessionClock";
import { useDemoFlow } from "./use-flow";
import { useInViewOnce } from "./use-in-view";

function AppIcon({ app, className }: { app: DemoApp; className: string }) {
  if (app === "gpay") return <GooglePayIcon className={className} />;
  if (app === "phonepe") return <PhonePeIcon className={className} />;
  if (app === "paytm") return <PaytmIcon className={className} />;
  return <UpiIcon className={className} />;
}

const APP_BUTTON =
  "flex min-h-11 items-center gap-3 rounded-control border border-line bg-surface px-3 py-2 text-left text-sm font-medium text-ink " +
  "transition-[background-color,border-color,scale] duration-(--dur-fast) ease-(--ease-standard) hover:border-ink hover:bg-surface-2 active:scale-(--scale-press-lg)";

/** The simulated UPI checkout: a sample QR, four app buttons, a phone prompt, then processing and a result. */
export function QrTab({ clock }: { clock: Clock }) {
  const { flow, send, headingRef, rootRef } = useDemoFlow();
  // The scan plays once, when the tab first scrolls into view: at mount it would run below the fold, unseen.
  const scanning = useInViewOnce(rootRef);
  const total = formatINR(DEMO_TOTAL_PAISE);
  const reset = () => send({ type: "reset" });

  return (
    <div ref={rootRef} className="mx-auto max-w-lg rounded-card border border-line bg-surface">
      <StatusRegion>{stepAnnouncement(flow, "upi")}</StatusRegion>

      <div className="flex items-start justify-between gap-4 rounded-t-card bg-brand px-5 py-4 text-brand-ink">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-control border border-brand-ink/30 text-sm font-semibold">
            SC
          </span>
          <div>
            <p className="text-sm font-semibold">Sample creator</p>
            <p className="text-sm text-brand-ink/75">Sample course, 6-week cohort</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-base font-semibold tabular-nums">{total}</p>
          <p className="text-sm text-brand-ink/75">
            incl. {DEMO_GST_RATE_PCT}% GST ({formatINR(DEMO_GST_PAISE)})
          </p>
        </div>
      </div>

      <Stage step={flow.step} touched={flow.touched}>
        {flow.step === "checkout" && (
          <div className="grid gap-6 px-5 py-5 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center">
              <div className="relative overflow-hidden rounded-card border border-line bg-surface p-3">
                {/* Invisible until the tab is first in view, then one pass over the code, then it rests invisible. Reduced motion: hidden outright. */}
                <div aria-hidden="true" className={`${scanning ? "qr-scan-once " : ""}pointer-events-none absolute inset-0 border-t-2 border-ink opacity-0`} />
                <SampleQr className="size-32" />
              </div>
              <p className="mt-2 text-sm text-muted">Sample QR, not scannable</p>
              <p className="mt-1 text-sm text-muted">
                Session ends in <SessionClock clock={clock} className="font-semibold tabular-nums text-ink" />
              </p>
            </div>

            <div>
              <StepHeading headingRef={headingRef}>Pay by UPI</StepHeading>
              <p className="mt-1 text-sm text-muted">Pick an app to simulate the payment request on a phone.</p>
              <div role="group" aria-label="UPI apps" className="mt-3 grid grid-cols-2 gap-2">
                {DEMO_APPS.map((app) => (
                  <button key={app.id} type="button" className={APP_BUTTON} onClick={() => send({ type: "choose-app", app: app.id })}>
                    <AppIcon app={app.id} className="h-5 w-7 shrink-0" />
                    <span>
                      <span className="sr-only">Pay with </span>
                      {app.name}
                    </span>
                  </button>
                ))}
              </div>
              <Button className="mt-4 w-full" onClick={() => send({ type: "choose-app", app: "upi" })}>
                Simulate scanning the QR
              </Button>
            </div>
          </div>
        )}

        {flow.step === "phone-prompt" && (
          <div className="px-5 py-5">
            <div className="mx-auto max-w-sm rounded-dialog border border-line-strong bg-surface-2 px-5 py-4">
              <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
                <span className="flex items-center gap-2 text-sm font-medium text-ink">
                  <AppIcon app={flow.app} className="h-4 w-6 shrink-0" />
                  {appName(flow.app)}
                </span>
                <span className="text-sm text-muted">Simulated phone</span>
              </div>
              <div className="py-4 text-center">
                <StepHeading headingRef={headingRef}>{promptTitle(flow.app)}</StepHeading>
                <p className="mt-1 text-sm text-muted">Sample creator is requesting</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{total}</p>
                <p className="mt-1 font-mono text-sm text-muted">Sample VPA: creator@sample</p>
                <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-muted">
                  <IconLock size={16} />
                  Test mode: no real money
                </p>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => send({ type: "approve" })}>
                  Approve payment
                </Button>
                <Button variant="secondary" onClick={() => send({ type: "decline" })}>
                  Decline
                </Button>
              </div>
            </div>
            <div className="mt-3 flex justify-center">
              <Button variant="ghost" size="sm" icon={<IconArrowLeft size={16} />} onClick={reset}>
                Back to the QR
              </Button>
            </div>
          </div>
        )}

        {flow.step === "processing" && <ProcessingView headingRef={headingRef} outcome={flow.outcome} />}
        {flow.step === "success" && <SuccessView headingRef={headingRef} surface="upi" onReset={reset} />}
        {flow.step === "failed" && <FailedView headingRef={headingRef} surface="upi" onReset={reset} />}
      </Stage>

      <p className="flex items-center gap-1 rounded-b-card border-t border-line bg-surface-2 px-5 py-3 text-sm text-muted">
        <IconLock size={16} className="shrink-0" />
        Simulated checkout. Test mode, no gateway called, no real card data.
      </p>
    </div>
  );
}
