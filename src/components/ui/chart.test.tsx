import { describe, expect, it } from "vitest";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { computeTicks, BarChart, Sparkline } from "./chart";
import { formatINR } from "@/lib/money";
import { BarChart as BarChartFromUi, Sparkline as SparklineFromUi } from "@/components/ui";

const render = (el: React.ReactElement) => renderToStaticMarkup(el);
const count = (html: string, needle: string) => html.split(needle).length - 1;

// ── computeTicks (pure) ──────────────────────────────────────────────────────

describe("computeTicks", () => {
  it("returns a single zero tick for an empty array", () => {
    const r = computeTicks([]);
    expect(r).toEqual({ min: 0, max: 0, tickValues: [0] });
  });

  it("returns a single zero tick when all values are zero", () => {
    const r = computeTicks([0, 0, 0]);
    expect(r).toEqual({ min: 0, max: 0, tickValues: [0] });
  });

  it("handles a single positive value: min=0, max is a nice ceiling, tickValues spans 0→max", () => {
    const r = computeTicks([10000]);
    expect(r.min).toBe(0);
    expect(r.max).toBeGreaterThanOrEqual(10000);
    expect(r.tickValues[0]).toBe(0);
    expect(r.tickValues[r.tickValues.length - 1]).toBeGreaterThanOrEqual(10000);
    // all tick values should be non-negative
    expect(r.tickValues.every((v) => v >= 0)).toBe(true);
  });

  it("normal series: min=0 when all values ≥ 0, max covers the highest value, ticks are round numbers", () => {
    const r = computeTicks([10000, 50000, 30000]);
    expect(r.min).toBe(0);
    expect(r.max).toBeGreaterThanOrEqual(50000);
    // tick values should be multiples of the step (all divisible evenly — test by checking no fractional remainder)
    const step = r.tickValues[1] - r.tickValues[0];
    expect(step).toBeGreaterThan(0);
    for (const v of r.tickValues) {
      expect(v % step).toBeCloseTo(0, 5);
    }
  });

  it("honours a custom tickCount (default 5): number of ticks ≤ tickCount + 2 (nice ceiling may add one)", () => {
    const r = computeTicks([100, 200, 300, 400], 4);
    expect(r.tickValues.length).toBeLessThanOrEqual(6);
    expect(r.tickValues.length).toBeGreaterThanOrEqual(2);
  });

  it("includes non-finite values gracefully (ignores them)", () => {
    const r = computeTicks([NaN, 50000, Infinity, 30000]);
    expect(r.min).toBe(0);
    expect(r.max).toBeGreaterThanOrEqual(50000);
  });

  it("negative min: axis floor drops below zero", () => {
    const r = computeTicks([-20000, 50000]);
    expect(r.min).toBeLessThanOrEqual(0);
    expect(r.max).toBeGreaterThanOrEqual(50000);
  });
});

// ── BarChart SSR ─────────────────────────────────────────────────────────────

describe("BarChart SSR", () => {
  const data = [
    { label: "Jan", value: 50000 },
    { label: "Feb", value: 120000 },
    { label: "Mar", value: 80000 },
  ];

  it("renders an sr-only table with a caption matching the label prop", () => {
    const html = render(<BarChart data={data} label="Monthly revenue" />);
    expect(html).toContain("sr-only");
    expect(html).toContain("<caption");
    expect(html).toContain("Monthly revenue");
  });

  it("includes one table row per datum with the label text", () => {
    const html = render(<BarChart data={data} label="Monthly revenue" />);
    expect(html).toContain(">Jan<");
    expect(html).toContain(">Feb<");
    expect(html).toContain(">Mar<");
  });

  it("includes formatted INR values (₹) in the sr-only table", () => {
    const html = render(<BarChart data={data} label="Monthly revenue" />);
    expect(html).toContain("₹");
  });

  it("renders an SVG element with a title", () => {
    const html = render(<BarChart data={data} label="Monthly revenue" />);
    expect(html).toContain("<svg");
    expect(html).toContain("<title");
  });

  it("uses good/emerald fill class when positiveMoney is set", () => {
    const html = render(<BarChart data={data} label="Revenue" positiveMoney />);
    expect(html).toContain("var(--color-good)");
  });

  it("uses brand/ink fill class by default", () => {
    const html = render(<BarChart data={data} label="Revenue" />);
    expect(html).toContain("var(--color-brand)");
  });
});

// ── BarChart axes, titles and geometry (SSR) ────────────────────────────────

describe("BarChart axes and markup", () => {
  // 29 Oct .. 11 Nov: 14 days that cross a month boundary.
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = 29 + i;
    return { label: d <= 31 ? `${d} Oct` : `${d - 31} Nov`, value: (i + 1) * 10000 };
  });
  const render14 = () => render(<BarChart data={days} label="Revenue" positiveMoney />);
  // Each x-axis row runs from its marker to the next marker (or the sr-only table).
  const axisRows = (html: string) =>
    html
      .split("data-chart-x=")
      .slice(1)
      .map((r) => r.split("<table")[0]);
  const spans = (row: string) => [...row.matchAll(/<span[^>]*>([^<]*)<\/span>/g)].map((m) => m[1]);

  it("draws no SVG <text>: axis labels are HTML", () => {
    expect(render14()).not.toContain("<text");
  });

  it("y-axis labels are HTML at the 12px meta floor (text-xs), tabular and muted", () => {
    const html = render14();
    const y = html.match(/<div[^>]*data-chart-y[^>]*>.*?<\/div>(?=<svg)/)![0];
    expect(y).toContain("text-xs");
    expect(y).toContain("tabular-nums");
    expect(y).toContain("text-muted");
    expect(y).toContain("₹");
    expect(y).toContain('aria-hidden="true"');
  });

  it("x-axis labels are HTML at text-xs; the day number alone, with the month on the first label and at a month change", () => {
    const rows = axisRows(render14());
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).toContain("text-xs");
      expect(row).toContain("tabular-nums");
    }
    expect(spans(rows[rows.length - 1])).toEqual(["29 Oct", "30", "31", "1 Nov", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]);
  });

  it("thins to every 2nd label on narrow screens, always keeping the last, and re-derives the month for the labels it keeps", () => {
    const rows = axisRows(render14());
    expect(rows).toHaveLength(2);
    // Indexes 13, 11, ... 1 are kept: 30, 1 Nov (month shown only where it changes), 3 ... 11.
    expect(spans(rows[0])).toEqual(["30", "1 Nov", "3", "5", "7", "9", "11"]);
    expect(rows[0]).toContain("sm:hidden");
    expect(rows[1]).toContain("hidden sm:");
  });

  it("never shows two month labels side by side: 25 Oct..7 Nov, narrow row", () => {
    const series = Array.from({ length: 14 }, (_, i) => ({ label: i + 25 <= 31 ? `${i + 25} Oct` : `${i + 25 - 31} Nov`, value: 1 }));
    const rows = axisRows(render(<BarChart data={series} label="Revenue" />));
    expect(rows).toHaveLength(2);
    // Kept: 26 Oct, 28, 30 Oct, 1 Nov, 3 ... 7. "30 Oct" and "1 Nov" would touch, so only the change keeps its month.
    expect(spans(rows[0])).toEqual(["26 Oct", "28", "30", "1 Nov", "3", "5", "7"]);
    expect(spans(rows[1])).toEqual(["25 Oct", "26", "27", "28", "29", "30", "31", "1 Nov", "2", "3", "4", "5", "6", "7"]);
  });

  it("never shows two month labels side by side: 31 Oct..14 Nov, wide row thinned to every 2nd", () => {
    const series = Array.from({ length: 15 }, (_, i) => ({ label: i === 0 ? "31 Oct" : `${i} Nov`, value: 1 }));
    const rows = axisRows(render(<BarChart data={series} label="Revenue" />));
    expect(rows).toHaveLength(2);
    // Wide keeps indexes 0, 2, ... 14: 31 Oct and 2 Nov are neighbours, so 31 Oct loses its month.
    expect(spans(rows[1])).toEqual(["31", "2 Nov", "4", "6", "8", "10", "12", "14"]);
    // Narrow keeps indexes 2, 5, ... 14 (step 3): only the first carries a month.
    expect(spans(rows[0])).toEqual(["2 Nov", "5", "8", "11", "14"]);
  });

  it("renders one axis row when everything fits at every width", () => {
    const html = render(<BarChart data={days.slice(0, 5)} label="Revenue" />);
    expect(axisRows(html)).toHaveLength(1);
    expect(html).not.toContain("sm:hidden");
  });

  it("leaves non 'D Mon' labels as they are", () => {
    const html = render(<BarChart data={[{ label: "Jan", value: 1 }, { label: "Feb", value: 2 }]} label="Revenue" />);
    expect(spans(axisRows(html)[0])).toEqual(["Jan", "Feb"]);
  });

  it("has one <rect> per datum, no rx, a stretch-to-fit viewBox, and non-scaling gridlines", () => {
    const html = render14();
    expect(count(html, "<rect")).toBe(14);
    expect(html).not.toMatch(/\brx=/);
    expect(html).toContain('preserveAspectRatio="none"');
    expect(html).toMatch(/viewBox="0 0 \d+ 100"/);
    expect(html).toContain('vector-effect="non-scaling-stroke"');
    expect(html).toMatch(/<svg[^>]*class="[^"]*h-40[^"]*w-full/);
    expect(html).not.toMatch(/<svg[^>]*\sheight="/);
  });

  it("bars grow with the value and stay inside the plot", () => {
    const hs = [...render14().matchAll(/<rect[^>]*height="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(hs).toHaveLength(14);
    for (let i = 1; i < hs.length; i++) expect(hs[i]).toBeGreaterThan(hs[i - 1]);
    for (const h of hs) expect(h).toBeLessThanOrEqual(100);
  });

  it("every <title> is one string: no <!-- --> text-node separator in the hydrating markup", () => {
    const html = renderToString(<BarChart data={days} label="Revenue" />);
    const titles = [...html.matchAll(/<title[^>]*>(.*?)<\/title>/g)].map((m) => m[1]);
    expect(titles).toHaveLength(15); // chart + 14 bars
    for (const t of titles) expect(t).not.toContain("<!--");
    expect(titles).toContain("29 Oct: " + formatINR(10000));
  });

  it("keeps per-bar focusable image groups and the sr-only table", () => {
    const html = render14();
    expect(count(html, 'tabindex="0"')).toBe(14);
    expect(html).toContain('aria-label="29 Oct: ' + formatINR(10000) + '"');
    expect(count(html, "<tr><td>")).toBe(14);
    expect(html).toContain("<caption>Revenue</caption>");
  });

  it("an all-zero series still renders: one baseline gridline and flat bars", () => {
    const html = render(<BarChart data={days.map((d) => ({ ...d, value: 0 }))} label="Revenue" />);
    expect(count(html, "<rect")).toBe(14);
    expect(count(html, "<line")).toBe(1);
  });

  it("empty data renders no bars and does not throw", () => {
    expect(count(render(<BarChart data={[]} label="Revenue" />), "<rect")).toBe(0);
  });
});

// ── Sparkline SSR ────────────────────────────────────────────────────────────

describe("Sparkline SSR", () => {
  const data = [50000, 70000, 60000, 90000, 80000];

  it("renders an sr-only table", () => {
    const html = render(<Sparkline data={data} label="Revenue trend" />);
    expect(html).toContain("sr-only");
    expect(html).toContain("<table");
  });

  it("renders an SVG polyline or path", () => {
    const html = render(<Sparkline data={data} label="Revenue trend" />);
    expect(html).toMatch(/<polyline|<path/);
  });
});

// ── barrel re-export ──────────────────────────────────────────────────────────

describe("barrel re-exports", () => {
  it("BarChart is re-exported from @/components/ui", () => {
    expect(BarChartFromUi).toBe(BarChart);
  });

  it("Sparkline is re-exported from @/components/ui", () => {
    expect(SparklineFromUi).toBe(Sparkline);
  });
});
