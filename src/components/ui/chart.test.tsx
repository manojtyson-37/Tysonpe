import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { computeTicks, BarChart, Sparkline } from "./chart";
import { BarChart as BarChartFromUi, Sparkline as SparklineFromUi } from "@/components/ui";

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

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
