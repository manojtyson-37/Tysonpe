"use client";

import { useId, useState } from "react";
import { Money, MoneyCell, Table, Td, Th, Tr } from "@/components/ui";
import {
  DEFAULT_SALES_RUPEES,
  SALES_MAX_RUPEES,
  SALES_MIN_RUPEES,
  SALES_STEP_RUPEES,
  deltaSentence,
  feeRows,
  parseSalesRupees,
  ultimateDeltaPaise,
} from "@/lib/demo-model";
import { PLAN_MONTHLY_PAISE, formatINR } from "@/lib/money";

/** What the creator keeps per plan on a month of sales, with the draft monthly plan fee netted off. */
export function FeeCalc() {
  const [sales, setSales] = useState(DEFAULT_SALES_RUPEES);
  const sliderId = useId();
  const rows = feeRows(sales);
  const delta = ultimateDeltaPaise(rows);

  return (
    <div className="mx-auto max-w-3xl rounded-card border border-line bg-surface px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="max-w-md">
          <h3 className="text-base font-semibold text-ink">Net payout in the ledger, by plan</h3>
          <p className="mt-1 text-sm text-muted">Move the slider to change a month of sales. The rates come from the code that writes your ledger.</p>
        </div>
        <div className="text-right">
          <label htmlFor={sliderId} className="text-sm text-muted">
            Monthly sales
          </label>
          <p className="text-xl font-semibold text-ink">
            <Money paise={sales * 100} />
          </p>
        </div>
      </div>

      <input
        id={sliderId}
        type="range"
        min={SALES_MIN_RUPEES}
        max={SALES_MAX_RUPEES}
        step={SALES_STEP_RUPEES}
        value={sales}
        aria-valuetext={`${formatINR(sales * 100)} per month`}
        onChange={(e) => setSales(parseSalesRupees(Number(e.target.value)))}
        className="mt-4 h-11 w-full cursor-pointer accent-ink"
      />
      <div className="flex justify-between text-sm tabular-nums text-muted">
        <span>{formatINR(SALES_MIN_RUPEES * 100)} / month</span>
        <span>{formatINR(SALES_MAX_RUPEES * 100)} / month</span>
      </div>

      <div className="mt-5 rounded-card border border-line bg-surface-2 px-5 py-4">
        <p className="text-sm text-muted">Ultimate vs Basic, after the {formatINR(PLAN_MONTHLY_PAISE.ultimate)} monthly plan fee</p>
        <p className="mt-1 text-2xl font-semibold">
          <Money paise={delta} tone={delta < 0 ? "bad" : "good"} sign={delta > 0 ? "+" : undefined} /> <span className="text-base text-muted">/ month</span>
        </p>
        <output htmlFor={sliderId} aria-live="polite" className="mt-1 block text-sm text-ink">
          {deltaSentence(delta)}
        </output>
        <p className="mt-1 text-sm text-muted">Plan prices are drafts and billing is not live.</p>
      </div>

      <Table caption="Take-home by plan after the monthly plan fee" stack className="mt-4">
        <thead>
          <tr>
            <Th>Plan</Th>
            <Th>Fees</Th>
            <Th align="right">Monthly plan fee</Th>
            <Th align="right">Take-home</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Tr key={r.key}>
              <Td label="Plan" className="font-medium text-ink">
                {r.label}
              </Td>
              <Td label="Fees" className="text-muted">
                {r.rate}
              </Td>
              <Td align="right" label="Monthly plan fee" className="whitespace-nowrap tabular-nums text-muted">
                <Money paise={r.monthlyPaise} free />
              </Td>
              <MoneyCell label="Take-home after plan fee" paise={r.takeHomePaise} mono tone={r.takeHomePaise < 0 ? "bad" : undefined} />
            </Tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
