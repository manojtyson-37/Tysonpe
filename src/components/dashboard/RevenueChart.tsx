"use client";

import { useState } from "react";
import { formatINR } from "@/lib/money";

export interface DayData {
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "15 Oct"
  weekday: string; // e.g. "Wed"
  revenuePaise: number;
  ordersCount: number;
}

interface RevenueChartProps {
  daysData: DayData[];
}

export function RevenueChart({ daysData }: RevenueChartProps) {
  const [range, setRange] = useState<7 | 14 | 30>(14);
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Slice based on selected timeframe
  const currentDays = daysData.slice(-range);

  const totalRevenuePaise = currentDays.reduce((acc, d) => acc + d.revenuePaise, 0);
  const totalOrders = currentDays.reduce((acc, d) => acc + d.ordersCount, 0);

  const values = currentDays.map((d) => (metric === "revenue" ? d.revenuePaise : d.ordersCount));
  const maxVal = Math.max(metric === "revenue" ? 100 : 1, ...values);

  // Find peak day
  const peakIdx = values.indexOf(Math.max(...values));
  const peakDay = currentDays[peakIdx];
  const hasData = values.some((v) => v > 0);

  const activeHoveredDay = hoveredIdx !== null ? currentDays[hoveredIdx] : null;

  return (
    <div className="card p-5 sm:p-6 shadow-2xs">
      {/* Chart Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted">
              Sales & Performance Analytics
            </h2>
            <span className="badge badge-brand text-[10px]">Live Data</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2.5">
            <p className="font-display text-2xl font-extrabold tabular-nums text-ink sm:text-3xl">
              {metric === "revenue" ? formatINR(totalRevenuePaise) : `${totalOrders} orders`}
            </p>
            {hasData && peakDay && (
              <span className="text-xs text-muted">
                (Peak: {metric === "revenue" ? formatINR(peakDay.revenuePaise) : `${peakDay.ordersCount} orders`} on {peakDay.dayLabel})
              </span>
            )}
          </div>
        </div>

        {/* Filter Controls (Segmented Control) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector */}
          <div className="flex rounded-lg border border-line bg-surface-2 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMetric("revenue")}
              className={`rounded-md px-2.5 py-1 transition-all ${
                metric === "revenue"
                  ? "bg-surface text-ink shadow-2xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              Revenue
            </button>
            <button
              type="button"
              onClick={() => setMetric("orders")}
              className={`rounded-md px-2.5 py-1 transition-all ${
                metric === "orders"
                  ? "bg-surface text-ink shadow-2xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              Orders
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex rounded-lg border border-line bg-surface-2 p-0.5 text-xs font-semibold">
            {([7, 14, 30] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  range === r
                    ? "bg-surface text-ink shadow-2xs"
                    : "text-muted hover:text-ink"
                }`}
              >
                {r}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="relative mt-6 pt-4">
        {/* Hover Tooltip Overlay */}
        {activeHoveredDay && (
          <div className="absolute top-0 right-0 rounded-lg border border-line bg-surface px-3 py-1.5 shadow-sm text-xs pointer-events-none">
            <span className="font-semibold text-ink">
              {activeHoveredDay.dayLabel} ({activeHoveredDay.weekday}):
            </span>{" "}
            <span className="font-bold text-brand tabular-nums">
              {formatINR(activeHoveredDay.revenuePaise)}
            </span>{" "}
            <span className="text-muted">
              ({activeHoveredDay.ordersCount} {activeHoveredDay.ordersCount === 1 ? "order" : "orders"})
            </span>
          </div>
        )}

        {/* The Bars */}
        <div className="flex h-44 items-end gap-1 sm:gap-2">
          {currentDays.map((d, idx) => {
            const val = metric === "revenue" ? d.revenuePaise : d.ordersCount;
            const pct = Math.max(val > 0 ? 8 : 3, (val / maxVal) * 100);
            const isHovered = hoveredIdx === idx;
            const isPeak = val > 0 && idx === peakIdx;

            return (
              <div
                key={d.date}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="group relative flex h-full flex-1 cursor-pointer flex-col justify-end items-center"
              >
                <div
                  className={`w-full rounded-t-md transition-all duration-150 ${
                    val > 0
                      ? isHovered
                        ? "bg-brand brightness-115 scale-y-[1.02]"
                        : isPeak
                        ? "bg-brand"
                        : "bg-brand/85"
                      : isHovered
                      ? "bg-surface-2"
                      : "bg-surface-2/80"
                  }`}
                  style={{ height: `${pct}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* X-Axis Dates */}
        <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-[11px] font-mono text-muted">
          <span>{currentDays[0]?.dayLabel}</span>
          {currentDays.length > 10 && (
            <span>{currentDays[Math.floor(currentDays.length / 2)]?.dayLabel}</span>
          )}
          <span>Today ({currentDays[currentDays.length - 1]?.dayLabel})</span>
        </div>
      </div>
    </div>
  );
}
