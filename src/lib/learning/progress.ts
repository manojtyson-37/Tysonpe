export function computeProgress(
  items: ReadonlyArray<{ id: string; required: boolean }>,
  completedIds: ReadonlySet<string>,
) {
  const required = items.filter((i) => i.required);
  const done = required.filter((i) => completedIds.has(i.id)).length;
  const total = required.length;
  return {
    done,
    total,
    pct: total === 0 ? 0 : Math.round((done / total) * 100),
    // A course with no required lessons is never "complete": it must not mint certificates.
    complete: total > 0 && done === total,
  };
}
