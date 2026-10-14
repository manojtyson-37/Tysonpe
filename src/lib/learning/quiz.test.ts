import { describe, expect, it } from "vitest";
import { attemptsLeft, gradeQuiz, seededShuffle, validateQuizDefinition, type GradableQuestion } from "./quiz";

const q = (id: string, kind: "single" | "multi", correct: string[], all: string[]): GradableQuestion => ({
  id, kind, options: all.map((o) => ({ id: o, correct: correct.includes(o) })),
});
const questions = [
  q("q1", "single", ["a"], ["a", "b", "c"]),
  q("q2", "multi", ["x", "y"], ["x", "y", "z"]),
  q("q3", "single", ["m"], ["m", "n"]),
  q("q4", "single", ["p"], ["p", "r"]),
];

describe("gradeQuiz", () => {
  it("all correct = 100% and passes", () => {
    const r = gradeQuiz(questions, { q1: ["a"], q2: ["x", "y"], q3: ["m"], q4: ["p"] }, 70);
    expect(r.scorePct).toBe(100);
    expect(r.passed).toBe(true);
    expect(r.results.every((x) => x.correct)).toBe(true);
  });
  it("multi needs the exact set: a subset is wrong", () =>
    expect(gradeQuiz(questions, { q1: ["a"], q2: ["x"], q3: ["m"], q4: ["p"] }, 70).results[1].correct).toBe(false));
  it("multi: extra wrong option makes it wrong", () =>
    expect(gradeQuiz(questions, { q2: ["x", "y", "z"] }, 70).results[1].correct).toBe(false));
  it("single: selecting two options is wrong even if one is right", () =>
    expect(gradeQuiz(questions, { q1: ["a", "b"] }, 70).results[0].correct).toBe(false));
  it("unanswered questions are wrong", () => {
    const r = gradeQuiz(questions, {}, 70);
    expect(r.scorePct).toBe(0);
    expect(r.passed).toBe(false);
  });
  it("unknown option ids are ignored and cannot score", () => {
    const r = gradeQuiz(questions, { q1: ["nope"], q3: ["m", "ghost"] }, 70);
    expect(r.results[0].correct).toBe(false);
    expect(r.results[2].correct).toBe(true); // 'ghost' dropped, 'm' remains and is exact
  });
  it("answers for questions that don't exist are ignored", () =>
    expect(gradeQuiz(questions, { zzz: ["a"] }, 70).scorePct).toBe(0));
  it("pass mark boundary: 3/4 = 75% passes at 75, fails at 76", () => {
    const a = { q1: ["a"], q2: ["x", "y"], q3: ["m"], q4: ["r"] };
    expect(gradeQuiz(questions, a, 75)).toMatchObject({ scorePct: 75, passed: true });
    expect(gradeQuiz(questions, a, 76)).toMatchObject({ scorePct: 75, passed: false });
  });
  it("rounds to nearest percent", () => {
    const three = questions.slice(0, 3);
    expect(gradeQuiz(three, { q1: ["a"] }, 10).scorePct).toBe(33);
  });
  it("a quiz with no questions can never pass", () =>
    expect(gradeQuiz([], {}, 0)).toMatchObject({ scorePct: 0, passed: false }));
});

describe("gradeQuiz: pass-mark honesty", () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => q(`m${i}`, "single", ["a"], ["a", "b"]));
  const answersFor = (qs: GradableQuestion[], right: number) =>
    Object.fromEntries(qs.map((x, i) => [x.id, [i < right ? "a" : "b"]]));

  it("never rounds a failing score up across the pass mark (139/200 = 69.5% fails a 70% mark)", () => {
    const qs = many(200);
    const r = gradeQuiz(qs, answersFor(qs, 139), 70);
    expect(r.passed).toBe(false);
    expect(r.scorePct).toBeLessThan(70); // the displayed score never exceeds the real one
  });
  it("140/200 = exactly 70% passes", () => {
    const qs = many(200);
    expect(gradeQuiz(qs, answersFor(qs, 140), 70)).toMatchObject({ passed: true, scorePct: 70 });
  });
  it("a pass mark of 0 still needs at least one correct answer", () =>
    expect(gradeQuiz(questions, { q1: ["b"] }, 0).passed).toBe(false));
  it("a question with no correct option in its key can never be answered correctly", () => {
    const broken = [q("z", "single", [], ["a", "b"])];
    expect(gradeQuiz(broken, { z: ["a"] }, 1)).toMatchObject({ scorePct: 0, passed: false });
  });
});

describe("attemptsLeft", () => {
  it("unlimited when max is null", () => expect(attemptsLeft(null, 99)).toBeNull());
  it("counts down and floors at zero", () => {
    expect(attemptsLeft(3, 1)).toBe(2);
    expect(attemptsLeft(3, 3)).toBe(0);
    expect(attemptsLeft(3, 7)).toBe(0);
  });
});

describe("seededShuffle", () => {
  const arr = ["a", "b", "c", "d", "e", "f"];
  it("is deterministic for a seed and keeps all items", () => {
    expect(seededShuffle(arr, "s1")).toEqual(seededShuffle(arr, "s1"));
    expect([...seededShuffle(arr, "s1")].sort()).toEqual(arr);
  });
  it("differs across seeds (at least one of several)", () => {
    const outs = new Set(["s1", "s2", "s3", "s4"].map((s) => seededShuffle(arr, s).join("")));
    expect(outs.size).toBeGreaterThan(1);
  });
  it("does not mutate its input", () => {
    const copy = [...arr];
    seededShuffle(arr, "x");
    expect(arr).toEqual(copy);
  });
});

describe("validateQuizDefinition", () => {
  const good = { prompt: "Q?", kind: "single" as const, options: [{ text: "a", correct: true }, { text: "b", correct: false }] };
  it("accepts a valid quiz", () => expect(validateQuizDefinition([good])).toBeNull());
  it("needs at least one question", () => expect(validateQuizDefinition([])).toMatch(/question/i));
  it("needs a prompt", () => expect(validateQuizDefinition([{ ...good, prompt: " " }])).toMatch(/prompt|question/i));
  it("needs 2–6 options", () => {
    expect(validateQuizDefinition([{ ...good, options: [good.options[0]] }])).toMatch(/2/);
    const seven = Array.from({ length: 7 }, (_, i) => ({ text: `o${i}`, correct: i === 0 }));
    expect(validateQuizDefinition([{ ...good, options: seven }])).toMatch(/6/);
  });
  it("single needs exactly one correct", () => {
    expect(validateQuizDefinition([{ ...good, options: [{ text: "a", correct: true }, { text: "b", correct: true }] }])).toMatch(/exactly one/i);
    expect(validateQuizDefinition([{ ...good, options: [{ text: "a", correct: false }, { text: "b", correct: false }] }])).toMatch(/correct/i);
  });
  it("multi needs at least one correct", () =>
    expect(validateQuizDefinition([{ ...good, kind: "multi", options: [{ text: "a", correct: false }, { text: "b", correct: false }] }])).toMatch(/correct/i));
  it("rejects blank option text", () =>
    expect(validateQuizDefinition([{ ...good, options: [{ text: "", correct: true }, { text: "b", correct: false }] }])).toMatch(/option/i));
});
