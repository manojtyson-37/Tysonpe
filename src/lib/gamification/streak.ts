import { addDays } from "./time";

const sortedUnique = (days: Iterable<string>) => [...new Set(days)].sort();

/** Run of consecutive IST days ending at the latest active day; live only if that day is today or yesterday. */
export function currentStreak(dayKeys: Iterable<string>, todayKey: string): number {
  const days = sortedUnique(dayKeys);
  if (days.length === 0) return 0;
  const last = days[days.length - 1];
  if (last !== todayKey && last !== addDays(todayKey, -1)) return 0;
  let run = 1;
  for (let i = days.length - 1; i > 0; i--) {
    if (days[i - 1] === addDays(days[i], -1)) run++;
    else break;
  }
  return run;
}

export function longestStreak(dayKeys: Iterable<string>): number {
  const days = sortedUnique(dayKeys);
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i - 1] === addDays(days[i], -1) ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}
