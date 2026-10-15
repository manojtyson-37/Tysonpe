export type RankRow = { userId: string; name: string; points: number };

/** Competition ranking: ties share a rank and the next rank skips (1, 2, 2, 4). */
export function rankRows(rows: RankRow[]): Array<RankRow & { rank: number }> {
  const sorted = [...rows].sort(
    (a, b) => b.points - a.points || a.name.localeCompare(b.name) || a.userId.localeCompare(b.userId),
  );
  let rank = 0;
  return sorted.map((r, i) => {
    if (i === 0 || sorted[i - 1].points !== r.points) rank = i + 1;
    return { ...r, rank };
  });
}

/** "Meera Learner" -> "Meera L." The leaderboard never shows a full surname or an email. */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Member";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
