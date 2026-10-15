/** IST is UTC+05:30 with no DST, so "days" and "weeks" are fixed offsets from UTC. */
const IST_OFFSET_MS = 5.5 * 3_600_000;
const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" of the IST calendar day containing `d`. */
export function istDayKey(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The UTC instant of 00:00 IST on that calendar day. */
export function istDayStart(key: string): Date {
  return new Date(Date.parse(`${key}T00:00:00Z`) - IST_OFFSET_MS);
}

export function addDays(key: string, n: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Monday 00:00 IST of the week containing `now`. */
export function istWeekStart(now: Date): Date {
  const key = istDayKey(now);
  const dow = (new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return istDayStart(addDays(key, -dow));
}
