"use client";

import { useState, type ChangeEvent } from "react";
import { InputGroup, Select } from "@/components/form";
import { MetricList, MetricRow, Money, Surface } from "@/components/ui";
import {
  DEFAULT_GST_RATE,
  DEFAULT_PLAN,
  DEFAULT_PRICE_RUPEES,
  MAX_PRICE_RUPEES,
  MIN_PRICE_RUPEES,
  PLAN_OPTIONS,
  ledgerFromInput,
} from "@/lib/landing-ledger";
import { formatINR } from "@/lib/money";

const PRICE_ID = "ledger-price";
const GST_ID = "ledger-gst";
const PLAN_ID = "ledger-plan";

/**
 * The hero's one live thing: a sale priced by the visitor, run through the same fee maths as the real ledger.
 * Everything below the controls is derived from the three pieces of state on every render, so it cannot drift from
 * them. The server renders the default sale, which is the static ledger a visitor without JavaScript sees.
 */
export function HeroLedger({ gstRates }: { gstRates: readonly number[] }) {
  const [priceText, setPriceText] = useState(String(DEFAULT_PRICE_RUPEES));
  const [gstRate, setGstRate] = useState(DEFAULT_GST_RATE);
  const [planKey, setPlanKey] = useState(DEFAULT_PLAN);
  const l = ledgerFromInput(priceText, gstRate, planKey);

  // Only the rupee sign and leading blanks are dropped. Everything else is kept as typed, so parsePriceRupees can refuse it and
  // the hint says so: rewriting "29.99" or "29,99" into 2999 would price it 100x too high, and " 1 2 " is not 12. Commas are
  // read by the parser (well-formed grouping only), not stripped here.
  const onPrice = (e: ChangeEvent<HTMLInputElement>) => setPriceText(e.target.value.replace(/₹/g, "").trimStart());
  const onGst = (e: ChangeEvent<HTMLSelectElement>) => {
    const next = Number(e.target.value);
    if (gstRates.includes(next)) setGstRate(next);
  };
  const onPlan = (e: ChangeEvent<HTMLSelectElement>) => {
    if (PLAN_OPTIONS.some((p) => p.key === e.target.value)) setPlanKey(e.target.value);
  };

  // The live region is announced on its own, so it says when the figure belongs to the sample price and not the typed one.
  const netLabel = `${l.usedDefault ? `Price not read, showing the ${formatINR(DEFAULT_PRICE_RUPEES * 100)} sample. ` : ""}Net after fees `;

  const planNote = l.planLive
    ? "Monthly plan fees are not netted."
    : `${l.planName} is draft pricing and billing is not live; its ${formatINR(l.monthlyPaise)} monthly fee is not netted.`;

  return (
    <figure className="min-w-0">
      {/* Without scripts the controls cannot do anything, so they are hidden and the default sale reads as a static ledger. */}
      <noscript>
        <style>{"#ledger-controls{display:none}"}</style>
      </noscript>
      <Surface padding="lg">
        <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
          <p className="text-sm font-semibold">Order ledger</p>
          <p className="text-sm text-muted">Sample sale</p>
        </div>

        <div id="ledger-controls" className="mt-5 grid gap-x-4 gap-y-4 sm:grid-cols-2">
          <InputGroup
            id={PRICE_ID}
            label="Sale price, GST included"
            prefix="₹"
            value={priceText}
            onChange={onPrice}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={l.usedDefault || undefined}
            hint={
              l.usedDefault
                ? `Enter whole rupees from ${formatINR(MIN_PRICE_RUPEES * 100)} to ${formatINR(MAX_PRICE_RUPEES * 100)}. Showing ${formatINR(DEFAULT_PRICE_RUPEES * 100)} until then.`
                : "Whole rupees. GST is already inside this price."
            }
            className="sm:col-span-2"
          />
          <Select id={GST_ID} label="GST rate" value={gstRate} onChange={onGst}>
            {gstRates.map((g) => (
              <option key={g} value={g}>{g}%</option>
            ))}
          </Select>
          <Select id={PLAN_ID} label="Plan" value={planKey} onChange={onPlan}>
            {PLAN_OPTIONS.map((p) => (
              <option key={p.key} value={p.key}>{p.live ? p.name : `${p.name} (draft)`}</option>
            ))}
          </Select>
        </div>

        <MetricList className="mt-6 font-mono">
          <MetricRow label="Learner pays, GST included" value={<Money paise={l.salePaise} mono />} />
          <MetricRow label={`of which GST at ${l.gstRate}%`} value={<Money paise={l.gstPaise} mono />} />
          <MetricRow
            label={`Platform fee, ${l.planName} ${l.platformRate}`}
            value={<Money paise={l.platformFeePaise} sign="−" mono />}
          />
          <MetricRow label={`Gateway fee ${l.gatewayRate}`} value={<Money paise={l.gatewayFeePaise} sign="−" mono />} />
        </MetricList>
        <MetricList className="mt-1 border-t border-ink font-mono">
          <MetricRow
            strong
            label="Net after fees"
            value={
              <output htmlFor={`${PRICE_ID} ${GST_ID} ${PLAN_ID}`} aria-live="polite">
                <span className="sr-only">{netLabel}</span>
                <Money paise={l.netPaise} tone="good" size="lg" mono />
              </output>
            }
          />
        </MetricList>
      </Surface>
      <figcaption className="mt-4 max-w-md text-sm leading-relaxed text-muted">
        {l.gstRate === 0
          ? `No GST is included at ${l.gstRate}%, so there is none to remit. `
          : `The ${formatINR(l.gstPaise)} of GST sits inside the price and is yours to remit; the ledger does not deduct it. `}
        {planNote} Real settlement starts after launch.
      </figcaption>
    </figure>
  );
}
