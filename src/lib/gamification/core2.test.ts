import { describe, expect, it } from "vitest";
import { BADGES, badgesToAward } from "./badges";
import { rankRows, shortName } from "./ranking";
import { currentStreak, longestStreak } from "./streak";

describe("streaks", () => {
  it("is 0 with no activity", () => {
    expect(currentStreak([], "2026-10-15")).toBe(0);
    expect(longestStreak([])).toBe(0);
  });
  it("counts consecutive days ending today", () => {
    expect(currentStreak(["2026-10-13", "2026-10-14", "2026-10-15"], "2026-10-15")).toBe(3);
  });
  it("is still live if the last active day was yesterday", () => {
    expect(currentStreak(["2026-10-13", "2026-10-14"], "2026-10-15")).toBe(2);
  });
  it("is dead (0) if the last active day was two or more days ago", () => {
    expect(currentStreak(["2026-10-12", "2026-10-13"], "2026-10-15")).toBe(0);
  });
  it("a gap resets the run; duplicates are ignored", () => {
    expect(currentStreak(["2026-10-10", "2026-10-14", "2026-10-15", "2026-10-15"], "2026-10-15")).toBe(2);
  });
  it("longestStreak finds the best run anywhere, across a month end", () => {
    const days = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-05", "2026-10-06"];
    expect(longestStreak(days)).toBe(4);
  });
});

describe("ranking", () => {
  it("sorts by points desc then name, with shared ranks for ties (1,2,2,4)", () => {
    const rows = [
      { userId: "d", name: "Dev", points: 10 },
      { userId: "a", name: "Asha", points: 50 },
      { userId: "c", name: "Chitra", points: 30 },
      { userId: "b", name: "Bala", points: 30 },
    ];
    expect(rankRows(rows).map((r) => [r.userId, r.rank])).toEqual([["a", 1], ["b", 2], ["c", 2], ["d", 4]]);
  });
  it("shortName hides the surname", () => {
    expect(shortName("Meera Learner")).toBe("Meera L.");
    expect(shortName("  Ravi  Kumar  Singh ")).toBe("Ravi S.");
    expect(shortName("Cher")).toBe("Cher");
    expect(shortName("")).toBe("Member");
  });
});

describe("badges", () => {
  const none = { lessonsCompleted: 0, coursesCompleted: 0, postsCreated: 0, longestStreak: 0, maxLikesOnOnePost: 0 };
  it("awards nothing at zero", () => {
    expect(badgesToAward(none, new Set())).toEqual([]);
  });
  it("awards each badge at its threshold", () => {
    expect(badgesToAward({ ...none, lessonsCompleted: 1 }, new Set())).toEqual(["first_lesson"]);
    expect(badgesToAward({ ...none, coursesCompleted: 1 }, new Set())).toEqual(["course_complete"]);
    expect(badgesToAward({ ...none, postsCreated: 1 }, new Set())).toEqual(["first_post"]);
    expect(badgesToAward({ ...none, longestStreak: 6 }, new Set())).toEqual([]);
    expect(badgesToAward({ ...none, longestStreak: 7 }, new Set())).toEqual(["streak_7"]);
    expect(badgesToAward({ ...none, maxLikesOnOnePost: 9 }, new Set())).toEqual([]);
    expect(badgesToAward({ ...none, maxLikesOnOnePost: 10 }, new Set())).toEqual(["popular_post"]);
  });
  it("skips badges already earned", () => {
    expect(badgesToAward({ ...none, lessonsCompleted: 5, postsCreated: 2 }, new Set(["first_lesson"]))).toEqual(["first_post"]);
  });
  it("catalog has a label and description for every key", () => {
    expect(BADGES.map((b) => b.key).sort()).toEqual(["course_complete", "first_lesson", "first_post", "popular_post", "streak_7"]);
    for (const b of BADGES) expect(b.label && b.description).toBeTruthy();
  });
});
