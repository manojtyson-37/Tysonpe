export type GradableQuestion = {
  id: string;
  kind: "single" | "multi";
  options: ReadonlyArray<{ id: string; correct: boolean }>;
};

export type GradeResult = {
  scorePct: number;
  passed: boolean;
  results: Array<{ questionId: string; correct: boolean }>;
};

/**
 * Grade one attempt. Answers map question id -> selected option ids.
 * Unknown option ids are dropped; a question is right only when the selected set equals the correct set exactly.
 */
export function gradeQuiz(
  questions: ReadonlyArray<GradableQuestion>,
  answers: Record<string, string[]>,
  passPct: number,
): GradeResult {
  const results = questions.map((q) => {
    const valid = new Set(q.options.map((o) => o.id));
    const picked = new Set((answers[q.id] ?? []).filter((id) => valid.has(id)));
    const correctIds = q.options.filter((o) => o.correct).map((o) => o.id);
    const right =
      correctIds.length > 0 &&
      picked.size === correctIds.length &&
      correctIds.every((id) => picked.has(id)) &&
      (q.kind === "multi" || picked.size === 1);
    return { questionId: q.id, correct: right };
  });
  const correctCount = results.filter((r) => r.correct).length;
  // Integer floor, never rounded up: a learner can't "pass" a 70% mark with a true 69.5% and the
  // displayed score never exceeds the real one. A pass also needs at least one correct answer.
  const scorePct = questions.length === 0 ? 0 : Math.floor((correctCount * 100) / questions.length);
  return { scorePct, passed: questions.length > 0 && correctCount > 0 && scorePct >= passPct, results };
}

/** Attempts remaining, or null when unlimited. */
export function attemptsLeft(maxAttempts: number | null, used: number): number | null {
  return maxAttempts === null ? null : Math.max(0, maxAttempts - used);
}

/** Deterministic Fisher–Yates (FNV-1a seed -> mulberry32) so a learner sees a stable order per attempt. */
export function seededShuffle<T>(items: ReadonlyArray<T>, seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export type QuizDraft = {
  prompt: string;
  kind: "single" | "multi";
  options: ReadonlyArray<{ text: string; correct: boolean }>;
};

/** Creator-side validation. Returns an error message, or null when the quiz is publishable. */
export function validateQuizDefinition(questions: ReadonlyArray<QuizDraft>): string | null {
  if (questions.length === 0) return "Add at least one question.";
  for (const [i, q] of questions.entries()) {
    const n = i + 1;
    if (!q.prompt.trim()) return `Question ${n} needs a prompt.`;
    if (q.options.length < 2) return `Question ${n} needs at least 2 options.`;
    if (q.options.length > 6) return `Question ${n} can have at most 6 options.`;
    if (q.options.some((o) => !o.text.trim())) return `Question ${n} has an empty option.`;
    const correct = q.options.filter((o) => o.correct).length;
    if (correct === 0) return `Question ${n} needs a correct answer.`;
    if (q.kind === "single" && correct !== 1) return `Question ${n} is single-choice: mark exactly one correct option.`;
  }
  return null;
}
