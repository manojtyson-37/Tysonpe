"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconArrowRight } from "@/components/icons";
import { TabPanel, Tabs } from "@/components/ui";
import { DEMO_MODES, isDemoMode, type DemoMode } from "@/lib/demo-model";
import { createSessionClock } from "@/lib/session-clock";
import { FeeCalc } from "./demo/FeeCalc";
import { HostedTab } from "./demo/HostedTab";
import { QrTab } from "./demo/QrTab";

const TABS_ID = "home-demo";
const PANEL = "px-3 py-5 sm:px-6 sm:py-6";

/**
 * The landing page's simulated checkout: a UPI QR flow, an Easebuzz hosted-page flow and a fee calculator behind
 * one tab list. Every screen is labelled as a simulation. The pure logic is in lib/demo-model.ts and each tab owns its
 * own step machine, so switching tabs starts that tab afresh. Only the selected panel's content is mounted.
 *
 * The session clock is an external store owned here and read only by the <SessionClock> digits inside the checkout tabs,
 * so a one-second tick re-renders those spans and nothing else: not this shell, not the tab bar's sliding indicator,
 * not the calculator.
 */
export function HomeInteractiveDemo() {
  const [mode, setMode] = useState<DemoMode>("upi-qr");
  const [clock] = useState(() => createSessionClock());

  // One clock for the session timers on both checkout tabs. Starting it writes no React state.
  useEffect(() => clock.start(), [clock]);

  return (
    <div className="w-full rounded-card border border-line bg-bg">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-t-card border-b border-line bg-surface px-3 py-2">
        <p className="px-2 text-sm text-muted">Simulated checkout, test mode</p>
        <Tabs
          ariaLabel="Demo screens"
          id={TABS_ID}
          items={[...DEMO_MODES]}
          value={mode}
          onChange={(value) => {
            if (isDemoMode(value)) setMode(value);
          }}
        />
      </div>

      <TabPanel id={TABS_ID} value="upi-qr" selected={mode === "upi-qr"} className={PANEL}>
        {mode === "upi-qr" && <QrTab clock={clock} />}
      </TabPanel>
      <TabPanel id={TABS_ID} value="easebuzz" selected={mode === "easebuzz"} className={PANEL}>
        {mode === "easebuzz" && <HostedTab clock={clock} />}
      </TabPanel>
      <TabPanel id={TABS_ID} value="fees" selected={mode === "fees"} className={PANEL}>
        {mode === "fees" && <FeeCalc />}
      </TabPanel>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-b-card border-t border-line bg-surface px-5 py-3">
        <span className="text-sm text-muted">Want the full-screen version?</span>
        <Link
          href="/demo"
          className="inline-flex min-h-11 items-center gap-1 rounded-control text-sm font-semibold text-ink underline decoration-line decoration-2 underline-offset-4 transition-[text-decoration-color] duration-(--dur-fast) ease-(--ease-standard) hover:decoration-ink"
        >
          Open the sandbox
          <IconArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
