export type BadgeKey = "first_lesson" | "course_complete" | "first_post" | "streak_7" | "popular_post";

export const BADGES: ReadonlyArray<{ key: BadgeKey; label: string; description: string }> = [
  { key: "first_lesson", label: "First lesson", description: "Completed your first lesson." },
  { key: "course_complete", label: "Course complete", description: "Finished every required lesson of a course." },
  { key: "first_post", label: "First post", description: "Started a conversation in the community." },
  { key: "streak_7", label: "7-day streak", description: "Learned on 7 days in a row." },
  { key: "popular_post", label: "Popular post", description: "One of your posts got 10 likes." },
];

export type BadgeStats = {
  lessonsCompleted: number;
  coursesCompleted: number;
  postsCreated: number;
  longestStreak: number;
  maxLikesOnOnePost: number;
};

export function badgesToAward(stats: BadgeStats, earned: ReadonlySet<string>): BadgeKey[] {
  const met: Record<BadgeKey, boolean> = {
    first_lesson: stats.lessonsCompleted >= 1,
    course_complete: stats.coursesCompleted >= 1,
    first_post: stats.postsCreated >= 1,
    streak_7: stats.longestStreak >= 7,
    popular_post: stats.maxLikesOnOnePost >= 10,
  };
  return BADGES.map((b) => b.key).filter((k) => met[k] && !earned.has(k));
}
