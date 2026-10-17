import { useId } from "react";
import { formatINR } from "@/lib/money";

// ── Pure helpers (unit-tested) ───────────────────────────────────────────────

/** Round `n` up to the nearest "nice" number (1, 2, 5, 10, 20, …). */
function niceNumber(n: number): number {
  if (n <= 0) return 1;
  const exp = Math.floor(Math.log10(n));
  const frac = n / Math.pow(10, exp);
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return nice * Math.pow(10, exp);
}

/**
 * Compute axis tick positions for a chart.
 *
 * - Empty or all-zero data → `{ min: 0, max: 0, tickValues: [0] }`
 * - All values ≥ 0 → `min` is always 0
 * - Returns `tickCount + 1` ticks (including 0), rounded to a nice step.
 */
export function computeTicks(
  values: number[],
  tickCount = 5,
): { min: number; max: number; tickValues: number[] } {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return { min: 0, max: 0, tickValues: [0] };

  const rawMax = Math.max(...finite);
  const rawMin = Math.min(...finite);

  if (rawMax === 0 && rawMin >= 0) return { min: 0, max: 0, tickValues: [0] };

  // Bar charts always floor at 0 when all values are non-negative.
  const floorMin = rawMin >= 0 ? 0 : rawMin;
  const range = rawMax - floorMin;
  const roughStep = range / tickCount;
  const step = niceNumber(roughStep);

  const niceMin = floorMin >= 0 ? 0 : Math.floor(floorMin / step) * step;
  const niceMax = Math.ceil(rawMax / step) * step;

  const tickValues: number[] = [];
  const epsilon = step * 1e-9;
  for (let v = niceMin; v <= niceMax + epsilon; v += step) {
    tickValues.push(Math.round(v));
  }

  return { min: niceMin, max: niceMax, tickValues };
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChartDatum {
  label: string;
  /** Value in paise (₹1 = 100 paise). */
  value: number;
}

// ── BarChart ─────────────────────────────────────────────────────────────────

// The plot is an SVG stretched to its container (preserveAspectRatio="none"), so it always fills the width and its
// height is plain CSS (h-40). Text never lives in the SVG: it would scale with the stretch and drop below 12px on a
// phone. Axis labels are HTML at text-xs instead. Bars sit in 10-wide slots (6 wide, centred) on a 0..100 y scale.
const SLOT = 10;
const BAR_W = 6;
const PLOT_H = 100;
const MIN_BAR_H = 1.25; // about 2px at the h-40 plot height, so a zero day still shows a baseline stub

/** Labels that fit on a phone (~22px per label at 390) and at sm and up (~39px). Longer series thin out further. */
const NARROW_MAX_LABELS = 7;
const WIDE_MAX_LABELS = 14;

/** Keep every `step`th label counting back from the last, so the newest day is always shown. */
function keepEvery(count: number, step: number): boolean[] {
  return Array.from({ length: count }, (_, i) => (count - 1 - i) % step === 0);
}

/** "4 Oct" -> { day: "4", month: "Oct" }. Anything else is shown whole, with no month. */
function splitLabel(label: string): { day: string; month: string | null } {
  const m = /^(\d{1,2})\s+(\S+)$/.exec(label);
  return m ? { day: m[1], month: m[2] } : { day: label, month: null };
}

/**
 * Axis text for the kept labels: the day, plus the month on the first one and wherever the month changes.
 * Two neighbouring kept labels never both carry a month (they would touch at 320px): the earlier one drops
 * it, so a crossing reads "30, 1 Nov".
 *
 * Labels are expected to be a daily "D Mon" series (consecutive days, so a month change is a rare event).
 * Known behaviour outside that:
 * - A run of 3+ month-bearing kept labels (e.g. monthly data "1 Aug", "1 Sep", "1 Oct", "1 Nov") drops the
 *   month on every one but the last, rendering "1", "1", "1", "1 Nov". Accepted: not a supported shape.
 * - A label that does not parse as "D Mon" is shown whole and resets the month tracking, so the next
 *   parseable label shows its month again.
 */
function axisTexts(data: ChartDatum[], keep: boolean[]): (string | null)[] {
  let prevMonth: string | null | undefined;
  const parts = data.map((d, i) => {
    if (!keep[i]) return null;
    const { day, month } = splitLabel(d.label);
    const showMonth = month !== null && (prevMonth === undefined || month !== prevMonth);
    prevMonth = month;
    return { day, month, showMonth };
  });
  const keptIdx = parts.flatMap((p, i) => (p ? [i] : []));
  const dropMonth = new Set<number>();
  for (let k = 0; k + 1 < keptIdx.length; k++) {
    if (parts[keptIdx[k]]!.showMonth && parts[keptIdx[k + 1]]!.showMonth) dropMonth.add(keptIdx[k]);
  }
  return parts.map((p, i) => (p === null ? null : p.showMonth && !dropMonth.has(i) ? `${p.day} ${p.month}` : p.day));
}

function XAxis({ data, step, className }: { data: ChartDatum[]; step: number; className: string }) {
  const texts = axisTexts(data, keepEvery(data.length, step));
  return (
    <div
      data-chart-x=""
      aria-hidden="true"
      className={`${className} mt-2 text-xs tabular-nums text-muted`}
      style={{ gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(0, 1fr))` }}
    >
      {data.map((d, i) => (
        <div key={`${i}-${d.label}`} className="flex min-w-0 justify-center">
          {texts[i] !== null && <span className="whitespace-nowrap leading-4">{texts[i]}</span>}
        </div>
      ))}
    </div>
  );
}

// Values are expected to be non-negative: bars grow from the axis minimum (0 for non-negative data).
export function BarChart({
  data,
  label,
  positiveMoney = false,
  tickCount = 5,
  className,
}: {
  data: ChartDatum[];
  label: string;
  positiveMoney?: boolean;
  tickCount?: number;
  className?: string;
}) {
  const uid = useId();
  const titleId = `${uid}-chart-title`;
  const values = data.map((d) => d.value);
  const { min, max, tickValues } = computeTicks(values, tickCount);
  const barFill = positiveMoney ? "var(--color-good)" : "var(--color-brand)";
  const slots = Math.max(data.length, 1);

  // Distance from the plot floor, 0..PLOT_H.
  const rise = (v: number) => (max === min ? 0 : ((Math.max(v, min) - min) / (max - min)) * PLOT_H);

  const narrowStep = Math.max(1, Math.ceil(data.length / NARROW_MAX_LABELS));
  const wideStep = Math.max(1, Math.ceil(data.length / WIDE_MAX_LABELS));

  return (
    <div className={className}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 pt-2">
        {/* Y-axis: zero-height rows pinned to the gridlines, each label centred on its line. */}
        <div
          data-chart-y=""
          aria-hidden="true"
          className="flex h-40 flex-col-reverse justify-between text-right text-xs tabular-nums text-muted"
        >
          {tickValues.map((tick, i) => (
            <div key={i} className="flex h-0 items-center justify-end">
              <span className="whitespace-nowrap leading-4">{formatINR(tick)}</span>
            </div>
          ))}
        </div>

        <svg
          role="img"
          aria-labelledby={titleId}
          viewBox={`0 0 ${slots * SLOT} ${PLOT_H}`}
          preserveAspectRatio="none"
          className="block h-40 w-full overflow-visible"
        >
          <title id={titleId}>{label}</title>

          {tickValues.map((tick, i) => {
            const y = PLOT_H - rise(tick);
            return (
              <line
                key={i}
                x1={0}
                x2={slots * SLOT}
                y1={y}
                y2={y}
                stroke="var(--color-line)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {data.map((d, i) => {
            const h = Math.max(MIN_BAR_H, rise(d.value));
            const text = `${d.label}: ${formatINR(d.value)}`;
            return (
              <g key={`${i}-${d.label}`} tabIndex={0} role="img" aria-label={text}>
                <title>{text}</title>
                <rect x={i * SLOT + (SLOT - BAR_W) / 2} y={PLOT_H - h} width={BAR_W} height={h} fill={barFill} />
              </g>
            );
          })}
        </svg>

        <div />
        {narrowStep === wideStep ? (
          <XAxis data={data} step={wideStep} className="grid" />
        ) : (
          <>
            <XAxis data={data} step={narrowStep} className="grid sm:hidden" />
            <XAxis data={data} step={wideStep} className="hidden sm:grid" />
          </>
        )}
      </div>

      {/* Screen-reader fallback table */}
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={`${i}-${d.label}`}>
              <td>{d.label}</td>
              <td>{formatINR(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

const SPARK_W = 120;
const SPARK_H = 32;
const SPARK_PAD = 2;

export function Sparkline({
  data,
  label,
  positiveMoney = false,
  className,
}: {
  data: number[];
  label: string;
  positiveMoney?: boolean;
  className?: string;
}) {
  const finite = data.filter(Number.isFinite);
  const stroke = positiveMoney ? "var(--color-good)" : "var(--color-brand)";

  let points = "";
  if (finite.length >= 2) {
    const minV = Math.min(...finite);
    const maxV = Math.max(...finite);
    const range = maxV - minV || 1;
    const w = SPARK_W - SPARK_PAD * 2;
    const h = SPARK_H - SPARK_PAD * 2;
    points = finite
      .map((v, i) => {
        const x = SPARK_PAD + (i / (finite.length - 1)) * w;
        const y = SPARK_PAD + h - ((v - minV) / range) * h;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }

  return (
    <div className={className}>
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
        width={SPARK_W}
        height={SPARK_H}
        style={{ overflow: "visible" }}
      >
        {points && (
          <polyline
            points={points}
            fill="none"
            stroke={stroke}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </svg>

      {/* Screen-reader fallback table */}
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Index</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          {finite.map((v, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{formatINR(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
