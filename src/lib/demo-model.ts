// Pure model behind the landing page's simulated checkout (HomeInteractiveDemo). No "use client" and no React, so the
// server landing page, the client components and the unit tests all share it. Every rupee figure comes from money.ts.
import { fiscalYear, formatInvoiceNo } from "./invoice";
import { PLAN_MONTHLY_PAISE, feeBreakdown, formatINR, gstComponent, planRates } from "./money";

/* ------------------------------------------------------------------ the sample order */

/** The sample order every demo screen shows: GST-inclusive total and the GST inside it, in paise. */
export const DEMO_TOTAL_PAISE = 118000;
export const DEMO_GST_RATE_PCT = 18;
export const DEMO_GST_PAISE = gstComponent(DEMO_TOTAL_PAISE, DEMO_GST_RATE_PCT);
/** Number format of the sample invoice, from the same formatter the real invoices use. */
export const DEMO_INVOICE_NO = formatInvoiceNo(fiscalYear(new Date("2026-10-15T10:00:00+05:30")), 1);

/* ------------------------------------------------------------------ modes (the tab list) */

export type DemoMode = "upi-qr" | "easebuzz" | "fees";

export const DEMO_MODES: ReadonlyArray<{ value: DemoMode; label: string }> = [
  { value: "upi-qr", label: "UPI QR" },
  { value: "easebuzz", label: "Easebuzz" },
  { value: "fees", label: "Fee calculator" },
];

export function isDemoMode(value: string): value is DemoMode {
  return DEMO_MODES.some((m) => m.value === value);
}

/* ------------------------------------------------------------------ countdown */

/** The sample session opens at 14:52 and wraps from 00:00 back to a fresh 15:00. */
export const COUNTDOWN_START_SECONDS = 892;
export const COUNTDOWN_LENGTH_SECONDS = 900;

export function nextCountdown(seconds: number): number {
  return seconds > 0 ? seconds - 1 : COUNTDOWN_LENGTH_SECONDS;
}

export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** Neutral sample banks for the hosted page: the demo names no real bank and claims no bank list. */
export const DEMO_BANKS: ReadonlyArray<string> = ["Sample Bank A", "Sample Bank B", "Sample Bank C", "Sample Bank D"];

/* ------------------------------------------------------------------ the checkout step machine */

export type DemoApp = "gpay" | "phonepe" | "paytm" | "upi";

export const DEMO_APPS: ReadonlyArray<{ id: DemoApp; name: string }> = [
  { id: "gpay", name: "Google Pay" },
  { id: "phonepe", name: "PhonePe" },
  { id: "paytm", name: "Paytm" },
  { id: "upi", name: "Other UPI app" },
];

export function appName(app: DemoApp): string {
  return DEMO_APPS.find((a) => a.id === app)?.name ?? "UPI app";
}

export type DemoStep = "checkout" | "phone-prompt" | "processing" | "success" | "failed";
export type DemoOutcome = "success" | "failed";

export type DemoFlow = {
  step: DemoStep;
  /** The app the payment request is shown in. */
  app: DemoApp;
  /** What the processing step settles into; null outside processing, success and failed. */
  outcome: DemoOutcome | null;
  /** False until the visitor does something, so the first paint never animates or steals focus. */
  touched: boolean;
};

export const INITIAL_FLOW: DemoFlow = { step: "checkout", app: "upi", outcome: null, touched: false };

export type FlowAction =
  | { type: "choose-app"; app: DemoApp }
  | { type: "approve" }
  | { type: "decline" }
  | { type: "settle" }
  | { type: "reset" };

/** How long the simulated check takes before it settles, per outcome. */
export const SETTLE_MS: Record<DemoOutcome, number> = { success: 1200, failed: 600 };

/**
 * checkout -> phone-prompt -> processing -> success | failed -> checkout. An action that does not fit the current step
 * (a late timer, a double click) returns the same state object, so it cannot skip or repeat a step.
 * The hosted page has no phone prompt: its pay and cancel buttons send approve and decline from "checkout".
 */
export function flowReducer(state: DemoFlow, action: FlowAction): DemoFlow {
  switch (action.type) {
    case "choose-app":
      return state.step === "checkout" ? { step: "phone-prompt", app: action.app, outcome: null, touched: true } : state;
    case "approve":
    case "decline":
      if (state.step !== "checkout" && state.step !== "phone-prompt") return state;
      return { ...state, step: "processing", outcome: action.type === "approve" ? "success" : "failed", touched: true };
    case "settle":
      return state.step === "processing" && state.outcome ? { ...state, step: state.outcome } : state;
    case "reset":
      return state.step === "checkout" ? state : { ...INITIAL_FLOW, touched: true };
  }
}

/** Milliseconds until the processing step settles, or null when nothing is pending. */
export function settleDelay(flow: DemoFlow): number | null {
  return flow.step === "processing" && flow.outcome ? SETTLE_MS[flow.outcome] : null;
}

/** The sentence the polite status region reads when the step changes. Always says it is simulated. */
export function stepAnnouncement(flow: DemoFlow, surface: "upi" | "hosted"): string {
  const amount = formatINR(DEMO_TOTAL_PAISE);
  switch (flow.step) {
    case "checkout":
      return surface === "upi" ? "Simulated checkout: scan the sample QR or pick a UPI app." : "Simulated Easebuzz page: pick a sample bank.";
    case "phone-prompt":
      return `Simulated ${appName(flow.app)} payment request for ${amount}. Approve or decline.`;
    case "processing":
      return "Simulated payment is processing.";
    case "success":
      return `Simulated payment of ${amount} succeeded. No money moved.`;
    case "failed":
      return surface === "hosted" ? "Simulated payment was cancelled. No money moved." : "Simulated payment was declined. No money moved.";
  }
}

/* ------------------------------------------------------------------ fee calculator */

export const FEE_PLAN_KEYS = ["basic", "pro", "advanced", "ultimate"] as const;
export type FeePlanKey = (typeof FEE_PLAN_KEYS)[number];

export const SALES_MIN_RUPEES = 50000;
export const SALES_MAX_RUPEES = 1000000;
export const SALES_STEP_RUPEES = 25000;
/** The default monthly sales: Rs 2,50,000, where Ultimate's monthly fee outweighs its lower rates. */
export const DEFAULT_SALES_RUPEES = 250000;

/** A slider value to a safe monthly sales figure: not a number -> the default, otherwise clamped to the slider's range. */
export function parseSalesRupees(raw: number): number {
  if (!Number.isFinite(raw)) return DEFAULT_SALES_RUPEES;
  return Math.min(SALES_MAX_RUPEES, Math.max(SALES_MIN_RUPEES, Math.round(raw)));
}

export type FeeRow = {
  key: FeePlanKey;
  label: string;
  /** "10% + 2% gateway", from planRates. */
  rate: string;
  monthlyPaise: number;
  platformFeePaise: number;
  gatewayFeePaise: number;
  netPaise: number;
  /** Net after the (draft) monthly plan fee. */
  takeHomePaise: number;
};

/** One row per plan: the ledger net on a month of sales, then the monthly plan fee netted off. */
export function feeRows(monthlySalesRupees: number): FeeRow[] {
  return FEE_PLAN_KEYS.map((key) => {
    const rates = planRates(key);
    const monthlyPaise = PLAN_MONTHLY_PAISE[key] ?? 0;
    const fees = feeBreakdown(monthlySalesRupees * 100, key);
    return {
      key,
      label: key[0].toUpperCase() + key.slice(1),
      rate: `${rates.platform} + ${rates.gateway} gateway`,
      monthlyPaise,
      ...fees,
      takeHomePaise: fees.netPaise - monthlyPaise,
    };
  });
}

/** Ultimate's take-home minus Basic's, in paise. Negative means the monthly fee costs more than the lower rates save. */
export function ultimateDeltaPaise(rows: FeeRow[]): number {
  const ultimate = rows.find((r) => r.key === "ultimate");
  const basic = rows.find((r) => r.key === "basic");
  return (ultimate?.takeHomePaise ?? 0) - (basic?.takeHomePaise ?? 0);
}

/** The delta in words, so the sign never rests on colour or a minus glyph alone. */
export function deltaSentence(deltaPaise: number): string {
  if (deltaPaise === 0) return "Ultimate and Basic leave you the same each month";
  const amount = formatINR(Math.abs(deltaPaise));
  return deltaPaise < 0 ? `Ultimate leaves you ${amount} less than Basic each month` : `Ultimate leaves you ${amount} more than Basic each month`;
}
