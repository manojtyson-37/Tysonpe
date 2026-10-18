// The maths behind the landing page's live ledger. Plain module (no "use client"): the server page reads the
// defaults from here to print the static ledger and the headline, and the client component reads the same
// functions to recompute. Every figure comes from money.ts; nothing here retypes a fee, rate or amount.
import { PLAN_MONTHLY_PAISE, feeBreakdown, gstComponent, planRates } from "./money";

export const DEFAULT_PRICE_RUPEES = 2999;
/** One of the GST rates the product form offers (a test pins this against GST_RATES). */
export const DEFAULT_GST_RATE = 18;
export const DEFAULT_PLAN = "basic";
export const MIN_PRICE_RUPEES = 1;
export const MAX_PRICE_RUPEES = 1_000_000;

/** Basic is the only plan creators are on; the others are draft pricing and billing is not live. */
export const PLAN_OPTIONS = [
  { key: "basic", name: "Basic", live: true },
  { key: "pro", name: "Pro", live: false },
  { key: "advanced", name: "Advanced", live: false },
  { key: "ultimate", name: "Ultimate", live: false },
].map((p) => ({ ...p, monthlyPaise: PLAN_MONTHLY_PAISE[p.key] }));

export type LedgerView = {
  rupees: number;
  salePaise: number;
  gstRate: number;
  /** GST sitting inside the price. It is the creator's to remit and is never deducted from the net. */
  gstPaise: number;
  planKey: string;
  planName: string;
  planLive: boolean;
  /** Draft monthly fee. Carried for display only: the net below does NOT subtract it. */
  monthlyPaise: number;
  platformRate: string;
  gatewayRate: string;
  platformFeePaise: number;
  gatewayFeePaise: number;
  netPaise: number;
};

export type LedgerState = LedgerView & {
  /** True when the typed price was empty or unusable and the default sale is shown instead. */
  usedDefault: boolean;
};

// One grammar for the typed price. A price is plain digits (1000) or digits with commas that are real grouping: Indian
// (1,00,000) or Western (100,000). Anything else is refused, never repaired: dropping the commas of "29,99" (two decimals typed
// with the wrong mark) or "1,0,0" would read a different, much larger price. The first digit is 1-9 in both forms, so a leading
// zero ("007", "01,000", "0,500") is refused whether or not the number is grouped: a price does not start with 0, and one rule
// is easier to explain next to the field than two.
const PLAIN = /^[1-9]\d*$/;
const GROUPED = /^(?!0)(?:\d{1,2}(?:,\d{2})*,\d{3}|\d{1,3}(?:,\d{3})*)$/;

/**
 * A whole-rupee price from the field's text, or null when it is empty, not digits, badly grouped, led by a zero, or outside
 * the bounds. Surrounding blanks (including no-break spaces) are ignored; a space inside the number is not a separator and
 * is refused.
 */
export function parsePriceRupees(text: string): number | null {
  const trimmed = text.trim();
  if (!PLAIN.test(trimmed) && !GROUPED.test(trimmed)) return null;
  const rupees = Number(trimmed.replaceAll(",", ""));
  return rupees >= MIN_PRICE_RUPEES && rupees <= MAX_PRICE_RUPEES ? rupees : null;
}

export function ledgerFor(rupees: number, gstRate: number, planKey: string): LedgerView {
  const plan = PLAN_OPTIONS.find((p) => p.key === planKey) ?? PLAN_OPTIONS[0];
  const rate = Number.isFinite(gstRate) && gstRate >= 0 && gstRate < 100 ? gstRate : DEFAULT_GST_RATE;
  const salePaise = rupees * 100;
  const fees = feeBreakdown(salePaise, plan.key);
  const rates = planRates(plan.key);
  return {
    rupees,
    salePaise,
    gstRate: rate,
    gstPaise: gstComponent(salePaise, rate),
    planKey: plan.key,
    planName: plan.name,
    planLive: plan.live,
    monthlyPaise: plan.monthlyPaise,
    platformRate: rates.platform,
    gatewayRate: rates.gateway,
    platformFeePaise: fees.platformFeePaise,
    gatewayFeePaise: fees.gatewayFeePaise,
    netPaise: fees.netPaise,
  };
}

/** The ledger for what the visitor typed. An unusable price shows the default sale and flags `usedDefault`. */
export function ledgerFromInput(priceText: string, gstRate: number, planKey: string): LedgerState {
  const parsed = parsePriceRupees(priceText);
  return { ...ledgerFor(parsed ?? DEFAULT_PRICE_RUPEES, gstRate, planKey), usedDefault: parsed === null };
}

export const DEFAULT_LEDGER = ledgerFor(DEFAULT_PRICE_RUPEES, DEFAULT_GST_RATE, DEFAULT_PLAN);
