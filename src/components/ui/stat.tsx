import type { ReactNode } from "react";
import { trueMinus } from "./money";

export type DeltaTone = "good" | "bad" | "muted";

const DELTA_CLASS: Record<DeltaTone, string> = {
  good: "text-good",
  bad: "text-bad",
  muted: "text-muted",
};

/** One figure with a label. Inline on purpose: no box, so a row of them reads as a strip, not a card grid. */
export function Stat({
  label,
  value,
  sub,
  delta,
  deltaTone = "muted",
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  /** Change text such as "+12%". It always carries its own sign, so it never relies on colour alone. */
  delta?: string;
  deltaTone?: DeltaTone;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="t-label">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
      {delta && (
        <p className={`mt-1 text-sm font-medium tabular-nums ${DELTA_CLASS[deltaTone]}`}>{trueMinus(delta)}</p>
      )}
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export type StatStripItem = {
  label: string;
  value: ReactNode;
  sub?: string;
  delta?: string;
  deltaTone?: DeltaTone;
};

/** A hairline-separated row of stats: two columns on phones, one divided row from sm up. */
export function StatStrip({ items, className }: { items: StatStripItem[]; className?: string }) {
  const cls = [
    "grid grid-cols-2 gap-x-6 gap-y-5 border-y border-line py-4 sm:flex sm:gap-0 sm:divide-x sm:divide-line",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls}>
      {/* Index key: a strip may legitimately repeat a label (two "Net" columns for two periods). */}
      {items.map((item, i) => (
        <Stat key={i} {...item} className="sm:px-6 sm:first:pl-0" />
      ))}
    </div>
  );
}

/** Wrapper for MetricRow children: a definition list with hairline separators. */
export function MetricList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={["divide-y divide-line", className].filter(Boolean).join(" ")}>{children}</dl>;
}

/**
 * One label/value row for ledgers and breakdowns (fees, GST, net). Must sit inside a <dl> (use MetricList).
 * `strong` marks the total row; `sub` is a second line under the label.
 */
export function MetricRow({
  label,
  value,
  sub,
  strong = false,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  strong?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 py-2.5 text-sm">
      <dt className={strong ? "font-semibold text-ink" : "text-muted"}>{label}</dt>
      <dd className={`col-start-2 row-start-1 text-right tabular-nums${strong ? " font-semibold text-ink" : ""}`}>
        {value}
      </dd>
      {sub && <dd className="col-start-1 row-start-2 text-xs text-muted">{sub}</dd>}
    </div>
  );
}
