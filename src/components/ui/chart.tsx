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

const BAR_PADDING = 44; // left margin for y-axis labels
const BOTTOM_PADDING = 32; // height for x-axis labels
const TOP_PADDING = 8;
const CHART_HEIGHT = 200;
const CHART_WIDTH = 480;

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
  const titleId = `chart-title-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const values = data.map((d) => d.value);
  const { min, max, tickValues } = computeTicks(values, tickCount);
  const plotH = CHART_HEIGHT - TOP_PADDING - BOTTOM_PADDING;
  const plotW = CHART_WIDTH - BAR_PADDING;
  const barFill = positiveMoney ? "var(--color-good)" : "var(--color-brand)";

  const yScale = (v: number) => {
    if (max === min) return plotH;
    return plotH - ((v - min) / (max - min)) * plotH;
  };

  const barWidth = data.length > 0 ? Math.max(4, plotW / data.length - 8) : 0;
  const barSlot = data.length > 0 ? plotW / data.length : 0;

  return (
    <div className={className}>
      <svg
        role="img"
        aria-labelledby={titleId}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        width="100%"
        height={CHART_HEIGHT}
        style={{ overflow: "visible" }}
      >
        <title id={titleId}>{label}</title>

        {/* Y-axis ticks */}
        {tickValues.map((tick) => {
          const y = TOP_PADDING + yScale(tick);
          return (
            <g key={tick}>
              <line
                x1={BAR_PADDING - 4}
                x2={CHART_WIDTH}
                y1={y}
                y2={y}
                stroke="var(--color-line)"
                strokeWidth={1}
              />
              <text
                x={BAR_PADDING - 8}
                y={y + 4}
                textAnchor="end"
                fontSize={10}
                fill="var(--color-muted)"
                fontFamily="inherit"
              >
                {formatINR(tick)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const x = BAR_PADDING + i * barSlot + (barSlot - barWidth) / 2;
          const yTop = TOP_PADDING + yScale(Math.max(d.value, min));
          const barH = Math.max(2, plotH - yScale(Math.max(d.value, min)));
          return (
            <g
              key={d.label}
              tabIndex={0}
              role="img"
              aria-label={`${d.label}: ${formatINR(d.value)}`}
            >
              <title>
                {d.label}: {formatINR(d.value)}
              </title>
              <rect
                x={x}
                y={yTop}
                width={barWidth}
                height={barH}
                rx={2}
                fill={barFill}
              />
              <text
                x={x + barWidth / 2}
                y={CHART_HEIGHT - BOTTOM_PADDING + 16}
                textAnchor="middle"
                fontSize={10}
                fill="var(--color-muted)"
                fontFamily="inherit"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

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
          {data.map((d) => (
            <tr key={d.label}>
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
