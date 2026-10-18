import type { ReactNode } from "react";
import { trueMinus } from "./money";

export type DeltaTone = "good" | "bad" | "muted";
/** "upper" is the app-screen micro-label (the default); "sentence" is for marketing pages, where uppercase labels are capped. */
export type StatLabelCase = "upper" | "sentence";

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
  labelCase = "upper",
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  /** Change text such as "+12%". It always carries its own sign, so it never relies on colour alone. */
  delta?: string;
  deltaTone?: DeltaTone;
  labelCase?: StatLabelCase;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className={labelCase === "sentence" ? "text-sm text-muted" : "t-label"}>{label}</p>
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

/*
 * StatStrip answers to ITS OWN width, not the viewport's: the console sidebar and gutters make the content column
 * much narrower than the window, so a viewport breakpoint (`sm:`) put four wide figures in one row that did not fit.
 * The wrapper is a container; two columns until the container is wide enough for `k` cells of about 16rem each, then
 * one row of `k` cells (at most four) with hairline dividers. A longer list wraps into further rows of `k`. Class
 * names are written out whole because Tailwind only emits classes it can find in the source.
 */
const WIDE_GRID: Record<number, string> = {
  1: "",
  2: "",
  3: "@3xl:grid-cols-3",
  4: "@5xl:grid-cols-4",
};
/** First cell of a row: no rule on its left, no left padding. Others: a hairline on the left and padding either side. */
const WIDE_FIRST: Record<number, string> = {
  1: "",
  2: "@xl:pr-6",
  3: "@3xl:pr-6",
  4: "@5xl:pr-6",
};
const WIDE_REST: Record<number, string> = {
  1: "",
  2: "@xl:border-l @xl:border-line @xl:px-6",
  3: "@3xl:border-l @3xl:border-line @3xl:px-6",
  4: "@5xl:border-l @5xl:border-line @5xl:px-6",
};

/** Columns of the wide layout for a strip of `count` items: one per item, at most four. */
export function stripColumns(count: number): number {
  return Math.min(Math.max(count, 1), 4);
}

/** A hairline-separated strip of stats: two columns until its own width fits one row, never wider than its container. */
export function StatStrip({
  items,
  labelCase = "upper",
  className,
}: {
  items: StatStripItem[];
  labelCase?: StatLabelCase;
  className?: string;
}) {
  const k = stripColumns(items.length);
  const cls = ["@container", className].filter(Boolean).join(" ");
  const grid = ["grid grid-cols-2 gap-x-6 gap-y-5 border-y border-line py-4", WIDE_GRID[k]].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <div className={grid}>
        {/* Index key: a strip may legitimately repeat a label (two "Net" columns for two periods). */}
        {items.map((item, i) => (
          <Stat
            key={i}
            {...item}
            labelCase={labelCase}
            className={["min-w-0 [overflow-wrap:anywhere]", i % k === 0 ? WIDE_FIRST[k] : WIDE_REST[k]].filter(Boolean).join(" ")}
          />
        ))}
      </div>
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
