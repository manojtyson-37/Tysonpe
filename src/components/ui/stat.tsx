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
 * StatStrip answers to ITS OWN width, not the viewport's: the console sidebar and gutters make the content column much
 * narrower than the window. Figures are `Money`, which is `whitespace-nowrap` on purpose, so a figure never breaks:
 * the layout has to give every cell enough room instead. The widest plausible figure is a negative crore amount
 * ("−₹1,29,99,999.99", about 9.3em with tabular digits) at the largest figure size (`sm:text-3xl`, 30px), so about
 * 280px of cell content. From that:
 *   - below @2xl (672px): one column, whatever the viewport (2 columns need 24 + 2 x 280 = 584px and the next
 *     container step above that is @2xl);
 *   - @2xl: two columns (cells 324px); with only two items the hairline appears here too (content 288px);
 *   - @5xl (1024px): three columns with hairlines (content 293px after 48px of padding);
 *   - four columns need 4 x (280 + 48) = 1312px, so they start at 84rem (1344px), which no console page reaches:
 *     four items stay two by two in the app. stat.test.tsx recomputes every one of these thresholds from the classes.
 * Class names are written out whole because Tailwind only emits classes it can find in the source. The dividers use
 * `gap-x-0` plus padding on both sides of the rule so the space either side of a hairline is the same.
 */
const WIDE_GRID: Record<number, string> = {
  1: "",
  2: "@2xl:gap-x-0",
  3: "@5xl:grid-cols-3 @5xl:gap-x-0",
  4: "@min-[84rem]:grid-cols-4 @min-[84rem]:gap-x-0",
};
/** First cell of a row: no rule on its left, no left padding. Others: a hairline on the left and padding either side. */
const WIDE_FIRST: Record<number, string> = {
  1: "",
  2: "@2xl:pr-6",
  3: "@5xl:pr-6",
  4: "@min-[84rem]:pr-6",
};
const WIDE_REST: Record<number, string> = {
  1: "",
  2: "@2xl:border-l @2xl:border-line @2xl:px-6",
  3: "@5xl:border-l @5xl:border-line @5xl:px-6",
  4: "@min-[84rem]:border-l @min-[84rem]:border-line @min-[84rem]:px-6",
};

/** Columns of the wide layout for a strip of `count` items: one per item, at most four. */
export function stripColumns(count: number): number {
  return Math.min(Math.max(count, 1), 4);
}

/**
 * The classes of a strip of `count` items: the bordered grid and, per index, the cell. Shared with loading skeletons
 * so a placeholder strip has exactly the shape (and the same overflow behaviour) as the real one.
 */
export function stripLayout(count: number): { grid: string; cell: (index: number) => string | undefined } {
  const k = stripColumns(count);
  return {
    grid: ["grid grid-cols-1 gap-x-6 gap-y-5 border-y border-line py-4 @2xl:grid-cols-2", WIDE_GRID[k]].filter(Boolean).join(" "),
    cell: (index) => (index % k === 0 ? WIDE_FIRST[k] : WIDE_REST[k]) || undefined,
  };
}

/**
 * A hairline-separated strip of stats: one column, then two, then a row of up to four, as its own width allows.
 * `className` lands on the OUTER wrapper (the `@container`), not on the bordered grid, so a caller passing
 * border, padding or background changes what it styles. `container-type: inline-size` collapses a width that comes from
 * its content, so the strip needs a block-level parent (all four consumers are block children, not flex-row items).
 */
export function StatStrip({
  items,
  labelCase = "upper",
  className,
}: {
  items: StatStripItem[];
  labelCase?: StatLabelCase;
  className?: string;
}) {
  const layout = stripLayout(items.length);
  return (
    <div className={["@container", className].filter(Boolean).join(" ")}>
      <div className={layout.grid}>
        {/* Index key: a strip may legitimately repeat a label (two "Net" columns for two periods). */}
        {items.map((item, i) => (
          <Stat
            key={i}
            {...item}
            labelCase={labelCase}
            className={layout.cell(i)}
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
