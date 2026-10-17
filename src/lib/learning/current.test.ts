import { describe, expect, it } from "vitest";
import { NOTICES, noticeCode, resolveCurrentLesson } from "./current";

const L = (id: string, completed = false, unlocked = true) => ({ id, completed, state: { unlocked } });
const course = [L("a", true), L("b"), L("c")];

describe("resolveCurrentLesson", () => {
  it("a valid ?lesson= is the current lesson, with its index, and never redirects (so it cannot loop)", () => {
    expect(resolveCurrentLesson("p1", course, "c", undefined)).toEqual({ kind: "lesson", lesson: course[2], index: 2 });
    // a completed lesson, a locked one: still the one asked for
    expect(resolveCurrentLesson("p1", [L("a", true), L("b", false, false)], "b", undefined).kind).toBe("lesson");
    expect(resolveCurrentLesson("p1", course, "a", undefined).kind).toBe("lesson");
  });

  it("with no ?lesson= it redirects to the first unlocked, unfinished lesson by explicit id", () => {
    expect(resolveCurrentLesson("p1", course, undefined, undefined)).toEqual({ kind: "redirect", to: "/library/p1?lesson=b" });
  });

  it("the target does not change when the course is finished: it falls back to the first lesson, and that URL is stable", () => {
    const done = [L("a", true), L("b", true)];
    const r = resolveCurrentLesson("p1", done, undefined, undefined);
    expect(r).toEqual({ kind: "redirect", to: "/library/p1?lesson=a" });
    // following the redirect resolves to a lesson: one hop, no loop
    expect(resolveCurrentLesson("p1", done, "a", undefined).kind).toBe("lesson");
  });

  it("an unknown, foreign, empty or repeated ?lesson= redirects once to a valid lesson, and that target is accepted", () => {
    for (const bad of ["nope", "", ["a", "b"], 5, null]) {
      const r = resolveCurrentLesson("p1", course, bad, undefined);
      expect(r, String(bad)).toEqual({ kind: "redirect", to: "/library/p1?lesson=b" });
      const id = new URL((r as { to: string }).to, "http://x").searchParams.get("lesson");
      expect(resolveCurrentLesson("p1", course, id, undefined).kind).toBe("lesson");
    }
  });

  it("a course with no lessons is the empty state: no redirect, whatever the query says", () => {
    expect(resolveCurrentLesson("p1", [], undefined, undefined)).toEqual({ kind: "empty" });
    expect(resolveCurrentLesson("p1", [], "x", "locked")).toEqual({ kind: "empty" });
  });

  it("carries a known notice code across the redirect and drops anything else", () => {
    expect(resolveCurrentLesson("p1", course, undefined, "locked")).toEqual({ kind: "redirect", to: "/library/p1?lesson=b&notice=locked" });
    expect(resolveCurrentLesson("p1", course, "zzz", "unavailable")).toEqual({ kind: "redirect", to: "/library/p1?lesson=b&notice=unavailable" });
    for (const raw of ["<script>alert(1)</script>", "constructor", "__proto__", "toString", "", ["locked"], undefined]) {
      expect(resolveCurrentLesson("p1", course, undefined, raw), String(raw)).toEqual({ kind: "redirect", to: "/library/p1?lesson=b" });
    }
  });

  it("encodes the ids it puts in the URL", () => {
    expect(resolveCurrentLesson("p 1", [L("a&b")], undefined, undefined)).toEqual({ kind: "redirect", to: "/library/p%201?lesson=a%26b" });
  });
});

describe("noticeCode", () => {
  it("accepts only own keys of NOTICES", () => {
    expect(Object.keys(NOTICES).sort()).toEqual(["locked", "unavailable"]);
    expect(noticeCode("locked")).toBe("locked");
    expect(noticeCode("constructor")).toBeNull();
    expect(noticeCode(undefined)).toBeNull();
  });
});
