import { describe, expect, it } from "vitest";
import { buildRevenueSeries, dayLabel, seriesDays, seriesStart } from "./overview-series";

// 2026-10-15 12:00 UTC is 17:30 IST on 15 Oct.
const NOW = Date.parse("2026-10-15T12:00:00Z");
const order = (paidAt: string | null, totalPaise: number) => ({ paidAt: paidAt ? new Date(paidAt) : null, totalPaise });
const valueOn = (series: ReturnType<typeof buildRevenueSeries>, key: string) => series.find((p) => p.key === key)?.value;

describe("overview series: 14 IST days", () => {
  it("has exactly 14 entries, oldest first, ending with today in IST", () => {
    const s = buildRevenueSeries(NOW, []);
    expect(s).toHaveLength(14);
    expect(s[0].key).toBe("2026-10-02");
    expect(s[13].key).toBe("2026-10-15");
    expect(s.map((p) => p.key)).toEqual([...s.map((p) => p.key)].sort());
  });

  it("gives days with no orders a value of 0", () => {
    const s = buildRevenueSeries(NOW, [order("2026-10-10T05:00:00Z", 1000)]);
    expect(s.filter((p) => p.value === 0)).toHaveLength(13);
    expect(valueOn(s, "2026-10-10")).toBe(1000);
  });

  it("puts 18:29 UTC on the same IST day and 18:31 UTC on the NEXT one", () => {
    const s = buildRevenueSeries(NOW, [order("2026-10-10T18:29:00Z", 100), order("2026-10-10T18:31:00Z", 7)]);
    expect(valueOn(s, "2026-10-10")).toBe(100);
    expect(valueOn(s, "2026-10-11")).toBe(7);
  });

  it("sums several orders on one day and ignores unpaid dates and orders outside the window", () => {
    const s = buildRevenueSeries(NOW, [
      order("2026-10-12T04:00:00Z", 300),
      order("2026-10-12T11:00:00Z", 200),
      order(null, 999),
      order("2026-10-01T10:00:00Z", 999), // the day before the oldest bar
      order("2026-10-16T10:00:00Z", 999), // tomorrow
    ]);
    expect(valueOn(s, "2026-10-12")).toBe(500);
    expect(s.reduce((n, p) => n + p.value, 0)).toBe(500);
    expect(s).toHaveLength(14);
  });

  it("counts an early-morning order on the oldest day (it is before the clock time 13 days ago)", () => {
    // 2026-10-02 00:30 IST. "Now minus 13 days" is 2026-10-02 12:00 UTC, which is after this order.
    const early = order("2026-10-01T19:00:00Z", 4200);
    expect(valueOn(buildRevenueSeries(NOW, [early]), "2026-10-02")).toBe(4200);
    expect(early.paidAt!.getTime()).toBeLessThan(NOW - 13 * 864e5);
  });

  it("labels days short, not as ISO", () => {
    const s = buildRevenueSeries(NOW, []);
    expect(s[0].label).toBe("2 Oct");
    expect(s[13].label).toBe("15 Oct");
    expect(new Set(s.map((p) => p.label)).size).toBe(14);
    expect(dayLabel("2026-03-04")).toBe("4 Mar");
    expect(dayLabel("2026-09-30")).toBe("30 Sep");
  });

  it("crosses a month and a year boundary", () => {
    const s = buildRevenueSeries(Date.parse("2027-01-03T06:00:00Z"), []);
    expect(s[0].key).toBe("2026-12-21");
    expect(s.map((p) => p.label)).toContain("31 Dec");
    expect(s[13].label).toBe("3 Jan");
  });

  it("rolls the last bar over at IST midnight, not UTC midnight", () => {
    // 18:29 UTC = 23:59 IST on 15 Oct; 18:30 UTC = 00:00 IST on 16 Oct.
    expect(seriesDays(Date.parse("2026-10-15T18:29:00Z")).at(-1)).toBe("2026-10-15");
    expect(seriesDays(Date.parse("2026-10-15T18:30:00Z")).at(-1)).toBe("2026-10-16");
  });
});

describe("overview series: query start", () => {
  it("is the first instant of the oldest bar's IST day", () => {
    expect(seriesStart(NOW).toISOString()).toBe("2026-10-01T18:30:00.000Z");
  });

  it("is never later than any order the oldest bar should count", () => {
    expect(seriesStart(NOW).getTime()).toBeLessThanOrEqual(Date.parse("2026-10-01T18:30:00Z"));
    expect(seriesStart(NOW).getTime()).toBeLessThan(NOW - 13 * 864e5);
  });
});
