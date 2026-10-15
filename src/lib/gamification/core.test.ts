import { describe, expect, it } from "vitest";
import { levelFor } from "./levels";
import { POINT_RULES, isPointKind } from "./rules";
import { addDays, istDayKey, istDayStart, istWeekStart } from "./time";

describe("IST time helpers", () => {
  it("rolls the day over at 18:30 UTC (IST midnight)", () => {
    expect(istDayKey(new Date("2026-10-15T18:29:59Z"))).toBe("2026-10-15");
    expect(istDayKey(new Date("2026-10-15T18:30:00Z"))).toBe("2026-10-16");
  });
  it("istDayStart is the UTC instant of IST midnight", () => {
    expect(istDayStart("2026-10-16").toISOString()).toBe("2026-10-15T18:30:00.000Z");
  });
  it("addDays crosses month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("week starts Monday 00:00 IST", () => {
    // Thursday 2026-10-15 12:00 IST -> Monday 2026-10-12 00:00 IST
    expect(istWeekStart(new Date("2026-10-15T06:30:00Z")).toISOString()).toBe("2026-10-11T18:30:00.000Z");
    // Monday 00:00:00 IST exactly stays that Monday
    expect(istWeekStart(new Date("2026-10-11T18:30:00Z")).toISOString()).toBe("2026-10-11T18:30:00.000Z");
    // Sunday 23:59 IST belongs to the week that began the previous Monday
    expect(istWeekStart(new Date("2026-10-11T18:29:59Z")).toISOString()).toBe("2026-10-04T18:30:00.000Z");
  });
});

describe("point rules", () => {
  it("has the spec's values", () => {
    expect(POINT_RULES.lesson_complete).toEqual({ points: 10 });
    expect(POINT_RULES.quiz_pass).toEqual({ points: 25 });
    expect(POINT_RULES.course_complete).toEqual({ points: 100 });
    expect(POINT_RULES.post_created).toEqual({ points: 5, dailyCap: 3 });
    expect(POINT_RULES.comment_created).toEqual({ points: 2, dailyCap: 10 });
    expect(POINT_RULES.like_received).toEqual({ points: 1, dailyCap: 20 });
  });
  it("isPointKind guards unknown strings", () => {
    expect(isPointKind("quiz_pass")).toBe(true);
    expect(isPointKind("hack")).toBe(false);
  });
});

describe("levelFor", () => {
  it("maps each threshold boundary", () => {
    const cases: Array<[number, number]> = [
      [0, 1], [99, 1], [100, 2], [249, 2], [250, 3], [499, 3], [500, 4], [999, 4], [1000, 5],
      [1999, 5], [2000, 6], [3499, 6], [3500, 7], [5499, 7], [5500, 8], [7999, 8], [8000, 9],
      [11999, 9], [12000, 10], [16999, 10], [17000, 11], [22000, 12],
    ];
    for (const [pts, lvl] of cases) expect(levelFor(pts).level, `${pts} pts`).toBe(lvl);
  });
  it("reports progress inside the level", () => {
    expect(levelFor(160)).toEqual({ level: 2, floor: 100, next: 250, into: 60, span: 150 });
    expect(levelFor(12000)).toEqual({ level: 10, floor: 12000, next: 17000, into: 0, span: 5000 });
  });
  it("clamps negatives to level 1", () => {
    expect(levelFor(-5).level).toBe(1);
    expect(levelFor(-5).into).toBe(0);
  });
});
