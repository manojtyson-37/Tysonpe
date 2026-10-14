import { describe, expect, it } from "vitest";
import { computeProgress } from "./progress";

const items = [
  { id: "a", required: true },
  { id: "b", required: true },
  { id: "c", required: false },
  { id: "d", required: true },
];

describe("computeProgress", () => {
  it("counts only required lessons", () =>
    expect(computeProgress(items, new Set(["a"]))).toEqual({ done: 1, total: 3, pct: 33, complete: false }));
  it("optional lessons never move progress", () =>
    expect(computeProgress(items, new Set(["c"]))).toMatchObject({ done: 0, pct: 0 }));
  it("complete when every required lesson is done (optional ignored)", () =>
    expect(computeProgress(items, new Set(["a", "b", "d"]))).toEqual({ done: 3, total: 3, pct: 100, complete: true }));
  it("ignores completed ids that aren't in the course", () =>
    expect(computeProgress(items, new Set(["a", "ghost"]))).toMatchObject({ done: 1 }));
  it("a course with no required lessons is never 'complete' (no empty-course certificates)", () => {
    expect(computeProgress([{ id: "x", required: false }], new Set(["x"]))).toEqual({ done: 0, total: 0, pct: 0, complete: false });
    expect(computeProgress([], new Set())).toMatchObject({ complete: false });
  });
});
