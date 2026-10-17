import { istDay } from "@/lib/format";

// Not a route file: Next treats page/layout/loading/route specially, a plain module next to them is left alone.

const DAY_MS = 864e5;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const SERIES_DAYS = 14;

export type RevenuePoint = {
  /** IST calendar day, "YYYY-MM-DD". */
  key: string;
  /** Short axis label, "15 Oct". */
  label: string;
  /** Gross paid revenue that day, in paise. */
  value: number;
};

/** IST day keys of the last `count` days ending with the day containing `now`, oldest first. */
export function seriesDays(now: number, count = SERIES_DAYS): string[] {
  // India has no daylight saving, so stepping back whole 24h blocks always lands on the previous IST day.
  return Array.from({ length: count }, (_, i) => istDay(new Date(now - (count - 1 - i) * DAY_MS)));
}

/** The first instant of the oldest bar's IST day. Query paid orders from here, not from "13 days ago, same time". */
export function seriesStart(now: number, count = SERIES_DAYS): Date {
  return new Date(`${seriesDays(now, count)[0]}T00:00:00+05:30`);
}

/** "2026-10-15" -> "15 Oct". Built from the key itself, so the host timezone and ICU data cannot change it. */
export function dayLabel(key: string): string {
  const [, month, day] = key.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

/** Sum paid orders into the 14 IST days ending today. Orders outside the window or without a paid date are ignored. */
export function buildRevenueSeries(
  now: number,
  orders: { paidAt: Date | null; totalPaise: number }[],
): RevenuePoint[] {
  const days = seriesDays(now);
  const byDay = new Map(days.map((d) => [d, 0]));
  for (const o of orders) {
    if (!o.paidAt) continue;
    const key = istDay(o.paidAt);
    const sum = byDay.get(key);
    if (sum !== undefined) byDay.set(key, sum + o.totalPaise);
  }
  return days.map((key) => ({ key, label: dayLabel(key), value: byDay.get(key) ?? 0 }));
}
